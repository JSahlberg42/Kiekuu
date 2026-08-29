const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { VertexAI } = require('@google-cloud/vertexai');

admin.initializeApp();

const db = getFirestore();

const vertexRegion = process.env.VERTEX_AI_LOCATION || 'us-central1';
const vertexModel = process.env.VERTEX_AI_MODEL || 'gemini-3.7-flash';

const FEEDBACK_SCHEMA = {
  sentiment: ['positive', 'neutral', 'negative'],
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

const isAiFeedbackEnabled = async () => {
  try {
    const snap = await db.collection('config').doc('aiSettings').get();
    return snap.data()?.aiFeedbackEnabled !== false;
  } catch (error) {
    console.warn('Failed to read AI kill switch, assuming enabled:', error);
    return true;
  }
};

const countRecentFeedbackByUid = async (uid, since) => {
  const snapshot = await db
    .collection('feedback')
    .where('user.uid', '==', uid)
    .where('createdAt', '>', since)
    .count()
    .get();
  return snapshot.data().count || 0;
};

const countRecentFeedbackDocs = async (since) => {
  const snapshot = await db
    .collection('feedback')
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

  await db.collection('feedback').add({
    rating,
    message,
    publishApproved,
    publishNameApproved,
    user: { uid, displayName, email },
    createdAt: FieldValue.serverTimestamp(),
    aiStatus: 'pending',
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

exports.classifyFeedback = onDocumentCreated('feedback/{feedbackId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (!data || data.aiStatus === 'done' || data.aiStatus === 'processing') {
    return;
  }

  const message = typeof data.message === 'string' ? data.message : '';
  if (!message || message.length > MAX_FEEDBACK_MESSAGE_LENGTH || !isValidRating(data.rating)) {
    await snap.ref.update({
      aiStatus: 'skipped_invalid_input',
      analysisAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  if (!(await isAiFeedbackEnabled())) {
    await snap.ref.update({
      aiStatus: 'disabled',
      analysisAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const recentCount = await countRecentFeedbackDocs(new Date(Date.now() - HOUR_MS));
  if (recentCount > MAX_CLASSIFICATIONS_PER_HOUR) {
    await snap.ref.update({
      aiStatus: 'skipped_rate_limit',
      analysisAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await snap.ref.update({
    aiStatus: 'processing',
  });

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

    const prompt = buildPrompt({ rating: data.rating, message });
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

    await snap.ref.update({
      aiStatus: 'done',
      analysis: analysis,
      analysisModel: vertexModel,
      analysisRaw: analysis ? null : text,
      analysisAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Feedback classification failed:', error);
    await snap.ref.update({
      aiStatus: 'error',
      analysisError: error.message || 'Classification failed',
      analysisAt: FieldValue.serverTimestamp(),
    });
  }
});
