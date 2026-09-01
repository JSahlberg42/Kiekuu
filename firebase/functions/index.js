const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { GoogleGenAI } = require('@google/genai');

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
    if (userSnap.exists) {
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
    if (configSnap.exists) config = configSnap.data() || {};
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
      categoryName = catSnap.exists ? catSnap.data().name || null : null;
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
  let currentRank = null;
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
      currentRank = earned ? earned.name : (userData.rank || null);
    }
  } catch (error) {
    console.warn('Rank evaluation failed:', error);
  }

  // Sync anonymous leaderboard entry (Layer 1 scoreboard).
  // Best-effort: failures must not break the quiz submission flow.
  try {
    if (currentRank) {
      await syncLeaderboardEntry(uid, currentRank);
    }
  } catch (error) {
    console.warn('Leaderboard sync failed:', uid, error.message || error);
  }

  // Sync team totalScore: bump the user's team totalScore by the delta
  // from this submission. Best-effort — failures must not affect the
  // quiz submission flow.
  try {
    if (currentRank !== false) {
      await syncTeamScore(uid, points);
    }
  } catch (error) {
    console.warn('Team score sync failed:', uid, error.message || error);
  }

  return { ok: true, answerId: answerRef.id, isCorrect, points, rankChanged };
});

/**
 * Recomputes the position of one user in the leaderboard and writes their
 * anonymous entry. Position is calculated by counting how many other
 * users have a strictly higher totalScore, plus one.
 *
 * Cost: 1 count() query + 1 set() write per quiz submission.
 * Runs only when the user's rank is known (post-evaluation).
 */
const syncLeaderboardEntry = async (uid, rank) => {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return;
  const totalScore = userDoc.data().progress?.totalScore || 0;

  const higherSnap = await db
    .collection('users')
    .where('progress.totalScore', '>', totalScore)
    .count()
    .get();
  const position = (higherSnap.data().count || 0) + 1;

  await db.collection('leaderboard').doc(uid).set({
    uid,
    totalScore,
    rank,
    position,
    lastUpdated: new Date().toISOString(),
  });
};

/**
 * Bump the user's team totalScore by `points`. Best-effort: the team's
 * totalScore is a running aggregate of every member's personal score, so
 * we just add the delta on each submission. If the user is not on a
 * team this is a no-op.
 *
 * Cost: 1 get() + 1 update() per quiz submission (only when the user
 * has a team).
 */
const syncTeamScore = async (uid, points) => {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return;
  const teamId = userDoc.data().teamId;
  if (!teamId) return;

  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) return;

  const delta = Math.max(-1000, Math.min(1000, Number(points) || 0));
  await teamRef.update({ totalScore: FieldValue.increment(delta) });
};

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

const normalizeAnalysis = (raw) => {

  const isSpam = raw.isSpam === true || raw.isSpam === 'true' || raw.isSpam === 1;
  const rawReason = raw.spamReason || raw.spam_reason || '';

  let sentiment = typeof raw.sentiment === 'string'
    ? raw.sentiment.toLowerCase().trim()
    : 'neutral';
  if (!FEEDBACK_SCHEMA.sentiment.includes(sentiment)) {
    sentiment = 'neutral';
  }

  let priority = typeof raw.priority === 'string'
    ? raw.priority.toLowerCase().trim()
    : 'low';
  if (!FEEDBACK_SCHEMA.priority.includes(priority)) {
    priority = 'low';
  }

  let topics = [];
  if (Array.isArray(raw.topics)) {
    topics = raw.topics
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean);
  } else if (typeof raw.topics === 'string' && raw.topics.trim()) {
    topics = [raw.topics.trim()];
  }

  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
  const action = typeof raw.action === 'string' ? raw.action.trim() : '';

  return {
    isSpam,
    spamReason: typeof rawReason === 'string' ? rawReason.trim() : String(rawReason || ''),
    sentiment,
    topics,
    priority,
    summary,
    action,
  };
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

    // @google/genai SDK (Vertex AI mode). Uses Application Default Credentials
    // automatically in Cloud Functions. Replaces the deprecated @google-cloud/vertexai.
    const ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: vertexRegion,
    });

    const prompt = buildPrompt({ rating, message });
    const result = await ai.models.generateContent({
      model: vertexModel,
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 256,
        // Force structured JSON output (no markdown fences / prose).
        responseMimeType: 'application/json',
      },
    });

    const text = result.text || '';
    const jsonString = extractJson(text);
    let analysis = null;

    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        const normalized = normalizeAnalysis(parsed);
        if (normalized) {
          analysis = normalized;
        } else {
          console.warn('AI response normalization returned null:', parsed);
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
    // Flattened fields so clients can read them without unwrapping `analysis`.
    sentiment: analysis.sentiment,
    topics: analysis.topics || [],
    priority: analysis.priority,
    summary: analysis.summary,
    action: analysis.action,
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
      return {
        ok: true,
        aiStatus: fields.aiStatus,
        analysis: fields.analysis || null,
        sentiment: fields.sentiment || null,
        priority: fields.priority || null,
        isSpam: fields.isSpam === true,
        status: fields.status || null,
      };
    }
    default:
      throw new HttpsError('invalid-argument', 'Unknown action.');
  }
});

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

