/**
 * Gamification Service
 *
 * Handles point calculation, rank advancement, and question/option randomization.
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
 *
 * Rank advancement:
 *   A user advances to a rank when BOTH conditions are met:
 *     1. totalScore >= rank.requiredScore
 *     2. overall accuracy >= minAccuracy (rank-specific or platform-wide config)
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllRanks } from './rankService';

/** Ordered difficulty levels from easiest to hardest */
export const DIFFICULTY_ORDER = ['perustaso', 'keskitaso', 'edistynyt', 'mestari'];

/** Default points awarded for a correct answer per difficulty level */
export const DEFAULT_DIFFICULTY_POINTS = {
  perustaso: 10,
  keskitaso: 20,
  edistynyt: 30,
  mestari: 50,
};

/** Default points deducted for a wrong answer per difficulty level */
export const DEFAULT_DIFFICULTY_PENALTIES = {
  perustaso: 2,
  keskitaso: 5,
  edistynyt: 10,
  mestari: 15,
};

/**
 * Calculate points for a single answer.
 * @param {string} difficulty - Question difficulty level
 * @param {boolean} isCorrect - Whether the answer is correct
 * @param {Object} [config={}] - Platform config (may contain pointsPerDifficulty / penaltyPerDifficulty)
 * @returns {number} Points earned (positive) or lost (negative)
 */
export const calculatePoints = (difficulty, isCorrect, config = {}) => {
  const pointsMap = config.pointsPerDifficulty || DEFAULT_DIFFICULTY_POINTS;
  const penaltyMap = config.penaltyPerDifficulty || DEFAULT_DIFFICULTY_PENALTIES;
  const level = difficulty || 'perustaso';

  if (isCorrect) {
    return pointsMap[level] ?? DEFAULT_DIFFICULTY_POINTS[level] ?? 10;
  }
  return -(penaltyMap[level] ?? DEFAULT_DIFFICULTY_PENALTIES[level] ?? 2);
};

/**
 * Determine which rank a user has earned based on their progress.
 * Returns the highest rank whose requirements are fully satisfied.
 *
 * @param {Object} progress - { totalScore, correctAnswers, questionsAnswered }
 * @param {Array}  ranks    - All rank objects sorted ascending by requiredScore
 * @param {Object} [config={}] - Platform config { minAccuracyForRankUp }
 * @returns {Object|null} Highest qualifying rank, or the lowest rank as default
 */
export const getEarnedRank = (progress, ranks, config = {}) => {
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
 * Check whether the user's rank should be updated and persist the change.
 * Should be called after each answer submission.
 *
 * @param {string} userId   - Firebase user ID
 * @param {Object} progress - Updated progress object after the latest answer
 * @param {Object} [config={}] - Platform config
 * @returns {Promise<Object|null>} New rank object if rank changed, null otherwise
 */
export const checkAndUpdateUserRank = async (userId, progress, config = {}) => {
  try {
    const ranks = await getAllRanks();
    if (ranks.length === 0) return null;

    const earnedRank = getEarnedRank(progress, ranks, config);
    if (!earnedRank) return null;

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;

    const currentRankId = userDoc.data().rankId;
    if (currentRankId !== earnedRank.id) {
      await updateDoc(userRef, {
        rank: earnedRank.name,
        rankId: earnedRank.id,
        rankUpdatedAt: new Date().toISOString(),
      });
      return earnedRank;
    }

    return null;
  } catch (error) {
    console.error('Error checking/updating user rank:', error);
    return null;
  }
};

/**
 * Get platform configuration from Firestore.
 * @returns {Promise<Object>} Platform config object
 */
export const getPlatformConfig = async () => {
  try {
    const configRef = doc(db, 'config', 'platform');
    const configDoc = await getDoc(configRef);
    return configDoc.exists() ? configDoc.data() : {};
  } catch (error) {
    console.error('Error fetching platform config:', error);
    return {};
  }
};

/**
 * Shuffle an array in-place using the Fisher-Yates algorithm.
 * @param {Array} arr - Array to shuffle
 * @returns {Array} The same array, shuffled
 */
export const shuffleArray = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Shuffle the answer options of a question while keeping correctAnswerIndex consistent.
 * @param {Object} question - Question object with `options` and `correctAnswerIndex`
 * @returns {Object} New question object with shuffled options and updated correctAnswerIndex
 */
export const shuffleQuestionOptions = (question) => {
  if (!question.options || question.options.length === 0) return question;

  const normalizedCorrectAnswerIndex = Number.isInteger(question.correctAnswerIndex)
    ? question.correctAnswerIndex
    : typeof question.correctAnswerIndex === 'string'
      ? parseInt(question.correctAnswerIndex, 10)
      : question.correctAnswerIndex;
  const indexed = question.options.map((opt, i) => ({ opt, i }));
  shuffleArray(indexed);

  return {
    ...question,
    options: indexed.map(({ opt }) => opt),
    correctAnswerIndex: indexed.findIndex(({ i }) => i === normalizedCorrectAnswerIndex),
  };
};

/**
 * Pick a random selection of questions from a pool, optionally bounded by max difficulty.
 * Questions at or below `maxDifficulty` are preferred; if none exist the full pool is used.
 *
 * @param {Array}       questions     - All available questions for a category
 * @param {number}      [maxCount=10] - Maximum number of questions to return
 * @param {string|null} [maxDifficulty=null] - Highest difficulty to include (null = all)
 * @returns {Array} Randomized subset of questions (options already shuffled)
 */
export const getRandomizedQuestions = (questions, maxCount = 10, maxDifficulty = null) => {
  let pool = questions;

  if (maxDifficulty) {
    const maxIndex = DIFFICULTY_ORDER.indexOf(maxDifficulty);
    if (maxIndex !== -1) {
      const allowed = new Set(DIFFICULTY_ORDER.slice(0, maxIndex + 1));
      const filtered = questions.filter(q => allowed.has(q.difficulty || 'perustaso'));
      if (filtered.length > 0) pool = filtered;
    }
  }

  const shuffled = shuffleArray([...pool]);
  const selected = shuffled.slice(0, maxCount);

  // Shuffle options for each selected question
  return selected.map(shuffleQuestionOptions);
};
