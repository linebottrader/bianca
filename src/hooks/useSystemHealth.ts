/**
 * Lightweight system health monitor.
 * - Heartbeat every 90s: pings DB for diagnostics only
 * - NO session refresh (delegated to Supabase autoRefreshToken)
 * - NO automatic page reload
 * - Exposes a reactive status for the admin UI
 */
import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 90_000; // 90s
const MAX_CONSECUTIVE_FAILURES = 3;

export type SystemStatus = "ok" | "degraded" | "recovering" | "expired";

// --- Global reactive store ---
let _status: SystemStatus = "ok";
const _listeners = new Set<() => void>();

function setSystemStatus(s: SystemStatus) {
  if (_status === s) return;
  _status = s;
  _listeners.forEach((fn) => fn());
}

function getSystemStatusSnapshot(): SystemStatus {
  return _status;
}

function subscribeSystemStatus(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

/** React hook to read system status reactively */
export function useSystemStatus(): SystemStatus {
  return useSyncExternalStore(subscribeSystemStatus, getSystemStatusSnapshot);
}

export function useSystemHealth() {
  const lastActivity = useRef(Date.now());
  const consecutiveFailures = useRef(0);

  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ["click", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    // Heartbeat: DB ping for diagnostics only — NO refresh, NO reload
    const heartbeat = setInterval(async () => {
      const idle = Date.now() - lastActivity.current;

      // If idle > 5 min, skip heartbeat entirely (saves resources)
      if (idle > 300_000) {
        console.info("[SystemHealth] Idle >5min, skipping heartbeat");
        return;
      }

      try {
        await supabase.from("store_config").select("id").limit(1).maybeSingle();
        // Success: reset failures
        if (consecutiveFailures.current > 0) {
          console.info("[SystemHealth] ✅ Conexão restaurada");
        }
        consecutiveFailures.current = 0;
        setSystemStatus("ok");
      } catch (err) {
        consecutiveFailures.current++;
        console.warn(
          `[SystemHealth] Heartbeat falhou (${consecutiveFailures.current}/${MAX_CONSECUTIVE_FAILURES})`,
          err
        );

        if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
          // Check if session actually exists before declaring expired
          try {
            const { data } = await supabase.auth.getSession();
            if (!data?.session) {
              console.warn("[SystemHealth] Sessão ausente após múltiplas falhas");
              setSystemStatus("expired");
            } else {
              setSystemStatus("degraded");
            }
          } catch {
            setSystemStatus("degraded");
          }
        } else {
          setSystemStatus("degraded");
        }
      }
    }, HEARTBEAT_INTERVAL);

    // Listen for auth state changes to detect real expiry
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Don't immediately assume expired — could be intentional logout
        // The AdminDashboard handles this via useAuth
        console.info("[SystemHealth] Auth event: SIGNED_OUT");
      }
      if (event === "TOKEN_REFRESHED") {
        console.info("[SystemHealth] ✅ Token renovado pelo Supabase");
        consecutiveFailures.current = 0;
        setSystemStatus("ok");
      }
    });

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(heartbeat);
      subscription.unsubscribe();
    };
  }, [updateActivity]);
}
