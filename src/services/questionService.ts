import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Question } from '../types/models';

type QuestionInput = Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;

const toQuestion = (docSnap: { id: string; data: () => Record<string, unknown> }): Question =>
  ({ id: docSnap.id, ...docSnap.data() }) as Question;

/**
 * Fetch all questions from Firestore
 */
export const getAllQuestions = async (): Promise<Question[]> => {
  try {
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(toQuestion);
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

/**
 * Get questions by category ID
 */
export const getQuestionsByCategory = async (categoryId: string): Promise<Question[]> => {
  try {
    const q = query(collection(db, 'questions'), where('categoryId', '==', categoryId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(toQuestion);
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    throw error;
  }
};

/**
 * Get question by ID
 */
export const getQuestionById = async (questionId: string): Promise<Question> => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    const questionDoc = await getDoc(questionRef);

    if (questionDoc.exists()) {
      return toQuestion(questionDoc);
    }
    throw new Error('Question not found');
  } catch (error) {
    console.error('Error fetching question:', error);
    throw error;
  }
};

/**
 * Create a new question
 */
export const createQuestion = async (questionData: QuestionInput): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'questions'), {
      ...questionData,
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
};

/**
 * Update question data
 */
export const updateQuestion = async (
  questionId: string,
  updates: Partial<Omit<Question, 'id'>>,
): Promise<void> => {
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
 */
export const deleteQuestion = async (questionId: string): Promise<void> => {
  try {
    const questionRef = doc(db, 'questions', questionId);
    await deleteDoc(questionRef);
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};
