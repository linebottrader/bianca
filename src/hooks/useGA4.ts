import { useEffect } from "react";
import { useStoreConfig } from "@/hooks/useStoreData";

let ga4Loaded = false;

export function useGA4() {
  const { data: config } = useStoreConfig();
  const measurementId = (config as any)?.ga4_measurement_id;

  useEffect(() => {
    if (!measurementId || ga4Loaded) return;
    ga4Loaded = true;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function () {
      (window as any).dataLayer.push(arguments);
    };
    (window as any).gtag("js", new Date());
    (window as any).gtag("config", measurementId);
  }, [measurementId]);
}
