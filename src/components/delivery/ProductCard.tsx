import { memo } from "react";
import type { DBMenuItem } from "@/hooks/useStoreData";

type Props = {
  item: DBMenuItem;
  onClick: (item: DBMenuItem) => void;
};

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

const ProductCard = memo(({ item, onClick }: Props) => {
  const hasOptions = item.options && item.options.length > 0 && item.options.some((o) => o.items.length > 0);
  const isUnavailable = item.disponivel === false;

  return (
    <button
      onClick={() => !isUnavailable && onClick(item)}
      className={`group flex w-full gap-4 p-3 text-left transition hover:shadow-lg ${isUnavailable ? "opacity-60 cursor-not-allowed" : ""}`}
      style={{
        borderRadius: "var(--d-card-radius)",
        background: "var(--d-card-bg)",
        boxShadow: "var(--d-card-shadow)",
        border: "1px solid var(--d-cart-border-color)",
      }}
      disabled={isUnavailable}
    >
      <div
        className="product-img-container relative shrink-0 overflow-hidden self-center"
        style={{
          width: "var(--d-product-img-width, 96px)",
          height: "var(--d-product-img-height, 96px)",
          borderRadius: "var(--d-product-img-radius, 8px)",
        }}
      >
        <img
          src={item.image_url}
          alt={item.name}
          className="h-full w-full object-cover transition product-img"
          loading="lazy"
          decoding="async"
          width={112}
          height={112}
        />
        {item.badges && item.badges.length > 0 && (
          <div className="absolute left-0 top-0 flex flex-col gap-0.5 z-10">
            {item.badges.map((badge) => (
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
        {isUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20" style={{ borderRadius: "var(--d-product-img-radius, 8px)" }}>
            <span className="px-2 py-1 text-[11px] font-bold text-white bg-orange-500 rounded">Indisponível</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between py-1 min-w-0 overflow-hidden">
        <div className="min-w-0">
          <h3
            className="font-display tracking-wide line-clamp-2"
            style={{ color: "var(--d-card-title-color)", fontSize: "var(--d-card-title-size, 1rem)", lineHeight: "1.3" }}
          >
            {item.name}
          </h3>
          <p
            className="mt-2 line-clamp-4 break-words"
            style={{ color: "var(--d-card-desc-color)", fontSize: "var(--d-card-desc-size, 0.875rem)", lineHeight: "1.4" }}
          >
            {item.description}
          </p>
        </div>
        <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
          {hasOptions ? (
             <span className="font-bold whitespace-nowrap" style={{ color: "var(--d-price-color)", fontSize: "var(--d-price-size, 0.875rem)", lineHeight: "1.3" }}>
               A partir de R$ {item.price.toFixed(2)}
             </span>
          ) : (
            <>
               <span className="font-bold whitespace-nowrap" style={{ color: "var(--d-price-color)", fontSize: "var(--d-price-size, 0.875rem)", lineHeight: "1.3" }}>
                 R$ {item.price.toFixed(2)}
               </span>
              {item.original_price && (
                <span className="line-through whitespace-nowrap" style={{ color: "var(--d-color-text-light)", fontSize: "calc(var(--d-price-size, 0.875rem) * 0.8)" }}>
                  R$ {item.original_price.toFixed(2)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
