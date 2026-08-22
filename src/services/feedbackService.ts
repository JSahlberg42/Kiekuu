import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import type { SubmitFeedbackRequest, SubmitFeedbackResponse } from '../types/models';

export const submitFeedback = async (
  feedback: SubmitFeedbackRequest,
): Promise<SubmitFeedbackResponse> => {
  const functions = getFunctions(app);
  const submit = httpsCallable<SubmitFeedbackRequest, SubmitFeedbackResponse>(
    functions,
    'submitFeedback',
  );
  const result = await submit({
    rating: feedback.rating,
    message: feedback.message,
    publishApproved: feedback.publishApproved === true,
    publishNameApproved: feedback.publishNameApproved === true,
  });
  return result.data;
};
