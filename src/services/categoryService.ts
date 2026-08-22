import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { Category } from '../types/models';

type CategoryInput = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Fetch all categories from Firestore
 */
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Category, 'id'>),
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (categoryId: string): Promise<Category> => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);

    if (categoryDoc.exists()) {
      return {
        id: categoryDoc.id,
        ...(categoryDoc.data() as Omit<Category, 'id'>),
      };
    }
    throw new Error('Category not found');
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (categoryData: CategoryInput): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'categories'), {
      ...categoryData,
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Update category data
 */
export const updateCategory = async (
  categoryId: string,
  updates: Partial<Omit<Category, 'id'>>,
): Promise<void> => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete category from Firestore
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
