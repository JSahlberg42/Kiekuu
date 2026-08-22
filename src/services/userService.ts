import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { UserDoc } from '../types/models';

const toUser = (docSnap: QueryDocumentSnapshot): UserDoc => ({
  id: docSnap.id,
  ...(docSnap.data() as Omit<UserDoc, 'id'>),
});
/**
 * Fetch all users from Firestore
 */
export const getAllUsers = async (): Promise<UserDoc[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));

    return querySnapshot.docs.map(toUser);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Search users by email address
 */
export const searchUsersByEmail = async (email: string): Promise<UserDoc[]> => {
  try {
    if (!email) {
      return await getAllUsers();
    }

    const q = query(
      collection(db, 'users'),
      where('email', '>=', email),
      where('email', '<=', email + '\uf8ff'),
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(toUser);
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Update user data in Firestore
 */
export const updateUser = async (
  userId: string,
  updates: Partial<Omit<UserDoc, 'uid'>>,
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete user document from Firestore
 * Note: Deleting the Auth user itself requires a server-side operation
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<UserDoc> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return toUser(userDoc);
    }
    throw new Error('User not found');
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};
