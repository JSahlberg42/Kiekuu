const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { VertexAI } = require('@google-cloud/vertexai');

admin.initializeApp();

const vertexRegion = process.env.VERTEX_AI_LOCATION || 'us-central1';
const vertexModel = process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash';

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
    const snap = await admin.firestore().collection('config').doc('aiSettings').get();
    return snap.data()?.aiFeedbackEnabled !== false;
  } catch (error) {
    console.warn('Failed to read AI kill switch, assuming enabled:', error);
    return true;
  }
};

const countRecentFeedbackByUid = async (uid, since) => {
  const snapshot = await admin.firestore()
    .collection('feedback')
    .where('user.uid', '==', uid)
    .where('createdAt', '>', since)
    .count()
    .get();
  return snapshot.data().count || 0;
};

const countRecentFeedbackDocs = async (since) => {
  const snapshot = await admin.firestore()
    .collection('feedback')
    .where('createdAt', '>', since)
    .count()
    .get();
  return snapshot.data().count || 0;
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
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    if (userSnap.exists()) {
      displayName = userSnap.data().displayName || null;
      email = userSnap.data().email || null;
    }
  } catch (error) {
    console.warn(`Could not load user profile for ${uid}:`, error);
  }

  await admin.firestore().collection('feedback').add({
    rating,
    message,
    publishApproved,
    publishNameApproved,
    user: { uid, displayName, email },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    aiStatus: 'pending',
  });

  return { ok: true };
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
      analysisAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  if (!(await isAiFeedbackEnabled())) {
    await snap.ref.update({
      aiStatus: 'disabled',
      analysisAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const recentCount = await countRecentFeedbackDocs(new Date(Date.now() - HOUR_MS));
  if (recentCount > MAX_CLASSIFICATIONS_PER_HOUR) {
    await snap.ref.update({
      aiStatus: 'skipped_rate_limit',
      analysisAt: admin.firestore.FieldValue.serverTimestamp(),
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
      analysisAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Feedback classification failed:', error);
    await snap.ref.update({
      aiStatus: 'error',
      analysisError: error.message || 'Classification failed',
      analysisAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});