const TEAMS_COLLECTION = 'teams';
const MAX_TEAM_NAME_LENGTH = 40;
const MAX_TEAM_DESCRIPTION_LENGTH = 200;
const MAX_TEAM_MEMBERS = 50;

const sanitizeTeamName = (raw) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_TEAM_NAME_LENGTH) return null;
  // Reject control characters; keep letters/digits/spaces/dashes/periods.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(trimmed)) return null;
  return trimmed;
};

const sanitizeTeamDescription = (raw) => {
  if (raw == null || raw === '') return '';
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length > MAX_TEAM_DESCRIPTION_LENGTH) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(trimmed)) return null;
  return trimmed;
};

const bumpUserTeamStats = async (uid, delta) => {
  if (delta === 0) return;
  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;
    const current = userSnap.data().totalScore || 0;
    await userRef.update({ totalScore: current + delta });
  } catch (error) {
    console.warn(`Could not adjust user ${uid} totalScore:`, error);
  }
};

exports.createTeam = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to create a team.');
  }
  // Anonymous users cannot create teams (teams require non-anonymous identity).
  if (request.auth.token?.is_anonymous) {
    throw new HttpsError('permission-denied', 'Anonymous users cannot create teams. Create an account or sign in.');
  }
  const uid = request.auth.uid;

  const name = sanitizeTeamName(request.data?.name);
  if (!name) {
    throw new HttpsError('invalid-argument', 'Team name is required (1-40 chars).');
  }
  const description = sanitizeTeamDescription(request.data?.description);
  if (description === null) {
    throw new HttpsError('invalid-argument', `Description must be under ${MAX_TEAM_DESCRIPTION_LENGTH} characters.`);
  }

  // Prevent a user from belonging to two teams.
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data().teamId) {
    throw new HttpsError('failed-precondition', 'Leave your current team before creating a new one.');
  }
  // Require explicit team-visibility consent (displayName, photoURL, score).
  if (!userSnap.exists || !userSnap.data().consentToTeamVisibility) {
    throw new HttpsError('permission-denied', 'Consent required to create a team (display name, photo and score will be visible to team members).');
  }

  const teamRef = db.collection(TEAMS_COLLECTION).doc();
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    tx.set(teamRef, {
      name,
      description,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
      memberUids: [uid],
      memberCount: 1,
      totalScore: 0,
    });
    tx.set(userRef, {
      teamId: teamRef.id,
      joinedTeamAt: now,
    }, { merge: true });
  });

  return { teamId: teamRef.id };
});

