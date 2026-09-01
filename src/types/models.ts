/**
 * Domain model types shared across services, context and UI.
 *
 * These describe the Firestore document shapes as written by this app and
 * its Cloud Functions. Fields are optional where legacy documents may lack
 * them; consumers must handle undefined defensively.
 */

/** Ordered difficulty levels from easiest to hardest */
export type QuestionDifficulty = 'perustaso' | 'keskitaso' | 'edistynyt' | 'mestari';

export interface QuestionSource {
  title?: string;
  page?: string;
  url?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  requiredRankId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rank {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  requiredScore: number;
  minAccuracy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  /** Legacy documents use correctIndex or a stringified index */
  correctAnswerIndex?: number | string | null;
  correctIndex?: number | string | null;
  difficulty?: QuestionDifficulty;
  categoryId?: string;
  explanation?: string;
  published?: boolean;
  source?: QuestionSource;
  /** Admin authorship metadata written on create */
  createdBy?: {
    uid?: string | null;
    displayName?: string | null;
    email?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type QuestionInput = Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;

export interface UserProgress {
  currentLevel?: string;
  totalScore: number;
  questionsAnswered: number;
  correctAnswers?: number;
}

export interface CategoryProgress {
  categoryId?: string;
  name?: string;
  answered: number;
  correct: number;
}

export type UserRole = 'user' | 'admin';

export interface UserDoc {
  /** Document id; present on docs fetched through services, absent at creation time */
  readonly id?: string;
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: UserRole;
  rank?: string;
  rankId?: string | null;
  isAnonymous?: boolean;
  linkedAt?: string;
  rankUpdatedAt?: string;
  lastActivity?: string;
  createdAt?: string;
  updatedAt?: string;
  progress: UserProgress;
  progressByCategory?: Record<string, CategoryProgress>;
  /** ID of the team this user belongs to (if any). */
  teamId?: string | null;
}

export interface AnswerDoc {
  id: string;
  questionId: string;
  selectedIndex?: number;
  isCorrect: boolean;
  points: number;
  categoryId?: string;
  categoryName?: string;
  submittedAt?: string;
}

export interface PlatformConfig {
  pointsPerDifficulty?: Partial<Record<QuestionDifficulty, number>>;
  penaltyPerDifficulty?: Partial<Record<QuestionDifficulty, number>>;
  minAccuracyForRankUp?: number;
  aiFeedbackEnabled?: boolean;
}

export interface SubmitFeedbackRequest {
  /** Integer 1–5; validated server-side */
  rating: number;
  message: string;
  publishApproved: boolean;
  publishNameApproved: boolean;
}

export interface SubmitFeedbackResponse {
  ok: boolean;
}

export type FeedbackStatus = 'unread' | 'read' | 'ok' | 'spam';

export type ManageFeedbackAction =
  | 'setStatus'
  | 'markSpam'
  | 'delete'
  | 'reclassify';

export interface ManageFeedbackRequest {
  action: ManageFeedbackAction;
  feedbackId: string;
  status?: FeedbackStatus;
  spamReason?: string;
}

export interface ManageFeedbackResponse {
  ok: boolean;
  status?: FeedbackStatus;
  deleted?: boolean;
  analysis?: Record<string, unknown> | null;
  /** Flattened classification fields returned by reclassify. */
  sentiment?: string | null;
  priority?: string | null;
  isSpam?: boolean;
  aiStatus?: string | null;
}

export interface RankChange {
  id: string;
  name: string;
}

export interface SubmitQuizAnswerResponse {
  ok: boolean;
  answerId: string;
  isCorrect: boolean;
  points: number;
  rankChanged: RankChange | null;
}

export interface SubmittedAnswer {
  id: string | null;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  points: number;
  rankChanged: RankChange | null;
}

export interface QuizCard {
  id: string;
  name: string;
  questions: Question[];
  totalQuestions: number;
  difficulties: QuestionDifficulty[];
  requiredRankId: string | null;
  requiredRankScore: null;
}

export interface UserStatistics {
  rank: string;
  totalScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  totalPoints: number;
  lastActivity: string | null;
}

export interface CategoryStatistic {
  category: string;
  answered: number;
  correct: number;
  accuracy: number;
}

/**
 * Anonymous leaderboard entry (Layer 1 of the personal scoreboard).
 *
 * Documents in the `leaderboard` collection contain only score + rank data;
 * no PII (no displayName, email, photo). Each entry is keyed by the
 * user uid. Documents are written exclusively by the syncLeaderboard Cloud
 * Function and read by any authenticated user.
 */
export interface LeaderboardEntry {
  uid: string;
  totalScore: number;
  rank: string;
  /** Server-assigned rank position: 1 = highest score, 2 = next, etc. */
  position?: number;
  lastUpdated?: string;
}

export interface LeaderboardSnapshot {
  /** Current user's own entry, or null if not present yet */
  currentEntry: LeaderboardEntry | null;
  /** Top N entries for the "How you compare" card */
  topEntries: LeaderboardEntry[];
  /** Total number of users currently on the leaderboard */
  totalUsers: number;
  /** Current user's percentile (0–100, higher is better) */
  percentile: number | null;
}

/**
 * Team document (VPK-style friendly competition).
 *
 * Teams are an aggregation of user scores — `totalScore` is a server-maintained
 * sum of member `progress.totalScore` values, kept fresh by the Cloud Function
 * (quiz submissions bump both user and team). `memberUids` is capped at 50
 * entries (VPKs rarely exceed that).
 *
 * Teams are visible to any authenticated user (similar to the anonymous
 * leaderboard); the team's own `createdBy` may update metadata.
 */
export interface TeamDoc {
  readonly id?: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  /** Sum of members' totalScore (server-maintained). */
  totalScore: number;
  /** Number of members in the team. */
  memberCount: number;
  /** Capped at 50; supports array-contains queries for "is user in a team". */
  memberUids: string[];
}

export interface TeamMemberSummary {
  uid: string;
  displayName: string | null;
  totalScore: number;
  rank: string;
  photoURL: string | null;
}

export interface TeamSnapshot {
  currentTeam: TeamDoc | null;
  topTeams: TeamDoc[];
  totalTeams: number;
  members: TeamMemberSummary[];
  /** Current team's position among all teams (1 = top), or null. */
  teamPosition: number | null;
}

export interface GeneratedQuestionSource {
  title?: string;
  page?: string;
  url?: string;
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source?: GeneratedQuestionSource;
}
