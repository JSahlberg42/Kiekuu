import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { calculatePoints, checkAndUpdateUserRank, getPlatformConfig } from './gamificationService';

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
      
      questions.push({
        id: doc.id,
        ...data,
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
 * @param {string} [difficulty='perustaso'] - Question difficulty level
 * @param {number} [timeSpent=0] - Time spent on question in seconds
 * @returns {Promise<Object>} Answer record with earned points
 */
export const submitAnswer = async (userId, questionId, selectedIndex, isCorrect, difficulty = 'perustaso', timeSpent = 0) => {
  try {
    const config = await getPlatformConfig();
    const points = calculatePoints(difficulty, isCorrect, config);

    const answerRef = collection(db, 'users', userId, 'answers');
    const answer = {
      questionId,
      selectedIndex,
      isCorrect,
      difficulty,
      timeSpent,
      submittedAt: new Date().toISOString(),
      points,
    };

    const docRef = await addDoc(answerRef, answer);

    // Update user progress and check rank advancement
    const updatedProgress = await updateUserProgress(userId, {
      questionsAnswered: 1,
      correctAnswers: isCorrect ? 1 : 0,
      totalPoints: points,
    });

    // Check if user earned a new rank
    await checkAndUpdateUserRank(userId, updatedProgress, config);

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
 * @param {Object} updates - Progress updates { questionsAnswered, correctAnswers, totalPoints }
 * @returns {Promise<Object>} Updated progress object
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

    return newProgress;
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
    
    // Get question details and category mapping
    const allQuestions = {};
    const categoryMap = {};
    const [questionsSnapshot, categoriesSnapshot] = await Promise.all([
      getDocs(collection(db, 'questions')),
      getDocs(collection(db, 'categories')),
    ]);
    
    // Map category IDs to names
    categoriesSnapshot.forEach(doc => {
      categoryMap[doc.id] = doc.data().name || doc.id;
    });
    
    // Store question data
    questionsSnapshot.forEach(doc => {
      allQuestions[doc.id] = doc.data();
    });
    
    // Calculate stats per category
    answers.forEach(answer => {
      const question = allQuestions[answer.questionId];
      if (question) {
        // Get category name from categoryId
        const categoryId = question.categoryId;
        const categoryName = categoryMap[categoryId] || 'Muut';
        
        // Initialize if not already initialized
        if (!stats[categoryName]) {
          stats[categoryName] = {
            category: categoryName,
            answered: 0,
            correct: 0,
            accuracy: 0,
          };
        }
        
        stats[categoryName].answered++;
        if (answer.isCorrect) {
          stats[categoryName].correct++;
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