exports.joinTeam = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to join a team.');
  }
  // Anonymous users cannot join teams (teams require non-anonymous identity).
  if (request.auth.token?.is_anonymous) {
    throw new HttpsError('permission-denied', 'Anonymous users cannot join teams. Create an account or sign in.');
  }
  const uid = request.auth.uid;

  const teamId = typeof request.data?.teamId === 'string' ? request.data.teamId.trim() : '';
  if (!teamId || teamId.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid team reference.');
  }

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data().teamId === teamId) {
    return { ok: true };
  }
  if (userSnap.exists && userSnap.data().teamId) {
    throw new HttpsError('failed-precondition', 'Leave your current team before joining another.');
  }
  // Require explicit team-visibility consent (displayName, photoURL, score).
  if (!userSnap.exists || !userSnap.data().consentToTeamVisibility) {
    throw new HttpsError('permission-denied', 'Consent required to join a team (display name, photo and score will be visible to team members).');
  }

  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const now = new Date().toISOString();
  let joined = false;
  try {
    await db.runTransaction(async (tx) => {
      const tSnap = await tx.get(teamRef);
      if (!tSnap.exists) {
        throw new HttpsError('not-found', 'Team not found.');
      }
      const data = tSnap.data();
      const memberUids = Array.isArray(data.memberUids) ? data.memberUids : [];
      if (memberUids.length >= MAX_TEAM_MEMBERS) {
        throw new HttpsError('resource-exhausted', `Team is full (${MAX_TEAM_MEMBERS} members).`);
      }
      const updatedMembers = memberUids.includes(uid) ? memberUids : [...memberUids, uid];
      tx.update(teamRef, {
        memberUids: updatedMembers,
        memberCount: updatedMembers.length,
        updatedAt: now,
      });
      tx.set(userRef, {
        teamId: teamRef.id,
        joinedTeamAt: now,
      }, { merge: true });
      joined = true;
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('joinTeam transaction failed:', error);
    throw new HttpsError('internal', 'Could not join team.');
  }

  if (joined) {
    try {
      const uSnap = await userRef.get();
      const score = uSnap.exists ? (uSnap.data().totalScore || 0) : 0;
      await teamRef.update({ totalScore: FieldValue.increment(score) });
    } catch (error) {
      console.warn(`Could not seed team ${teamRef.id} score:`, error);
    }
  }
  return { ok: true };
});

exports.leaveTeam = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to leave a team.');
  }
  const uid = request.auth.uid;

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists || !userSnap.data().teamId) {
    return { ok: true };
  }
  const teamId = userSnap.data().teamId;
  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const now = new Date().toISOString();

  let removed = false;
  try {
    await db.runTransaction(async (tx) => {
      const tSnap = await tx.get(teamRef);
      const memberUids = tSnap.exists && Array.isArray(tSnap.data().memberUids)
        ? tSnap.data().memberUids
        : [];
      const updatedMembers = memberUids.filter((id) => id !== uid);
      tx.set(userRef, {
        teamId: null,
        joinedTeamAt: null,
      }, { merge: true });
      if (!tSnap.exists) {
        return;
      }
      const data = tSnap.data();
      const userScore = (await userRef.get()).data().totalScore || 0;
      const nextTotalScore = Math.max(0, (data.totalScore || 0) - userScore);
      if (updatedMembers.length === 0) {
        // Empty team: delete it instead of leaving a 0-score ghost.
        tx.delete(teamRef);
        removed = true;
        return;
      }
      tx.update(teamRef, {
        memberUids: updatedMembers,
        memberCount: updatedMembers.length,
        totalScore: nextTotalScore,
        updatedAt: now,
      });
      removed = true;
    });
  } catch (error) {
    console.error('leaveTeam transaction failed:', error);
    throw new HttpsError('internal', 'Could not leave team.');
  }

  void bumpUserTeamStats; // silence unused warning when bump not used here
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Admin team management
// ---------------------------------------------------------------------------

/**
 * Admin-only: list all teams with member count and creator info.
 * Returns top 200 teams sorted by totalScore desc.
 */
exports.adminListAllTeams = onCall({ enforceAppCheck: true }, async (request) => {
  await requireAdmin(request);

  const limitCount = Math.min(
    Number.isInteger(request.data?.limit) ? request.data.limit : 200,
    500,
  );

  const snapshot = await db
    .collection(TEAMS_COLLECTION)
    .orderBy('totalScore', 'desc')
    .limit(limitCount)
    .get();

  const teams = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      description: data.description || '',
      createdBy: data.createdBy || '',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      totalScore: data.totalScore || 0,
      memberCount: data.memberCount || 0,
      memberUids: data.memberUids || [],
    };
  });

  return { teams };
});

/**
 * Admin-only: get all members of a specific team with their profile data.
 */
