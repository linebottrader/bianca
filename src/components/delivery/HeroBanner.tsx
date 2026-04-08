import { useState, useEffect } from "react";
import heroBanner from "@/assets/hero-banner.jpg";
import { useStoreConfig } from "@/hooks/useStoreData";

const HeroBanner = () => {
  const { data: config, isLoading } = useStoreConfig();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <div className="w-full animate-pulse bg-muted aspect-[16/5]" />
    );
  }

  const bannerUrl = config?.hero_image_url || heroBanner;
  const slogan = config?.slogan || "";
  const storeName = config?.name || "";

  return (
    <div className="relative w-full overflow-hidden">
      <img
        src={bannerUrl}
        alt={`Banner ${storeName}`}
        className="w-full h-auto block"
        fetchPriority="high"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, var(--d-banner-overlay), transparent)" }}
      />
      {slogan && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p
            className="mx-auto max-w-lg rounded-lg px-4 py-2 text-sm font-semibold italic backdrop-blur-sm"
            style={{ background: "var(--d-banner-button-bg)", color: "var(--d-banner-button-text)", opacity: 0.95 }}
          >
            {slogan}
          </p>
        </div>
      )}
    </div>
  );
};

export default HeroBanner;
