import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch all ranks from Firestore
 * @returns {Promise<Array>} Array of rank objects with id
 */
export const getAllRanks = async () => {
  try {
    const ranksRef = collection(db, 'ranks');
    const q = query(ranksRef, orderBy('requiredScore', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const ranks = [];
    querySnapshot.forEach((doc) => {
      ranks.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return ranks;
  } catch (error) {
    console.error('Error fetching ranks:', error);
    throw error;
  }
};

/**
 * Get rank by ID
 * @param {string} rankId - Rank ID
 * @returns {Promise<Object>} Rank object
 */
export const getRankById = async (rankId) => {
  try {
    const rankRef = doc(db, 'ranks', rankId);
    const rankDoc = await getDoc(rankRef);
    
    if (rankDoc.exists()) {
      return {
        id: rankDoc.id,
        ...rankDoc.data(),
      };
    } else {
      throw new Error('Rank not found');
    }
  } catch (error) {
    console.error('Error fetching rank:', error);
    throw error;
  }
};

/**
 * Create a new rank
 * @param {Object} rankData - Rank data (name, requiredScore, icon, color, description)
 * @returns {Promise<string>} Created rank ID
 */
export const createRank = async (rankData) => {
  try {
    const ranksRef = collection(db, 'ranks');
    const docRef = await addDoc(ranksRef, {
      ...rankData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating rank:', error);
    throw error;
  }
};

/**
 * Update rank data
 * @param {string} rankId - Rank ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<void>}
 */
export const updateRank = async (rankId, updates) => {
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
 * @param {string} rankId - Rank ID
 * @returns {Promise<void>}
 */
export const deleteRank = async (rankId) => {
  try {
    const rankRef = doc(db, 'ranks', rankId);
    await deleteDoc(rankRef);
  } catch (error) {
    console.error('Error deleting rank:', error);
    throw error;
  }
};
