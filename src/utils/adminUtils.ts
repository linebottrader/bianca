/**
 * Admin Hardening Utilities
 * Provides timeout protection and standardized error handling for admin operations.
 */

const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within `ms`,
 * it rejects with a user-friendly message.
 */
export function withTimeout<T>(promiseLike: PromiseLike<T>, ms = DEFAULT_TIMEOUT): Promise<T> {
  const promise = Promise.resolve(promiseLike);
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operação demorou mais que o esperado. Tente novamente."));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Standardized error logging + toast notification.
 */
export function logAndToast(
  error: any,
  operation: string,
  toastFn: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void,
  context?: Record<string, any>
) {
  const message = error?.message || "Erro desconhecido";
  console.error(`[Admin] ${operation}:`, message, context || "", error);
  toastFn({
    title: `Erro: ${operation}`,
    description: message,
    variant: "destructive",
  });
}
