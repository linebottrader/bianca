import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "analytics_session_id";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

let visitTracked = false;

export function useAnalytics() {
  const debounceRef = useRef<Record<string, number>>({});

  const trackEvent = useCallback(
    (eventType: string, metadata: Record<string, any> = {}, debounceMs = 0) => {
      if (debounceMs > 0) {
        const now = Date.now();
        const key = `${eventType}_${JSON.stringify(metadata)}`;
        if (debounceRef.current[key] && now - debounceRef.current[key] < debounceMs) return;
        debounceRef.current[key] = now;
      }

      const sessionId = getSessionId();
      const deviceType = getDeviceType();

      // Fire-and-forget insert
      supabase
        .from("analytics_events" as any)
        .insert({
          event_type: eventType,
          session_id: sessionId,
          device_type: deviceType,
          metadata,
        } as any)
        .then(({ error }) => {
          if (error) console.warn("[Analytics] insert error:", error.message);
        });

      // Also send to GA4 if available
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", eventType, metadata);
      }
    },
    []
  );

  const trackVisit = useCallback(() => {
    if (visitTracked) return;
    visitTracked = true;
    trackEvent("visit", { referrer: document.referrer || "direct" });
  }, [trackEvent]);

  return { trackEvent, trackVisit };
}
