import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from './firebase';
import { logFirestoreErrorContext } from '../utils/firestoreDiagnostics';

/**
 * Get all available quizzes/questions for a user
 * @returns {Promise<Array>} Array of quiz cards with metadata
 */
export const getAvailableQuizzes = async () => {
  try {
    // Fetch all questions and categories
    const [questionsSnapshot, categoriesSnapshot] = await Promise.all([
      getDocs(collection(db, 'questions')),
      getDocs(collection(db, 'categories')),
    ]);
    
    // Create a map of category ID -> category data
    const categoryMap = {};
    categoriesSnapshot.forEach(docSnap => {
      categoryMap[docSnap.id] = docSnap.data();
    });

    const quizzes = [];
    const quizMap = {};
    
    questionsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Skip unpublished questions only if explicitly marked as false
      if (data.published === false) return;
      
      const categoryId = data.categoryId || 'unknown';
      const categoryData = categoryMap[categoryId] || {};
      const categoryName = categoryData.name || 'Muut';
      
      // Group questions by category
      if (!quizMap[categoryName]) {
        quizMap[categoryName] = {
          id: categoryId,
          name: categoryName,
          questions: [],
          totalQuestions: 0,
          difficulties: new Set(),
          requiredRankId: categoryData.requiredRankId || null,
          requiredRankScore: null,
        };
      }
      
      quizMap[categoryName].questions.push({
        id: docSnap.id,
        ...data,
      });
      quizMap[categoryName].difficulties.add(data.difficulty || 'perustaso');
    });
    
    // Convert to quiz cards
    Object.values(quizMap).forEach(cat => {
      cat.totalQuestions = cat.questions.length;
      cat.difficulties = Array.from(cat.difficulties);
      quizzes.push(cat);
    });
    
    return quizzes;
  } catch (error) {
    logFirestoreErrorContext('getAvailableQuizzes', error);
    console.error('Error fetching available quizzes:', error);
    throw error;
  }
};

/**
 * Get questions for a specific category
 * @param {string} categoryName - Category name
 * @param {string} difficulty - Optional: filter by difficulty
 * @returns {Promise<Array>} Array of questions
 */
