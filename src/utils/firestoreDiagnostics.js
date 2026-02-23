import { appCheckStatus } from '../services/firebase';

export const isFirestoreOfflineError = (error) => (
  error?.code === 'unavailable' ||
  error?.code === 'firestore/unavailable' ||
  error?.message?.includes('offline')
);

export const getClientNetworkInfo = () => {
  if (typeof navigator === 'undefined') {
    return { onLine: null, visibilityState: null };
  }

  return {
    onLine: navigator.onLine,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : null,
  };
};

export const logFirestoreErrorContext = (label, error) => {
  if (!import.meta.env.DEV && import.meta.env.VITE_DIAGNOSTICS !== 'true') {
    return;
  }

  const networkInfo = getClientNetworkInfo();
  console.error(`[firestore] ${label}`, {
    code: error?.code,
    message: error?.message,
    networkInfo,
    appCheck: appCheckStatus,
  });
};
