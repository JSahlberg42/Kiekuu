const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { VertexAI } = require('@google-cloud/vertexai');

admin.initializeApp();

const db = getFirestore();

const vertexRegion = process.env.VERTEX_AI_LOCATION || 'global';
const vertexModel = process.env.VERTEX_AI_MODEL || 'gemini-3.7-flash';

const FEEDBACK_SCHEMA = {
  sentiment: ['positive', 'neutral', 'negative'],
  isSpam: 'boolean',
  spamReason: 'string',
  topics: 'array_of_strings',
  priority: ['low', 'medium', 'high'],
  summary: 'string',
  action: 'string',
};

// Feedback abuse guards
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_FEEDBACK_PER_HOUR = 5;
const MAX_FEEDBACK_PER_DAY = 20;
const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;
const MAX_CLASSIFICATIONS_PER_HOUR = 100;

const isValidRating = (rating) =>
  Number.isInteger(rating) && rating >= 1 && rating <= 5;

const countRecentFeedbackByUid = async (uid, since) => {
  const snapshot = await db
    .collection('feedback')
    .where('user.uid', '==', uid)
    .where('createdAt', '>', since)
    .count()
    .get();
  return snapshot.data().count || 0;
};

// Quiz scoring defaults (mirror src/services/gamificationService.js)
const DIFFICULTY_ORDER = ['perustaso', 'keskitaso', 'edistynyt', 'mestari'];
const DIFFICULTY_POINTS_DEFAULTS = { perustaso: 10, keskitaso: 20, edistynyt: 30, mestari: 50 };
const DIFFICULTY_PENALTIES_DEFAULTS = { perustaso: 2, keskitaso: 5, edistynyt: 10, mestari: 15 };
const DEFAULT_MIN_ACCURACY_FOR_RANK_UP = 60;
const MAX_ANSWER_TIME_SECONDS = 2 * 60 * 60;

const normalizeAnswerIndex = (raw) => {
  if (Number.isInteger(raw)) return raw;
  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) {
    return parseInt(raw.trim(), 10);
  }
  return null;
};

exports.submitFeedback = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to submit feedback.');
  }
  if (request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('permission-denied', 'Anonymous users cannot submit feedback.');
  }

  const rating = request.data?.rating;
  const message = typeof request.data?.message === 'string'
    ? request.data.message.trim()
    : '';
  const publishApproved = request.data?.publishApproved === true;
  const publishNameApproved = request.data?.publishNameApproved === true;

  if (!isValidRating(rating)) {
    throw new HttpsError('invalid-argument', 'Rating must be an integer between 1 and 5.');
  }
  if (!message || message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    throw new HttpsError('invalid-argument',
      `Message must be between 1 and ${MAX_FEEDBACK_MESSAGE_LENGTH} characters.`);
  }

  const uid = request.auth.uid;
  const now = Date.now();
  const [hourlyCount, dailyCount] = await Promise.all([
    countRecentFeedbackByUid(uid, new Date(now - HOUR_MS)),
    countRecentFeedbackByUid(uid, new Date(now - DAY_MS)),
  ]);
  if (hourlyCount >= MAX_FEEDBACK_PER_HOUR || dailyCount >= MAX_FEEDBACK_PER_DAY) {
    throw new HttpsError('resource-exhausted',
      'Too much feedback submitted recently. Please try again later.');
  }

  let displayName = null;
  let email = null;
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists()) {
      displayName = userSnap.data().displayName || null;
      email = userSnap.data().email || null;
    }
  } catch (error) {
    console.warn(`Could not load user profile for ${uid}:`, error);
  }

  // Classify immediately — every stored feedback is AI-classified at write
  // time. The only exception: if AI classification itself fails (error,
  // timeout, etc.), we still store the feedback but without classification.
  const classification = await classifyContent({ rating, message });
  const classifiedFields = buildClassificationFields(classification);

  await db.collection('feedback').add({
    rating,
    message,
    publishApproved,
    publishNameApproved,
    user: { uid, displayName, email },
    createdAt: FieldValue.serverTimestamp(),
    ...classifiedFields,
  });

  return { ok: true };
});

