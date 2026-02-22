import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch all questions from Firestore
 * @returns {Promise<Array>} Array of question objects with id
 */
export const getAllQuestions = async () => {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const questions = [];
    querySnapshot.forEach((doc) => {
      questions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return questions;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

/**
 * Get questions by category ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Array>} Array of question objects
 */
export const getQuestionsByCategory = async (categoryId) => {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('categoryId', '==', categoryId));
    const querySnapshot = await getDocs(q);
    
    const questions = [];
    querySnapshot.forEach((doc) => {
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
 * Get question by ID
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Question object
 */
export const getQuestionById = async (questionId) => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    const questionDoc = await getDoc(questionRef);
    
    if (questionDoc.exists()) {
      return {
        id: questionDoc.id,
        ...questionDoc.data(),
      };
    } else {
      throw new Error('Question not found');
    }
  } catch (error) {
    console.error('Error fetching question:', error);
    throw error;
  }
};

/**
 * Create a new question
 * @param {Object} questionData - Question data
 * @returns {Promise<string>} Created question ID
 */
export const createQuestion = async (questionData) => {
  try {
    const questionsRef = collection(db, 'questions');
    const docRef = await addDoc(questionsRef, {
      ...questionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
};

/**
 * Update question data
 * @param {string} questionId - Question ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<void>}
 */
export const updateQuestion = async (questionId, updates) => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    await updateDoc(questionRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

/**
 * Delete question from Firestore
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
export const deleteQuestion = async (questionId) => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    await deleteDoc(questionRef);
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};
