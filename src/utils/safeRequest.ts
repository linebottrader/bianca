/**
 * Safe Request Wrapper — provides timeout, JWT auto-recovery, and null fallback.
 * Does NOT break existing flows: returns null on failure instead of throwing.
 */
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TIMEOUT = 10_000;

/**
 * Ensures the current auth session is valid.
 * Returns true if OK, false if no session (triggers reload for logged-in flows).
 */
export async function ensureSession(reloadOnFail = false): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      console.warn("[ensureSession] Sessão inválida");
      if (reloadOnFail) window.location.reload();
      return false;
    }
    return true;
  } catch {
    console.warn("[ensureSession] Erro ao verificar sessão");
    if (reloadOnFail) window.location.reload();
    return false;
  }
}

/**
 * Wraps any async operation with timeout + JWT error detection.
 * On failure returns `null` so existing UI keeps working.
 */
export async function safeRequest<T>(
  fn: () => Promise<{ data: T; error: any }>,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    });

    const result = await Promise.race([fn(), timeoutPromise]) as { data: T; error: any };
    clearTimeout(timer);

    if (result?.error) {
      const msg = result.error.message ?? "";
      if (msg.includes("JWT") || result.error.code === "PGRST301") {
        console.warn("[safeRequest] JWT expirado, recarregando...");
        window.location.reload();
        return null;
      }
      console.error("[safeRequest] Erro:", msg);
      return null;
    }

    return result?.data ?? null;
  } catch (err: any) {
    clearTimeout(timer);
    console.error("[safeRequest] Erro controlado:", err?.message);
    return null;
  }
}
