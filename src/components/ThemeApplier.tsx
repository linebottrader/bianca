import { useEffect } from "react";
import { useStoreConfig } from "@/hooks/useStoreData";
import { applyDesignTokens } from "@/hooks/useDesignTokens";

/**
 * Reads design tokens from store_config and applies them as CSS variables.
 * Renders nothing — purely a side-effect component.
 */
const ThemeApplier = () => {
  const { data: config } = useStoreConfig();

  useEffect(() => {
    if (config) {
      applyDesignTokens(config as any);
    }
  }, [config]);

  return null;
};

export default ThemeApplier;
