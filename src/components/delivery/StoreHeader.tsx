import { useState, useEffect } from "react";
import { useStoreConfig } from "@/hooks/useStoreData";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/contexts/CartContext";
import { useCustomer } from "@/contexts/CustomerAuthContext";
import { useReviewStats } from "@/hooks/useReviews";
import { Star, ShoppingCart, MessageCircle, MapPin, Instagram, Facebook, Clock, User, LogOut, ClipboardList } from "lucide-react";
import CustomerAuthModal from "./CustomerAuthModal";
import OrderHistoryModal from "./OrderHistoryModal";
import ReviewsDisplayModal from "./ReviewsDisplayModal";

const StoreHeader = ({ onCartClick }: { onCartClick?: () => void }) => {
  const { totalItems } = useCart();
  const { data: config, isLoading, isError } = useStoreConfig();
  const { user, cliente, logout } = useCustomer();
  const [showAuth, setShowAuth] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [headerTimeout, setHeaderTimeout] = useState(false);
  const { average: reviewAvg, total: reviewTotal } = useReviewStats();
  const { isOpen, isPaused, countdownText, statusMessage: storeStatusMsg } = useStoreStatus();

  // Timeout to prevent infinite skeleton
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setHeaderTimeout(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading && !headerTimeout && !isError) {
    return (
      <header style={{ background: "var(--d-header-bg)", color: "var(--d-header-text)" }}>
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Fallback values if config didn't load
  const storeName = config?.name || "Loja";
  const statusMessage = config?.status_message || "";
  const rating = config?.rating ?? 5.0;
  const minimumOrder = config?.minimum_order ?? 0;
  const whatsapp = config?.whatsapp || "";
  const whatsappMessage = config?.whatsapp_message || "Olá";
  const logoUrl = config?.logo_url || "";
  const address = config?.address || "";
  const instagramUrl = config?.instagram_url || "";
  const facebookUrl = config?.facebook_url || "";
  const showAddress = config?.show_address ?? true;
  const showInstagram = config?.show_instagram ?? true;
  const showFacebook = config?.show_facebook ?? true;
  const estimatedTime = config?.delivery_estimated_time || "";

  const hasPublicInfo = (showAddress && address) || (showInstagram && instagramUrl) || (showFacebook && facebookUrl);

  return (
    <>
    <header className="relative z-40" style={{ background: "var(--d-header-bg)", color: "var(--d-header-text)" }}>
      <div className="container py-3">
        {/* Row 1: Logo + Name + Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={storeName}
                className="h-10 sm:h-16 w-auto object-contain shrink-0"
                width={64}
                height={64}
                fetchPriority="high"
              />
            )}
            <h1 className="text-base sm:text-2xl tracking-wider line-clamp-1">{storeName}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {user ? (
              <>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-2 text-xs font-semibold transition hover:opacity-80"
                  style={{ background: "var(--d-header-badge-bg)", color: "var(--d-header-badge-text)" }}
                  title="Meus Pedidos"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Pedidos</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-2 text-xs transition hover:opacity-80"
                  style={{ color: "var(--d-header-text)" }}
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-xs font-semibold transition hover:opacity-80"
                style={{ background: "var(--d-header-badge-bg)", color: "var(--d-header-badge-text)" }}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}
            {whatsapp && (
              <a
                href={`https://api.whatsapp.com/send?phone=${whatsapp}&text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ background: "#25d366", color: "#fff" }}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            <button onClick={onCartClick} className="relative lg:hidden">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {totalItems > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "var(--d-color-primary)", color: "var(--d-btn-primary-text)" }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Status info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm">
          {statusMessage && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: "var(--d-header-badge-bg)",
                color: "var(--d-header-badge-text)",
              }}
            >
              {statusMessage}
            </span>
          )}
          <button
            onClick={() => setShowReviews(true)}
            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: "var(--d-color-primary)" }}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>{reviewTotal > 0 ? reviewAvg.toFixed(1) : (rating)}</span>
            {reviewTotal > 0 && (
              <span className="text-xs" style={{ color: "var(--d-header-text)", opacity: 0.7 }}>
                ({reviewTotal} {reviewTotal === 1 ? "avaliação" : "avaliações"})
              </span>
            )}
          </button>
          {estimatedTime && (
            <span className="flex items-center gap-1" style={{ color: "var(--d-header-text)" }}>
              <Clock className="h-3.5 w-3.5" />
              {estimatedTime}
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--d-header-text)", opacity: 0.8 }}>
            Pedido mínimo: <strong>R$ {minimumOrder.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      {hasPublicInfo && (
        <div className="container flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-xs" style={{ color: "var(--d-header-text)", opacity: 0.9 }}>
          {showAddress && address && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition hover:opacity-70">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[220px] sm:max-w-none">{address}</span>
            </a>
          )}
          {showInstagram && instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition hover:opacity-70">
              <Instagram className="h-3.5 w-3.5" />
              <span>Instagram</span>
            </a>
          )}
          {showFacebook && facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition hover:opacity-70">
              <Facebook className="h-3.5 w-3.5" />
              <span>Facebook</span>
            </a>
          )}
        </div>
      )}

      {!isOpen && (
        <div
          className="text-center py-2 px-4 text-sm font-semibold"
          style={{
            background: isPaused ? "rgba(234, 179, 8, 0.9)" : "rgba(220, 38, 38, 0.9)",
            color: "#fff",
          }}
        >
          <span>{isPaused ? "⏸ " : "🔴 "}{storeStatusMsg || "Loja fechada no momento"}</span>
          {countdownText && (
            <span className="ml-2">⏳ {countdownText}</span>
          )}
        </div>
      )}
      <OrderHistoryModal open={showHistory} onOpenChange={setShowHistory} />
      <ReviewsDisplayModal open={showReviews} onOpenChange={setShowReviews} />
    </header>
    {showAuth && <CustomerAuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
};

export default StoreHeader;
