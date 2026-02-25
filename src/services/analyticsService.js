import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Safely log a Firebase Analytics event.
 * If analytics is not initialized (e.g. missing measurementId or unsupported
 * environment) the call is silently ignored so the rest of the app keeps working.
 *
 * @param {string} eventName - Firebase Analytics event name
 * @param {object} [params]  - Optional event parameters
 */
function log(eventName, params) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch {
    // Do not let analytics errors affect the user experience
  }
}

// ─── Authentication events ────────────────────────────────────────────────────

/** Called after a successful login. */
export function logLogin(method) {
  log('login', { method });
}

/** Called after a successful account creation. */
export function logSignUp(method) {
  log('sign_up', { method });
}

// ─── Quiz events ──────────────────────────────────────────────────────────────

/**
 * Called when the user starts a quiz session.
 * @param {string} categoryId   - Category identifier
 * @param {string} categoryName - Human-readable category name
 * @param {string|null} difficulty - Selected difficulty filter, or null for all
 */
export function logQuizStarted(categoryId, categoryName, difficulty) {
  log('quiz_started', {
    category_id: categoryId,
    category_name: categoryName,
    difficulty: difficulty || 'kaikki',
  });
}

/**
 * Called when the user submits an answer.
 * @param {string} categoryName - Human-readable category name
 * @param {string} difficulty   - Question difficulty level
 * @param {boolean} isCorrect   - Whether the answer was correct
 */
export function logAnswerSubmitted(categoryName, difficulty, isCorrect) {
  log('answer_submitted', {
    category_name: categoryName,
    difficulty,
    is_correct: isCorrect,
  });
}

/**
 * Called when the user completes a quiz.
 * @param {string} categoryName    - Human-readable category name
 * @param {string|null} difficulty - Difficulty filter used
 * @param {number} score           - Total points earned in this session
 * @param {number} correctAnswers  - Number of correct answers
 * @param {number} totalQuestions  - Total number of questions
 * @param {number} timeSeconds     - Time taken in seconds
 */
export function logQuizCompleted(categoryName, difficulty, score, correctAnswers, totalQuestions, timeSeconds) {
  log('quiz_completed', {
    category_name: categoryName,
    difficulty: difficulty || 'kaikki',
    score,
    correct_answers: correctAnswers,
    total_questions: totalQuestions,
    accuracy: Math.round((correctAnswers / totalQuestions) * 100),
    time_seconds: timeSeconds,
  });
}
