import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

export const submitFeedback = async (feedback) => {
  const functions = getFunctions(app);
  const submit = httpsCallable(functions, 'submitFeedback');
  const result = await submit({
    rating: feedback.rating,
    message: feedback.message,
    publishApproved: feedback.publishApproved === true,
    publishNameApproved: feedback.publishNameApproved === true,
  });
  return result.data;
};
