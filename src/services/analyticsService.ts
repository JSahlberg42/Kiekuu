import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Safely log a Firebase Analytics event.
 * If analytics is not initialized (e.g. missing measurementId or unsupported
 * environment) the call is silently ignored so the rest of the app keeps working.
 */
function log(eventName: string, params?: Record<string, unknown>): void {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch {
    // Do not let analytics errors affect the user experience
  }
}

// ─── Authentication events ────────────────────────────────────────────────────

/** Called after a successful login. */
export function logLogin(method: string): void {
  log('login', { method });
}

/** Called after a successful account creation. */
export function logSignUp(method: string): void {
  log('sign_up', { method });
}

// ─── Quiz events ──────────────────────────────────────────────────────────────

/** Called when the user starts a quiz session. */
export function logQuizStarted(categoryId: string, categoryName: string, difficulty: string | null): void {
  log('quiz_started', {
    category_id: categoryId,
    category_name: categoryName,
    difficulty: difficulty || 'kaikki',
  });
}

/** Called when the user submits an answer. */
export function logAnswerSubmitted(categoryName: string, difficulty: string, isCorrect: boolean): void {
  log('answer_submitted', {
    category_name: categoryName,
    difficulty,
    is_correct: isCorrect,
  });
}

/** Called when the user completes a quiz. */
export function logQuizCompleted(
  categoryName: string,
  difficulty: string | null,
  score: number,
  correctAnswers: number,
  totalQuestions: number,
  timeSeconds: number,
): void {
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
