/**
 * Gamification Service
 *
 * Handles point calculation and question/option randomization.
 * Rank evaluation lives server-side in the submitQuizAnswer callable;
 * getEarnedRank remains here as the shared reference implementation.
 *
 * Difficulty levels (ordered easiest → hardest):
 *   perustaso   (basic)        — easiest questions, lowest rewards
 *   keskitaso   (intermediate) — moderate questions
 *   edistynyt   (advanced)     — harder questions, higher rewards
 *   mestari     (master)       — hardest questions, highest rewards
 *
 * Point calculation (configurable via platform config):
 *   Correct answer:  +points based on difficulty
 *   Wrong answer:    -penalty based on difficulty
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { PlatformConfig, Question, QuestionDifficulty, Rank, UserProgress } from '../types/models';

/** Ordered difficulty levels from easiest to hardest */
export const DIFFICULTY_ORDER = ['perustaso', 'keskitaso', 'edistynyt', 'mestari'] as const;

/** Default points awarded for a correct answer per difficulty level */
export const DEFAULT_DIFFICULTY_POINTS: Record<QuestionDifficulty, number> = {
  perustaso: 10,
  keskitaso: 20,
  edistynyt: 30,
  mestari: 50,
};

/** Default points deducted for a wrong answer per difficulty level */
export const DEFAULT_DIFFICULTY_PENALTIES: Record<QuestionDifficulty, number> = {
  perustaso: 2,
  keskitaso: 5,
  edistynyt: 10,
  mestari: 15,
};

/**
 * Calculate points for a single answer.
 */
export const calculatePoints = (
  difficulty: string | null | undefined,
  isCorrect: boolean,
  config: PlatformConfig = {},
): number => {
  const pointsMap = config.pointsPerDifficulty ?? DEFAULT_DIFFICULTY_POINTS;
  const penaltyMap = config.penaltyPerDifficulty ?? DEFAULT_DIFFICULTY_PENALTIES;
  const level = (difficulty ?? 'perustaso') as QuestionDifficulty;

  if (isCorrect) {
    return pointsMap[level] ?? DEFAULT_DIFFICULTY_POINTS[level] ?? 10;
  }
  return -(penaltyMap[level] ?? DEFAULT_DIFFICULTY_PENALTIES[level] ?? 2);
};

/**
 * Determine which rank a user has earned based on their progress.
 * Returns the highest rank whose requirements are fully satisfied,
 * or the lowest rank as default.
 */
export const getEarnedRank = (
  progress: Partial<UserProgress>,
  ranks: Rank[],
  config: PlatformConfig = {},
): Rank | null => {
  if (!ranks || ranks.length === 0) return null;

  const score = progress.totalScore || 0;
  const answered = progress.questionsAnswered || 0;
  const correct = progress.correctAnswers || 0;
  const accuracy = answered > 0 ? (correct / answered) * 100 : 0;
  const globalMinAccuracy = config.minAccuracyForRankUp ?? 60;

  const sorted = [...ranks].sort((a, b) => a.requiredScore - b.requiredScore);
  let earned = sorted[0]; // default to the lowest rank

  for (const rank of sorted) {
    const rankMinAccuracy = rank.minAccuracy ?? globalMinAccuracy;
    if (score >= rank.requiredScore && accuracy >= rankMinAccuracy) {
      earned = rank;
    }
  }

  return earned;
};

/**
 * Get platform configuration from Firestore.
 */
export const getPlatformConfig = async (): Promise<PlatformConfig> => {
  try {
    const configRef = doc(db, 'config', 'platform');
    const configDoc = await getDoc(configRef);
    return (configDoc.data() as PlatformConfig | undefined) ?? {};
  } catch (error) {
    console.error('Error fetching platform config:', error);
    return {};
  }
};

/**
 * Shuffle an array in-place using the Fisher-Yates algorithm.
 */
export const shuffleArray = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Shuffle the answer options of a question while keeping correctAnswerIndex consistent.
 */
export const shuffleQuestionOptions = (question: Question): Question => {
  if (!question.options || question.options.length === 0) return question;

  const rawCorrectIndex = question.correctAnswerIndex ?? question.correctIndex;
  const normalizedCorrectAnswerIndex = Number.isInteger(rawCorrectIndex)
    ? rawCorrectIndex
    : typeof rawCorrectIndex === 'string'
      ? parseInt(rawCorrectIndex, 10)
      : rawCorrectIndex;
  const indexed = question.options.map((opt, i) => ({ opt, i }));
  shuffleArray(indexed);

  return {
    ...question,
    options: indexed.map(({ opt }) => opt),
    correctAnswerIndex:
      typeof normalizedCorrectAnswerIndex === 'number'
        ? indexed.findIndex(({ i }) => i === normalizedCorrectAnswerIndex)
        : null,
  };
};

/**
 * Pick a random selection of questions from a pool, optionally bounded by max difficulty.
 * Questions at or below `maxDifficulty` are preferred; if none exist the full pool is used.
 */
export const getRandomizedQuestions = (
  questions: Question[],
  maxCount = 10,
  maxDifficulty: QuestionDifficulty | null = null,
): Question[] => {
  let pool = questions;

  if (maxDifficulty) {
    const maxIndex = DIFFICULTY_ORDER.indexOf(maxDifficulty);
    if (maxIndex !== -1) {
      const allowed = new Set<string>(DIFFICULTY_ORDER.slice(0, maxIndex + 1));
      const filtered = questions.filter((q) => allowed.has(q.difficulty || 'perustaso'));
      if (filtered.length > 0) pool = filtered;
    }
  }

  const shuffled = shuffleArray([...pool]);
  const selected = shuffled.slice(0, maxCount);

  // Shuffle options for each selected question
  return selected.map(shuffleQuestionOptions);
};