exports.submitQuizAnswer = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to answer questions.');
  }

  const questionId = typeof request.data?.questionId === 'string'
    ? request.data.questionId.trim()
    : '';
  const selectedIndex = request.data?.selectedIndex;
  const timeSpentRaw = request.data?.timeSpent;

  if (!questionId || questionId.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid question reference.');
  }
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 63) {
    throw new HttpsError('invalid-argument', 'Invalid answer selection.');
  }
  const timeSpent = Number.isFinite(timeSpentRaw)
    ? Math.min(Math.max(Math.floor(timeSpentRaw), 0), MAX_ANSWER_TIME_SECONDS)
    : 0;

  // Correctness and difficulty are derived server-side from the question
  // document - the client cannot claim its own points.
  const qSnap = await db.collection('questions').doc(questionId).get();
  if (!qSnap.exists || qSnap.data().published === false) {
    throw new HttpsError('failed-precondition', 'Question is not available.');
  }
  const question = qSnap.data();
  const correctIndex = normalizeAnswerIndex(question.correctAnswerIndex ?? question.correctIndex);
  const isCorrect = correctIndex !== null && selectedIndex === correctIndex;
  const difficulty = DIFFICULTY_ORDER.includes(question.difficulty)
    ? question.difficulty
    : 'perustaso';

  let config = {};
  try {
    const configSnap = await db.collection('config').doc('platform').get();
    if (configSnap.exists()) config = configSnap.data() || {};
  } catch (error) {
    console.warn('Could not load platform config, using defaults:', error);
  }
  const pointsMap = config.pointsPerDifficulty || DIFFICULTY_POINTS_DEFAULTS;
  const penaltyMap = config.penaltyPerDifficulty || DIFFICULTY_PENALTIES_DEFAULTS;
  const points = isCorrect
    ? (pointsMap[difficulty] ?? DIFFICULTY_POINTS_DEFAULTS[difficulty])
    : -(penaltyMap[difficulty] ?? DIFFICULTY_PENALTIES_DEFAULTS[difficulty]);

  const uid = request.auth.uid;
  const categoryId = question.categoryId ? String(question.categoryId) : null;
  let categoryName = null;
  if (categoryId) {
    try {
      const catSnap = await db.collection('categories').doc(categoryId).get();
      categoryName = catSnap.exists() ? catSnap.data().name || null : null;
    } catch (error) {
      console.warn(`Could not load category ${categoryId}:`, error);
    }
  }

  const answerRef = await db.collection('users').doc(uid).collection('answers').add({
    questionId,
    selectedIndex,
    isCorrect,
    difficulty,
    timeSpent,
    points,
    submittedAt: new Date().toISOString(),
    categoryId,
    categoryName,
  });

  const answeredDelta = 1;
  const correctDelta = isCorrect ? 1 : 0;
  const userUpdate = {
    'progress.totalScore': FieldValue.increment(points),
    'progress.questionsAnswered': FieldValue.increment(answeredDelta),
    'progress.correctAnswers': FieldValue.increment(correctDelta),
    lastActivity: new Date().toISOString(),
  };
  if (categoryId) {
    userUpdate[`progressByCategory.${categoryId}.categoryId`] = categoryId;
    userUpdate[`progressByCategory.${categoryId}.name`] = categoryName || categoryId;
    userUpdate[`progressByCategory.${categoryId}.answered`] = FieldValue.increment(answeredDelta);
    userUpdate[`progressByCategory.${categoryId}.correct`] = FieldValue.increment(correctDelta);
  }
  await db.collection('users').doc(uid).set(userUpdate, { merge: true });

  let rankChanged = null;
  try {
    const [userDoc, ranksSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('ranks').get(),
    ]);
    if (userDoc.exists && !ranksSnap.empty) {
      const userData = userDoc.data();
      const progress = userData.progress || {};
      const score = progress.totalScore || 0;
      const answered = progress.questionsAnswered || 0;
      const correct = progress.correctAnswers || 0;
      const accuracy = answered > 0 ? (correct / answered) * 100 : 0;
      const globalMinAccuracy = config.minAccuracyForRankUp ?? DEFAULT_MIN_ACCURACY_FOR_RANK_UP;
      const ranks = ranksSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.requiredScore || 0) - (b.requiredScore || 0));
      let earned = ranks[0];
      for (const rank of ranks) {
        const rankMinAccuracy = rank.minAccuracy ?? globalMinAccuracy;
        if (score >= (rank.requiredScore || 0) && accuracy >= rankMinAccuracy) {
          earned = rank;
        }
      }
      if (earned && (userData.rankId !== earned.id || userData.rank !== earned.name)) {
        await db.collection('users').doc(uid).update({
          rank: earned.name,
          rankId: earned.id,
          rankUpdatedAt: new Date().toISOString(),
        });
        rankChanged = { id: earned.id, name: earned.name };
      }
    }
  } catch (error) {
    console.warn('Rank evaluation failed:', error);
  }

  return { ok: true, answerId: answerRef.id, isCorrect, points, rankChanged };
});

