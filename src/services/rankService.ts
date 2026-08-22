import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { Rank } from '../types/models';

type RankInput = Omit<Rank, 'id' | 'createdAt' | 'updatedAt'>;

const toRank = (docSnap: { id: string; data: () => Record<string, unknown> }): Rank =>
  ({ id: docSnap.id, ...docSnap.data() }) as Rank;

/**
 * Fetch all ranks from Firestore, sorted ascending by requiredScore
 */
export const getAllRanks = async (): Promise<Rank[]> => {
  try {
    const q = query(collection(db, 'ranks'), orderBy('requiredScore', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(toRank);
  } catch (error) {
    console.error('Error fetching ranks:', error);
    throw error;
  }
};

/**
 * Get rank by ID
 */
export const getRankById = async (rankId: string): Promise<Rank> => {
  try {
    const rankRef = doc(db, 'ranks', rankId);
    const rankDoc = await getDoc(rankRef);

    if (rankDoc.exists()) {
      return toRank(rankDoc);
    }
    throw new Error('Rank not found');
  } catch (error) {
    console.error('Error fetching rank:', error);
    throw error;
  }
};

/**
 * Create a new rank
 */
export const createRank = async (rankData: RankInput): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'ranks'), {
      ...rankData,
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating rank:', error);
    throw error;
  }
};

/**
 * Update rank data
 */
export const updateRank = async (
  rankId: string,
  updates: Partial<Omit<Rank, 'id'>>,
): Promise<void> => {
  try {
    const rankRef = doc(db, 'ranks', rankId);
    await updateDoc(rankRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating rank:', error);
    throw error;
  }
};

/**
 * Delete rank from Firestore
 */
export const deleteRank = async (rankId: string): Promise<void> => {
  try {
    const rankRef = doc(db, 'ranks', rankId);
    await deleteDoc(rankRef);
  } catch (error) {
    console.error('Error deleting rank:', error);
    throw error;
  }
};
