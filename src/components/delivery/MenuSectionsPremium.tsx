import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DBMenuItem } from "@/hooks/useStoreData";
import { ChevronLeft, ChevronRight } from "lucide-react";

const badgeLabels: Record<string, string> = {
  promo: "Promoção!",
  new: "Novidade!",
  best: "+ Vendido!",
};

const badgeColors: Record<string, string> = {
  promo: "#DC2626",
  new: "#16A34A",
  best: "#2563EB",
};

type PremiumSection = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  sort_order: number;
  auto_scroll: boolean;
  speed: number;
  product_image_size: string;
};

type SectionWithProducts = PremiumSection & { products: DBMenuItem[] };

const IMAGE_SIZES: Record<string, string> = {
  small: "100px",
  medium: "140px",
  large: "180px",
};

type CardProps = { product: DBMenuItem; imageSize: string; onClick: (item: DBMenuItem) => void };

const PremiumCard = memo(({ product, imageSize, onClick }: CardProps) => (
  <button
    onClick={() => onClick(product)}
    className="flex-none snap-start overflow-hidden text-left transition hover:shadow-lg group"
    style={{
      borderRadius: "var(--d-card-radius)",
      background: "var(--d-card-bg)",
      boxShadow: "var(--d-card-shadow)",
      border: "1px solid var(--d-cart-border-color)",
      width: "calc(25% - 9px)",
      minWidth: "160px",
    }}
  >
    {product.image_url && (
      <div className="overflow-hidden relative" style={{ height: imageSize }}>
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {product.badges && product.badges.length > 0 && (
          <div className="absolute left-0 top-0 flex flex-col gap-0.5 z-10">
            {product.badges.map((badge) => (
              <span
                key={badge}
                className="px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: badgeColors[badge] || "var(--d-badge-bg)", color: "#fff" }}
              >
                {badgeLabels[badge] || badge}
              </span>
            ))}
          </div>
        )}
      </div>
    )}
    <div className="p-2.5">
      <h4 className="font-semibold text-sm line-clamp-2" style={{ color: "var(--d-card-title-color)" }}>
        {product.name}
      </h4>
      {product.description && (
        <p className="mt-0.5 text-xs line-clamp-2" style={{ color: "var(--d-card-desc-color)" }}>
          {product.description}
        </p>
      )}
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-bold text-sm" style={{ color: "var(--d-price-color)" }}>
          R$ {product.price.toFixed(2)}
        </span>
        {product.original_price && (
          <span className="line-through text-xs" style={{ color: "var(--d-color-text-light)" }}>
            R$ {product.original_price.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  </button>
));
PremiumCard.displayName = "PremiumCard";

const CarouselSection = ({ section, onProductClick }: { section: SectionWithProducts; onProductClick: (item: DBMenuItem) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const imgSize = IMAGE_SIZES[section.product_image_size] || IMAGE_SIZES.medium;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 5);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => { el.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [checkScroll, section.products]);

  useEffect(() => {
    if (!section.auto_scroll || !scrollRef.current) return;
    const el = scrollRef.current;
    const interval = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
      }
    }, section.speed);
    return () => clearInterval(interval);
  }, [section.auto_scroll, section.speed]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      {canLeft && (
        <button onClick={() => scroll("left")} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 shadow-md flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory px-1 pb-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--d-color-text-light) transparent" }}
      >
        {section.products.map((p) => (
          <PremiumCard key={p.id} product={p} imageSize={imgSize} onClick={onProductClick} />
        ))}
      </div>
      {canRight && (
        <button onClick={() => scroll("right")} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 shadow-md flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const GridSection = ({ section, onProductClick }: { section: SectionWithProducts; onProductClick: (item: DBMenuItem) => void }) => {
  const imgSize = IMAGE_SIZES[section.product_image_size] || IMAGE_SIZES.medium;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {section.products.map((p) => (
        <PremiumCard key={p.id} product={p} imageSize={imgSize} onClick={onProductClick} />
      ))}
    </div>
  );
};

type Props = { onProductClick: (item: DBMenuItem) => void };

export default function MenuSectionsPremium({ onProductClick }: Props) {
  const { data: sections = [] } = useQuery({
    queryKey: ["premium-sections"],
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async () => {
      const { data: secData } = await supabase
        .from("menu_sections_premium")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (!secData || secData.length === 0) return [];

      const { data: links } = await supabase
        .from("menu_section_products")
        .select("*")
        .order("position");
      if (!links) return [];

      const sectionIds = secData.map((s: any) => s.id);
      const productIds = [...new Set(links.filter((l: any) => sectionIds.includes(l.section_id)).map((l: any) => l.product_id))];
      if (productIds.length === 0) return [];

      const { data: products } = await supabase
        .from("menu_items")
        .select("*")
        .in("id", productIds)
        .eq("is_active", true)
        .eq("visivel", true)
        .eq("disponivel", true);
      if (!products) return [];

      const productMap = new Map((products as any[]).map((p) => [p.id, { ...p, price: Number(p.price), original_price: p.original_price ? Number(p.original_price) : null, badges: p.badges || [], disponivel: p.disponivel ?? true, visivel: p.visivel ?? true, options: [] }]));

      return (secData as any[])
        .map((sec) => {
          const secLinks = links.filter((l: any) => l.section_id === sec.id).sort((a: any, b: any) => a.position - b.position);
          const secProducts = secLinks.map((l: any) => productMap.get(l.product_id)).filter(Boolean) as DBMenuItem[];
          return { ...sec, products: secProducts } as SectionWithProducts;
        })
        .filter((s) => s.products.length > 0);
    },
  });

  if (sections.length === 0) return null;

  return (
    <div className="container py-4 space-y-5">
      {sections.map((section) => (
        <div key={section.id}>
          <div className="rounded-lg py-2 text-center mb-3" style={{ background: "var(--d-color-secondary)" }}>
            <h2 className="text-lg tracking-widest font-semibold" style={{ color: "var(--d-btn-secondary-text)" }}>
              {section.name}
            </h2>
          </div>
          {section.type === "carousel" ? (
            <CarouselSection section={section} onProductClick={onProductClick} />
          ) : (
            <GridSection section={section} onProductClick={onProductClick} />
          )}
        </div>
      ))}
    </div>
  );
}
