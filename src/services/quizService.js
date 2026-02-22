import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get all available quizzes/questions for a user
 * @returns {Promise<Array>} Array of quiz cards with metadata
 */
export const getAvailableQuizzes = async () => {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('published', '==', true));
    const snapshot = await getDocs(q);
    
    const quizzes = [];
    const categoryMap = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Muut';
      
      // Group questions by category
      if (!categoryMap[category]) {
        categoryMap[category] = {
          id: category.toLowerCase().replace(/\s+/g, '-'),
          name: category,
          questions: [],
          totalQuestions: 0,
          difficulties: new Set(),
        };
      }
      
      categoryMap[category].questions.push({
        id: doc.id,
        ...data,
      });
      categoryMap[category].difficulties.add(data.difficulty || 'perustaso');
    });
    
    // Convert to quiz cards
    Object.values(categoryMap).forEach(cat => {
      cat.totalQuestions = cat.questions.length;
      cat.difficulties = Array.from(cat.difficulties);
      quizzes.push(cat);
    });
    
    return quizzes;
  } catch (error) {
    console.error('Error fetching available quizzes:', error);
    throw error;
  }
};

/**
 * Get questions for a specific category
 * @param {string} categoryId - Category ID or name
 * @param {string} difficulty - Optional: filter by difficulty
 * @returns {Promise<Array>} Array of questions
 */
export const getQuestionsByCategory = async (categoryId, difficulty = null) => {
  try {
    let q;
    
    if (difficulty) {
      q = query(
        collection(db, 'questions'),
        where('category', '==', categoryId),
        where('difficulty', '==', difficulty),
        where('published', '==', true)
      );
    } else {
      q = query(
        collection(db, 'questions'),
        where('category', '==', categoryId),
        where('published', '==', true)
      );
    }
    
    const snapshot = await getDocs(q);
    const questions = [];
    
    snapshot.forEach(doc => {
      questions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return questions;
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    throw error;
  }
};

/**
 * Submit answer for a question
 * @param {string} userId - User ID
 * @param {string} questionId - Question ID
 * @param {number} selectedIndex - Index of selected option (0-3)
 * @param {boolean} isCorrect - Whether answer is correct
 * @param {number} timeSpent - Time spent on question in seconds
 * @returns {Promise<Object>} Answer record
 */
export const submitAnswer = async (userId, questionId, selectedIndex, isCorrect, timeSpent = 0) => {
  try {
    const answerRef = collection(db, 'users', userId, 'answers');
    
    const answer = {
      questionId,
      selectedIndex,
      isCorrect,
      timeSpent,
      submittedAt: new Date().toISOString(),
      points: isCorrect ? 10 : 0,
    };
    
    const docRef = await addDoc(answerRef, answer);
    
    // Update user progress
    await updateUserProgress(userId, {
      questionsAnswered: 1,
      correctAnswers: isCorrect ? 1 : 0,
      totalPoints: isCorrect ? 10 : 0,
    });
    
    return {
      id: docRef.id,
      ...answer,
    };
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Update user progress
 * @param {string} userId - User ID
 * @param {Object} updates - Progress updates
 * @returns {Promise<void>}
 */
export const updateUserProgress = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const currentProgress = userDoc.data().progress || {
      currentLevel: 'harjoittelija',
      totalScore: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
    };
    
    const newProgress = {
      ...currentProgress,
      totalScore: (currentProgress.totalScore || 0) + (updates.totalPoints || 0),
      questionsAnswered: (currentProgress.questionsAnswered || 0) + (updates.questionsAnswered || 0),
      correctAnswers: (currentProgress.correctAnswers || 0) + (updates.correctAnswers || 0),
    };
    
    // Update user document with new progress
    await updateDoc(userRef, {
      progress: newProgress,
      lastActivity: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user progress:', error);
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
    console.error('Error fetching user answers:', error);
    return [];
  }
};

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User statistics
 */
export const getUserStatistics = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const userData = userDoc.data();
    const answers = await getUserAnswers(userId);
    
    const totalAnswered = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    return {
      rank: userData.rank || 'harjoittelija',
      totalScore: userData.progress?.totalScore || 0,
      questionsAnswered: userData.progress?.questionsAnswered || totalAnswered,
      correctAnswers,
      accuracy,
      totalPoints: userData.progress?.totalScore || answers.reduce((sum, a) => sum + (a.points || 0), 0),
      lastActivity: userData.lastActivity || userData.createdAt,
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
};

/**
 * Get category statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Statistics grouped by category
 */
export const getCategoryStatistics = async (userId) => {
  try {
    const answers = await getUserAnswers(userId);
    const quizzes = await getAvailableQuizzes();
    
    const stats = {};
    
    // Initialize stats for each category
    quizzes.forEach(quiz => {
      stats[quiz.name] = {
        category: quiz.name,
        answered: 0,
        correct: 0,
        accuracy: 0,
      };
    });
    
    // Get question details to map answers to categories
    const allQuestions = {};
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    snapshot.forEach(doc => {
      allQuestions[doc.id] = doc.data();
    });
    
    // Calculate stats per category
    answers.forEach(answer => {
      const question = allQuestions[answer.questionId];
      if (question && question.category) {
        const category = question.category;
        if (stats[category]) {
          stats[category].answered++;
          if (answer.isCorrect) {
            stats[category].correct++;
          }
        }
      }
    });
    
    // Calculate accuracy percentages
    Object.values(stats).forEach(stat => {
      stat.accuracy = stat.answered > 0 
        ? Math.round((stat.correct / stat.answered) * 100)
        : 0;
    });
    
    return Object.values(stats).filter(s => s.answered > 0);
  } catch (error) {
    console.error('Error fetching category statistics:', error);
    return [];
  }
};