export const getQuestionsByCategory = async (categoryName, difficulty = null) => {
  try {
    // First, find the category ID from the category name
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    let categoryId = null;
    
    categoriesSnapshot.forEach(doc => {
      if (doc.data().name === categoryName) {
        categoryId = doc.id;
      }
    });

    // Fetch questions with this categoryId
    const questionsRef = collection(db, 'questions');
    const constraints = [where('categoryId', '==', categoryId || categoryName)];
    
    const q = query(questionsRef, ...constraints);
    const snapshot = await getDocs(q);
    const questions = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Skip unpublished questions only if explicitly marked as false
      if (data.published === false) return;
      
      // Apply difficulty filter if specified
      if (difficulty && data.difficulty !== difficulty) return;
      
      const rawCorrectIndex = data.correctAnswerIndex ?? data.correctIndex;
      const normalizedCorrectAnswerIndex = Number.isInteger(rawCorrectIndex)
        ? rawCorrectIndex
        : typeof rawCorrectIndex === 'string'
          ? parseInt(rawCorrectIndex, 10)
          : rawCorrectIndex;

      questions.push({
        id: doc.id,
        ...data,
        correctAnswerIndex: normalizedCorrectAnswerIndex,
      });
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
 * @param {string} categoryId - Category ID
 * @param {string} difficulty - Optional: filter by difficulty
 * @returns {Promise<Array>} Array of questions
 */
export const getQuestionsByCategoryId = async (categoryId, difficulty = null) => {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    const questions = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.published === false) return;
      if (difficulty && data.difficulty !== difficulty) return;

      const rawCorrectIndex = data.correctAnswerIndex ?? data.correctIndex;
      const normalizedCorrectAnswerIndex = Number.isInteger(rawCorrectIndex)
        ? rawCorrectIndex
        : typeof rawCorrectIndex === 'string'
          ? parseInt(rawCorrectIndex, 10)
          : rawCorrectIndex;

      questions.push({
        id: doc.id,
        ...data,
        correctAnswerIndex: normalizedCorrectAnswerIndex,
      });
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
 *
 * @param {string} userId - User ID (unused; identity comes from the auth context)
 * @param {string} questionId - Question ID
 * @param {number} selectedIndex - Index of selected option
 * @returns {Promise<Object>} { id, questionId, selectedIndex, isCorrect, points, rankChanged }
 */
export const submitAnswer = async (userId, questionId, selectedIndex) => {
  try {
    const submit = httpsCallable(getFunctions(app), 'submitQuizAnswer');
    const result = await submit({ questionId, selectedIndex });
    const data = result.data || {};
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
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of user's answers
 */
export const getUserAnswers = async (userId) => {
  try {
    const answersRef = collection(db, 'users', userId, 'answers');
    const snapshot = await getDocs(answersRef);
    
    const answers = [];
    snapshot.forEach(doc => {
      answers.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return answers.sort((a, b) => 
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );
  } catch (error) {
    logFirestoreErrorContext('getUserAnswers', error);
    console.error('Error fetching user answers:', error);
    return [];
  }
};

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User statistics (returns safe defaults on error)
 */
export const getUserStatistics = async (userId) => {
  const defaultStats = {
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
    
    const userData = userDoc.data();
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
      lastActivity: userData.lastActivity || userData.createdAt,
    };
  } catch (error) {
    logFirestoreErrorContext('getUserStatistics', error);
    console.error('Error fetching user statistics:', error);
    return defaultStats;
  }
};

/**
 * Get category statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Statistics grouped by category
 */
export const getCategoryStatistics = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return [];
    }

    const progressByCategory = userDoc.data().progressByCategory || {};
    const cachedStats = Object.values(progressByCategory)
      .filter(stat => stat && stat.answered > 0)
      .map(stat => ({
        category: stat.name || stat.categoryId,
        answered: stat.answered || 0,
        correct: stat.correct || 0,
        accuracy: stat.answered > 0 ? Math.round((stat.correct / stat.answered) * 100) : 0,
      }));

    if (cachedStats.length > 0) {
      return cachedStats;
    }

    const answers = await getUserAnswers(userId);
    if (answers.length === 0) {
      return [];
    }

    const hasCategoryInfo = answers.some(answer => answer.categoryId || answer.categoryName);
    let statsByCategoryId = {};

    if (hasCategoryInfo) {
      answers.forEach(answer => {
        const categoryId = answer.categoryId || answer.categoryName || 'Muut';
        const categoryName = answer.categoryName || answer.categoryId || 'Muut';

        if (!statsByCategoryId[categoryId]) {
          statsByCategoryId[categoryId] = {
            categoryId,
            name: categoryName,
            answered: 0,
            correct: 0,
          };
        }

        statsByCategoryId[categoryId].answered += 1;
        if (answer.isCorrect) {
          statsByCategoryId[categoryId].correct += 1;
        }
      });
    } else {
      const allQuestions = {};
      const categoryMap = {};
      const [questionsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, 'questions')),
        getDocs(collection(db, 'categories')),
      ]);

      categoriesSnapshot.forEach(doc => {
        categoryMap[doc.id] = doc.data().name || doc.id;
      });

      questionsSnapshot.forEach(doc => {
        allQuestions[doc.id] = doc.data();
      });

      answers.forEach(answer => {
        const question = allQuestions[answer.questionId];
        if (!question) return;

        const categoryId = question.categoryId || 'Muut';
        const categoryName = categoryMap[categoryId] || 'Muut';

        if (!statsByCategoryId[categoryId]) {
          statsByCategoryId[categoryId] = {
            categoryId,
            name: categoryName,
            answered: 0,
            correct: 0,
          };
        }

        statsByCategoryId[categoryId].answered += 1;
        if (answer.isCorrect) {
          statsByCategoryId[categoryId].correct += 1;
        }
      });
    }

    // Return computed stats (read-only - cache is built incrementally via submitAnswer)
    return Object.values(statsByCategoryId)
      .filter(stat => stat.answered > 0)
      .map(stat => ({
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