exports.adminGetTeamMembers = onCall({ enforceAppCheck: true }, async (request) => {
  await requireAdmin(request);

  const teamId = typeof request.data?.teamId === 'string'
    ? request.data.teamId.trim()
    : '';

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }

  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const teamSnap = await teamRef.get();

  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }

  const teamData = teamSnap.data();
  const memberUids = Array.isArray(teamData.memberUids) ? teamData.memberUids : [];

  // Fetch profile data for all members in parallel (batch reads).
  const memberDocs = await Promise.all(
    memberUids.map(async (uid) => {
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) return null;
      const ud = userSnap.data();
      return {
        uid,
        displayName: ud.displayName || null,
        email: ud.email || null,
        photoURL: ud.photoURL || null,
        rank: ud.rank || 'harjoittelija',
        totalScore: ud.progress?.totalScore || 0,
        teamId: ud.teamId || null,
      };
    }),
  );

  const members = memberDocs.filter(Boolean);

  return {
    team: {
      id: teamSnap.id,
      name: teamData.name || '',
      description: teamData.description || '',
      createdBy: teamData.createdBy || '',
      createdAt: teamData.createdAt || '',
      updatedAt: teamData.updatedAt || '',
      totalScore: teamData.totalScore || 0,
      memberCount: teamData.memberCount || 0,
      memberUids,
    },
    members,
  };
});

/**
 * Admin-only: kick a member out of a team.
 * This removes the user from the team's memberUids array, clears their teamId
 * field, and subtracts their score from the team total.
 */
exports.adminKickMember = onCall({ enforceAppCheck: true }, async (request) => {
  await requireAdmin(request);

  const teamId = typeof request.data?.teamId === 'string'
    ? request.data.teamId.trim()
    : '';
  const uid = typeof request.data?.uid === 'string'
    ? request.data.uid.trim()
    : '';

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }

  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const tSnap = await tx.get(teamRef);
    if (!tSnap.exists) {
      throw new HttpsError('not-found', 'Team not found.');
    }
    const tData = tSnap.data();
    const memberUids = Array.isArray(tData.memberUids) ? tData.memberUids : [];

    if (!memberUids.includes(uid)) {
      throw new HttpsError('failed-precondition', 'User is not a member of this team.');
    }

    const uSnap = await tx.get(userRef);
    const userScore = uSnap.exists ? (uSnap.data().progress?.totalScore || 0) : 0;
    const updatedMembers = memberUids.filter((id) => id !== uid);

    if (updatedMembers.length === 0) {
      // Empty team — delete it.
      tx.delete(teamRef);
    } else {
      tx.update(teamRef, {
        memberUids: updatedMembers,
        memberCount: updatedMembers.length,
        totalScore: FieldValue.increment(-userScore),
        updatedAt: new Date().toISOString(),
      });
    }

    tx.update(userRef, {
      teamId: null,
      joinedTeamAt: null,
    });
  });

  return { ok: true };
});

/**
 * Admin-only: update team name and/or description.
 */
exports.adminUpdateTeam = onCall({ enforceAppCheck: true }, async (request) => {
  await requireAdmin(request);

  const teamId = typeof request.data?.teamId === 'string'
    ? request.data.teamId.trim()
    : '';

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }

  const updates = {
    updatedAt: new Date().toISOString(),
  };

  const name = request.data?.name;
  if (name !== undefined) {
    const sanitized = sanitizeTeamName(name);
    if (!sanitized) {
      throw new HttpsError('invalid-argument', 'Invalid team name (1-40 chars required).');
    }
    updates.name = sanitized;
  }

  const description = request.data?.description;
  if (description !== undefined) {
    const sanitized = sanitizeTeamDescription(description);
    if (sanitized === null) {
      throw new HttpsError('invalid-argument', `Description must be under ${MAX_TEAM_DESCRIPTION_LENGTH} characters.`);
    }
    updates.description = sanitized;
  }

  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }

  await teamRef.update(updates);
  return { ok: true };
});

/**
 * Admin-only: delete a team and clear its members' teamId field.
 */
exports.adminDeleteTeam = onCall({ enforceAppCheck: true }, async (request) => {
  await requireAdmin(request);

  const teamId = typeof request.data?.teamId === 'string'
    ? request.data.teamId.trim()
    : '';

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }

  const teamRef = db.collection(TEAMS_COLLECTION).doc(teamId);
  const teamSnap = await teamRef.get();

  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }

  const tData = teamSnap.data();
  const memberUids = Array.isArray(tData.memberUids) ? tData.memberUids : [];

  // Clear teamId from all members in a batch.
  const memberUpdates = memberUids.map((uid) =>
    db.collection('users').doc(uid).update({
      teamId: null,
      joinedTeamAt: null,
    }),
  );

  await Promise.all([
    ...memberUpdates,
    teamRef.delete(),
  ]);

  return { ok: true };
});
