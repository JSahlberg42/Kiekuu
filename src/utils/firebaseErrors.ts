/** Helpers for narrowing unknown caught errors from Firebase SDK calls. */

export const firebaseErrorCode = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

export const firebaseErrorMessage = (err: unknown): string | undefined => {
  if (err instanceof Error && err.message) return err.message;
  return undefined;
};
