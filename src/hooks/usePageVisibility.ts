import { useState, useEffect } from "react";

/**
 * Returns true when the page/tab is visible, false when hidden.
 * Useful for pausing polling when the user switches tabs.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}
