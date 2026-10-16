/** Readable message from a PocketBase / network error; aborted OAuth reads as cancelled. */
export function authErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as {
    isAbort?: boolean;
    message?: string;
    response?: { message?: string };
  };
  if (anyErr?.isAbort) return 'Sign-in was cancelled. The sign-in window was closed.';
  return anyErr?.response?.message || anyErr?.message || fallback;
}
