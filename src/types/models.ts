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
