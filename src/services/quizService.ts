import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from './firebase';
import { logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import type {
  AnswerDoc,
  CategoryStatistic,
  Category,
  Question,
  QuestionDifficulty,
  QuizCard,
  SubmitQuizAnswerResponse,
  SubmittedAnswer,
  UserStatistics,
} from '../types/models';

const normalizeCorrectIndex = (raw: Question): number | string | null | undefined => {
  const rawCorrectIndex = raw.correctAnswerIndex ?? raw.correctIndex;
  if (Number.isInteger(rawCorrectIndex)) return rawCorrectIndex;
  if (typeof rawCorrectIndex === 'string') return parseInt(rawCorrectIndex, 10);
  return rawCorrectIndex;
};

/**
 * Get all available quizzes/questions grouped by category
 */
export const getAvailableQuizzes = async (): Promise<QuizCard[]> => {
  try {
    // Fetch all questions and categories
    const [questionsSnapshot, categoriesSnapshot] = await Promise.all([
      getDocs(collection(db, 'questions')),
      getDocs(collection(db, 'categories')),
    ]);

    // Create a map of category ID -> category data
    const categoryMap = new Map<string, Category>();
    categoriesSnapshot.forEach((docSnap) => {
      categoryMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Category);
    });

    const quizMap = new Map<string, QuizCard>();

    questionsSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Question, 'id'>;
      // Skip unpublished questions only if explicitly marked as false
      if (data.published === false) return;

      const categoryId = data.categoryId || 'unknown';
      const categoryData = categoryMap.get(categoryId);
      const categoryName = categoryData?.name || 'Muut';

      // Group questions by category
      if (!quizMap.has(categoryName)) {
        quizMap.set(categoryName, {
          id: categoryId,
          name: categoryName,
          questions: [],
          totalQuestions: 0,
          difficulties: [],
          requiredRankId: categoryData?.requiredRankId || null,
          requiredRankScore: null,
        });
      }

      const card = quizMap.get(categoryName)!;
      card.questions.push({ id: docSnap.id, ...data });
      const difficulty = data.difficulty || 'perustaso';
      if (!card.difficulties.includes(difficulty)) {
        card.difficulties.push(difficulty);
      }
    });

    // Convert to quiz cards
    return Array.from(quizMap.values()).map((card) => ({
      ...card,
      totalQuestions: card.questions.length,
    }));
  } catch (error) {
    logFirestoreErrorContext('getAvailableQuizzes', error);
    console.error('Error fetching available quizzes:', error);
    throw error;
  }
};

/**
 * Get questions for a specific category name
 */
export const getQuestionsByCategory = async (
  categoryName: string,
  difficulty: QuestionDifficulty | string | null = null,
): Promise<Question[]> => {
  try {
    // First, find the category ID from the category name
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    let categoryId: string | null = null;

    categoriesSnapshot.forEach((docSnap) => {
      if ((docSnap.data() as { name?: string }).name === categoryName) {
        categoryId = docSnap.id;
      }
    });

    // Fetch questions with this categoryId
    const q = query(collection(db, 'questions'), where('categoryId', '==', categoryId || categoryName));
    const snapshot = await getDocs(q);
    const questions: Question[] = [];

    snapshot.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as Omit<Question, 'id'>) };
      // Skip unpublished questions only if explicitly marked as false
      if (data.published === false) return;

      // Apply difficulty filter if specified
      if (difficulty && data.difficulty !== difficulty) return;

      data.correctAnswerIndex = normalizeCorrectIndex(data);
      questions.push(data);
    });

    return questions;
  } catch (error) {
    logFirestoreErrorContext('getQuestionsByCategory', error);
    console.error('Error fetching questions by category:', error);
    throw error;
  }
};

/**
 * Get questions for a specific category ID
 */
export const getQuestionsByCategoryId = async (
  categoryId: string,
  difficulty: QuestionDifficulty | string | null = null,
): Promise<Question[]> => {
  try {
    const q = query(collection(db, 'questions'), where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    const questions: Question[] = [];

    snapshot.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as Omit<Question, 'id'>) };
      if (data.published === false) return;
      if (difficulty && data.difficulty !== difficulty) return;

      data.correctAnswerIndex = normalizeCorrectIndex(data);
      questions.push(data);
    });

    return questions;
  } catch (error) {
    logFirestoreErrorContext('getQuestionsByCategoryId', error);
    console.error('Error fetching questions by category ID:', error);
    throw error;
  }
};

/**
 * Submit answer for a question
 *
 * Scoring is server-authoritative: correctness, difficulty and points are
 * derived from the question document by the submitQuizAnswer callable, and
 * progression/rank updates happen server-side. The client cannot claim its
 * own points.
 */
