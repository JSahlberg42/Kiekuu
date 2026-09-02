import { logEvent, setUserProperties } from 'firebase/analytics';
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

// ─── Team events ───────────────────────────────────────────────────────────────

/** Called when the user successfully creates a team. */
export function logTeamCreated(teamId: string, teamName: string): void {
  log('team_created', { team_id: teamId, team_name: teamName });
}

/** Called when the user successfully joins a team. */
export function logTeamJoined(teamId: string, teamName: string): void {
  log('team_joined', { team_id: teamId, team_name: teamName });
}

/** Called when the user successfully leaves a team. */
export function logTeamLeft(teamId: string, teamName: string, wasCreator: boolean): void {
  log('team_left', { team_id: teamId, team_name: teamName, was_creator: wasCreator });
}

// ─── Leaderboard events ────────────────────────────────────────────────────────

/** Called when the user views the leaderboard. */
export function logLeaderboardViewed(viewType: 'top_10' | 'user_position'): void {
  log('leaderboard_viewed', { view_type: viewType });
}

// ─── Engagement events ────────────────────────────────────────────────────────

/** Called once per session when auth state is resolved. */
export function logSessionStart(
  userId: string,
  isAnonymous: boolean,
  accountType: 'anonymous' | 'authenticated',
): void {
  log('session_start', {
    user_id: userId,
    is_anonymous: isAnonymous,
    account_type: accountType,
  });
}

// ─── Page / routing events ────────────────────────────────────────────────────

/** Called on route changes. */
export function logPageView(pageName: string, pagePath: string): void {
  log('page_view', { page_name: pageName, page_path: pagePath });
}

// ─── User properties ──────────────────────────────────────────────────────────

/** Set user-scoped properties on the analytics instance. Call once per session
 *  after the user is identified (after sign-in / on app load). */
export function setAnalyticsUserProperties(
  userId: string,
  accountType: 'anonymous' | 'authenticated',
  rank?: string,
): void {
  if (!analytics) return;
  try {
    const props: Record<string, string> = {
      account_type: accountType,
    };
    if (rank) props.current_rank = rank;
    setUserProperties(analytics, props);
    // Also set user_id as a user property
    setUserProperties(analytics, { user_id: userId });
  } catch {
    // Silently ignore analytics errors
  }
}
