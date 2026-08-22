import { appCheckStatus } from '../services/firebase';

export interface NetworkInfo {
  onLine: boolean | null;
  visibilityState: string | null;
}

export const isFirestoreOfflineError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === 'unavailable' ||
    candidate.code === 'firestore/unavailable' ||
    (typeof candidate.message === 'string' && candidate.message.includes('offline'))
  );
};

export const getClientNetworkInfo = (): NetworkInfo => {
  if (typeof navigator === 'undefined') {
    return { onLine: null, visibilityState: null };
  }

  return {
    onLine: navigator.onLine,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : null,
  };
};

const isDiagnosticsEnabled = () => {
  if (import.meta.env.DEV) return true;
  const rawValue = import.meta.env.VITE_DIAGNOSTICS_ENABLED ?? import.meta.env.VITE_DIAGNOSTICS;
  return rawValue === 'true' || rawValue === '1';
};

export const logFirestoreErrorContext = (label: string, error: unknown): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }

  const networkInfo = getClientNetworkInfo();
  console.error(`[firestore] ${label}`, {
    code: typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined,
    message: error instanceof Error ? error.message : undefined,
    networkInfo,
    appCheck: appCheckStatus,
  });
};
