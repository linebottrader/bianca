/**
 * Universal safe-save wrapper for admin operations.
 * Validates session, handles timeouts and JWT errors.
 * Does NOT call refreshSession() — relies on Supabase autoRefreshToken.
 * On auth error: retries once after a single controlled refresh.
 */
import { supabase } from "@/integrations/supabase/client";

const SAVE_TIMEOUT = 15_000; // 15s
const AUTH_RECOVERY_TIMEOUT = 5_000; // 5s

/**
 * Checks if session exists (no refresh, no reload).
 */
async function hasValidSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    return !error && !!data?.session;
  } catch {
    return false;
  }
}

async function refreshSessionWithTimeout() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout ao recuperar sessão")), AUTH_RECOVERY_TIMEOUT);
  });

  try {
    const result = await Promise.race([supabase.auth.refreshSession(), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Wraps any save operation with session check + timeout + retry-on-auth-error.
 */
export async function safeSave<T = any>(
  fn: () => Promise<{ data: T; error: any }>,
  options?: {
    toastFn?: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
    operation?: string;
    timeoutMs?: number;
  }
): Promise<T | null> {
  const { toastFn, operation = "Salvar", timeoutMs = SAVE_TIMEOUT } = options || {};

  // 1. Quick session check (no refresh)
  const valid = await hasValidSession();
  if (!valid) {
    console.warn("[safeSave] Sessão inválida");
    toastFn?.({
      title: "Sessão expirada",
      description: "Faça login novamente para continuar.",
      variant: "destructive",
    });
    return null;
  }

  // 2. Execute with timeout
  const execute = async (): Promise<{ data: T; error: any }> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout: operação demorou demais")), timeoutMs);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]) as { data: T; error: any };
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    const result = await execute();

    if (result?.error) {
      const msg = result.error.message ?? "";
      const isAuthError = msg.includes("JWT") || result.error.code === "PGRST301";

      if (isAuthError) {
        // Single retry: refresh token once (with timeout), then retry the operation
        console.warn("[safeSave] Auth error, tentando refresh único...");
        try {
          const { error: refreshErr } = await refreshSessionWithTimeout();
          if (refreshErr) throw refreshErr;

          const retryResult = await execute();
          if (retryResult?.error) throw retryResult.error;
          return retryResult?.data ?? (null as any);
        } catch (retryErr: any) {
          console.error("[safeSave] Retry falhou:", retryErr);
          toastFn?.({
            title: "Sessão expirada",
            description: "Faça login novamente.",
            variant: "destructive",
          });
          return null;
        }
      }

      throw result.error;
    }

    return result?.data ?? (null as any);
  } catch (err: any) {
    const message = err?.message || "Erro desconhecido";
    console.error(`[safeSave] ${operation}:`, message, err);

    if (toastFn) {
      toastFn({
        title: `Erro: ${operation}`,
        description: message,
        variant: "destructive",
      });
    }

    return null;
  }
}
