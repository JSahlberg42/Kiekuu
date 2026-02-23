import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export const submitFeedback = async (feedback) => {
  const feedbackRef = collection(db, 'feedback');
  const payload = {
    ...feedback,
    createdAt: new Date().toISOString(),
    aiStatus: 'pending',
  };

  const docRef = await addDoc(feedbackRef, payload);
  return docRef.id;
};