const buildSchemaPrompt = () => {
  return [
    'Schema: {',
    '  "isSpam": boolean,',
    '  "spamReason": "short_reason_if_spam",',
    '  "sentiment": "positive" | "neutral" | "negative",',
    '  "topics": ["short_topic"],',
    '  "priority": "low" | "medium" | "high",',
    '  "summary": "short_summary",',
    '  "action": "short_action_suggestion"',
    '}',
  ].join('\n');
};

const validateAnalysis = (analysis) => {
  if (!analysis || typeof analysis !== 'object') return false;

  if (typeof analysis.isSpam !== 'boolean') return false;
  if (typeof analysis.spamReason !== 'string') return false;
  if (!FEEDBACK_SCHEMA.sentiment.includes(analysis.sentiment)) return false;
  if (!Array.isArray(analysis.topics)) return false;
  if (!FEEDBACK_SCHEMA.priority.includes(analysis.priority)) return false;
  if (typeof analysis.summary !== 'string') return false;
  if (typeof analysis.action !== 'string') return false;

  return true;
};

const buildPrompt = ({ rating, message }) => {
  return [
    'Classify the feedback into JSON only.',
    'Detect potential spam: advertising, irrelevant/gibberish text, mass-mailed content, suspicious links, or abuse. If it is spam, set "isSpam": true (and give a short "spamReason"); otherwise set "isSpam": false and provide a sentiment.',
    buildSchemaPrompt(),
    `Rating: ${rating ?? 'unknown'}`,
    `Feedback: """${message || ''}"""`,
  ].join('\n');
};

const extractJson = (text) => {
  if (!text) return null;
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1];
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
};

/**
 * Runs AI classification on feedback content WITHOUT touching the database.
 * Used inline in submitFeedback (so every stored feedback is classified at
 * write time) and by the admin reclassify action.
 * Returns { analysis, rawText, model } on success (analysis may be null if the
 * AI response didn't validate), or { error } if classification failed.
 */
const classifyContent = async ({ rating, message }) => {
  if (!message || message.length > MAX_FEEDBACK_MESSAGE_LENGTH || !isValidRating(rating)) {
    return { error: 'invalid_input' };
  }

  try {
    const projectId = process.env.GCLOUD_PROJECT ||
                      process.env.GCP_PROJECT ||
                      admin.app().options.projectId;

    const vertexAI = new VertexAI({
      project: projectId,
      location: vertexRegion,
    });
    const generativeModel = vertexAI.getGenerativeModel({
      model: vertexModel,
    });

    const prompt = buildPrompt({ rating, message });
    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 256,
      },
    });

    const text = result.response?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';
    const jsonString = extractJson(text);
    let analysis = null;

    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (validateAnalysis(parsed)) {
          analysis = parsed;
        } else {
          console.warn('AI response validation failed:', parsed);
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }

    return { analysis, rawText: text, model: vertexModel };
  } catch (error) {
    console.error('Feedback classification failed:', error);
    return { error: error.message || 'Classification failed' };
  }
};