export const submitAnswer = async (
  _userId: string,
  questionId: string,
  selectedIndex: number,
): Promise<SubmittedAnswer> => {
  try {
    const submit = httpsCallable<{ questionId: string; selectedIndex: number }, SubmitQuizAnswerResponse>(
      getFunctions(app),
      'submitQuizAnswer',
    );
    const result = await submit({ questionId, selectedIndex });
    const data = result.data ?? ({} as Partial<SubmitQuizAnswerResponse>);
    return {
      id: data.answerId || null,
      questionId,
      selectedIndex,
      isCorrect: Boolean(data.isCorrect),
      points: data.points || 0,
      rankChanged: data.rankChanged || null,
    };
  } catch (error) {
    logFirestoreErrorContext('submitAnswer', error);
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Get user's answered questions
 */
export const getUserAnswers = async (userId: string): Promise<AnswerDoc[]> => {
  try {
    const answersRef = collection(db, 'users', userId, 'answers');
    const snapshot = await getDocs(answersRef);

    const answers = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<AnswerDoc, 'id'>),
    }));

    return answers.sort((a, b) =>
      new Date(b.submittedAt ?? '').getTime() - new Date(a.submittedAt ?? '').getTime()
    );
  } catch (error) {
    logFirestoreErrorContext('getUserAnswers', error);
    console.error('Error fetching user answers:', error);
    return [];
  }
};

/**
 * Get user statistics
 */
export const getUserStatistics = async (userId: string): Promise<UserStatistics> => {
  const defaultStats: UserStatistics = {
    rank: 'harjoittelija',
    totalScore: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    totalPoints: 0,
    lastActivity: null,
  };

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return defaultStats;
    }

    const userData = userDoc.data() as UserStatisticsDoc;
    const progress = userData.progress || {};
    const totalAnswered = progress.questionsAnswered || 0;
    const correctAnswers = progress.correctAnswers || 0;
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

    return {
      rank: userData.rank || 'harjoittelija',
      totalScore: progress.totalScore || 0,
      questionsAnswered: totalAnswered,
      correctAnswers,
      accuracy,
      totalPoints: progress.totalScore || 0,
      lastActivity: userData.lastActivity || userData.createdAt || null,
    };
  } catch (error) {
    logFirestoreErrorContext('getUserStatistics', error);
    console.error('Error fetching user statistics:', error);
    return defaultStats;
  }
};

type UserStatisticsDoc = {
  rank?: string;
  lastActivity?: string;
  createdAt?: string;
  progress?: {
    totalScore?: number;
    questionsAnswered?: number;
    correctAnswers?: number;
  };
};

/**
 * Get category statistics for user
 */
export const getCategoryStatistics = async (userId: string): Promise<CategoryStatistic[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return [];
    }

    const progressByCategory =
      (userDoc.data() as { progressByCategory?: Record<string, { categoryId?: string; name?: string; answered?: number; correct?: number }> })
        .progressByCategory || {};
    const cachedStats = Object.values(progressByCategory)
      .filter((stat) => stat && (stat.answered ?? 0) > 0)
      .map((stat) => ({
        category: stat.name || stat.categoryId || '',
        answered: stat.answered || 0,
        correct: stat.correct || 0,
        accuracy: (stat.answered ?? 0) > 0 ? Math.round(((stat.correct ?? 0) / (stat.answered ?? 1)) * 100) : 0,
      }));

    if (cachedStats.length > 0) {
      return cachedStats;
    }

    const answers = await getUserAnswers(userId);
    if (answers.length === 0) {
      return [];
    }

    const hasCategoryInfo = answers.some((answer) => answer.categoryId || answer.categoryName);
    interface StatAccumulator {
      categoryId: string;
      name: string;
      answered: number;
      correct: number;
    }
    const statsByCategoryId = new Map<string, StatAccumulator>();
    const accumulate = (categoryId: string, categoryName: string, isCorrect: boolean | undefined) => {
      if (!statsByCategoryId.has(categoryId)) {
        statsByCategoryId.set(categoryId, { categoryId, name: categoryName, answered: 0, correct: 0 });
      }
      const stat = statsByCategoryId.get(categoryId)!;
      stat.answered += 1;
      if (isCorrect) {
        stat.correct += 1;
      }
    };

    if (hasCategoryInfo) {
      answers.forEach((answer) => {
        accumulate(
          answer.categoryId || answer.categoryName || 'Muut',
          answer.categoryName || answer.categoryId || 'Muut',
          answer.isCorrect,
        );
      });
    } else {
      const allQuestions = new Map<string, { categoryId?: string }>();
      const categoryNames = new Map<string, string>();
      const [questionsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, 'questions')),
        getDocs(collection(db, 'categories')),
      ]);

      categoriesSnapshot.forEach((docSnap) => {
        categoryNames.set(docSnap.id, (docSnap.data() as { name?: string }).name || docSnap.id);
      });

      questionsSnapshot.forEach((docSnap) => {
        allQuestions.set(docSnap.id, docSnap.data() as { categoryId?: string });
      });

      answers.forEach((answer) => {
        const question = allQuestions.get(answer.questionId);
        if (!question) return;

        const categoryId = question.categoryId || 'Muut';
        accumulate(categoryId, categoryNames.get(categoryId) || 'Muut', answer.isCorrect);
      });
    }

    // Return computed stats (read-only - cache is built incrementally via submitAnswer)
    return Array.from(statsByCategoryId.values())
      .filter((stat) => stat.answered > 0)
      .map((stat) => ({
        category: stat.name || stat.categoryId,
        answered: stat.answered,
        correct: stat.correct,
        accuracy: stat.answered > 0 ? Math.round((stat.correct / stat.answered) * 100) : 0,
      }));
  } catch (error) {
    logFirestoreErrorContext('getCategoryStatistics', error);
    console.error('Error fetching category statistics:', error);
    return [];
  }
};
