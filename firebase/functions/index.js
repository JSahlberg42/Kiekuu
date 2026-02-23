const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
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

    const prompt = buildPrompt({ rating: data.rating, message: data.message });
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