/**
 * Builds the persistence fields for a feedback doc from a classification
 * result. A clean result with analysis -> done + spam fields. A clean result
 * without analysis -> done but no classification. An error -> stored without
 * classification (only exception the user allows).
 */
const buildClassificationFields = (classification) => {
  if (classification.error) {
    return {
      aiStatus: 'error',
      analysis: null,
      analysisError: classification.error,
      analysisAt: FieldValue.serverTimestamp(),
    };
  }
  if (!classification.analysis) {
    return {
      aiStatus: 'done',
      analysis: null,
      analysisModel: classification.model,
      analysisRaw: classification.rawText || null,
      analysisAt: FieldValue.serverTimestamp(),
    };
  }
  const analysis = classification.analysis;
  return {
    aiStatus: 'done',
    analysis,
    analysisModel: classification.model,
    analysisRaw: null,
    analysisAt: FieldValue.serverTimestamp(),
    isSpam: analysis.isSpam === true,
    spamReason: analysis.isSpam ? analysis.spamReason || '' : '',
    status: analysis.isSpam ? 'spam' : 'unread',
  };
};

/** Returns the Firestore user doc for an authenticated user, or null. */
const getAuthUserDoc = async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  const snap = await db.collection('users').doc(request.auth.uid).get();
  return snap.exists ? snap : null;
};

const requireAdmin = async (request) => {
  const userSnap = await getAuthUserDoc(request);
  if (!userSnap) {
    throw new HttpsError('permission-denied', 'User profile not found.');
  }
  if (userSnap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin privileges are required.');
  }
  return userSnap;
};

const FEEDBACK_STATUSES = ['unread', 'read', 'ok', 'spam'];

/**
 * Admin callable: performs feedback actions.
 * Supported actions:
 *  - setStatus:  { feedbackId, status: 'read'|'ok'|'unread'|'spam' }
 *  - delete:     { feedbackId }
 *  - reclassify: { feedbackId } (re-runs AI classification by resetting aiStatus)
 */
exports.manageFeedback = onCall({ enforceAppCheck: true }, async (request) => {
  await requireAdmin(request);

  const action = request.data?.action;
  const feedbackId = typeof request.data?.feedbackId === 'string'
    ? request.data.feedbackId.trim()
    : '';

  console.log(`[manageFeedback] action=${action ?? 'none'} feedbackId=${feedbackId || 'none'} admin=${request.auth?.uid ?? 'unknown'}`);

  if (!feedbackId) {
    throw new HttpsError('invalid-argument', 'feedbackId is required.');
  }
  if (!action) {
    throw new HttpsError('invalid-argument', 'action is required.');
  }

  const ref = db.collection('feedback').doc(feedbackId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Feedback not found.');
  }

  switch (action) {
    case 'setStatus': {
      const status = request.data?.status;
      if (!FEEDBACK_STATUSES.includes(status)) {
        throw new HttpsError('invalid-argument', 'Invalid status.');
      }
      await ref.update({
        status,
        // Clearing spam flag if re-marked as read/ok/unread
        ...(status !== 'spam' && { isSpam: false, spamReason: '' }),
      });
      return { ok: true, status };
    }
    case 'markSpam': {
      const spamReason = typeof request.data?.spamReason === 'string'
        ? request.data.spamReason.slice(0, 200)
        : 'marked by admin';
      await ref.update({
        status: 'spam',
        isSpam: true,
        spamReason,
      });
      return { ok: true, status: 'spam' };
    }
    case 'delete': {
      await ref.delete();
      return { ok: true, deleted: true };
    }
    case 'reclassify': {
      const data = snap.data();
      const message = typeof data.message === 'string' ? data.message : '';
      const classification = await classifyContent({
        rating: data.rating,
        message,
      });
      const fields = buildClassificationFields(classification);
      await ref.update(fields);
      return { ok: true, aiStatus: fields.aiStatus, analysis: fields.analysis || null };
    }
    default:
      throw new HttpsError('invalid-argument', 'Unknown action.');
  }
});
