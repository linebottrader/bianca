import { useState, useMemo, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useMenuItems, useCategories, type DBMenuItem } from "@/hooks/useStoreData";
import StoreHeader from "@/components/delivery/StoreHeader";
import HeroBanner from "@/components/delivery/HeroBanner";
import CategoryNav from "@/components/delivery/CategoryNav";
import SearchBar from "@/components/delivery/SearchBar";
import ProductCard from "@/components/delivery/ProductCard";
import CartSidebar from "@/components/delivery/CartSidebar";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { ShoppingCart, Megaphone } from "lucide-react";
import OrderTracker from "@/components/delivery/OrderTracker";
import BirthdayBanner from "@/components/delivery/BirthdayBanner";
import MenuSectionsPremium from "@/components/delivery/MenuSectionsPremium";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useGA4 } from "@/hooks/useGA4";

const ProductModal = lazy(() => import("@/components/delivery/ProductModal"));

const INITIAL_VISIBLE = 6;

const MobileCartButton = ({ onClick }: { onClick: () => void }) => {
  const { totalItems, totalPrice } = useCart();
  if (totalItems === 0) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between p-4 shadow-xl lg:hidden"
      style={{ borderRadius: "var(--d-btn-radius)", background: "var(--d-btn-primary-bg)", color: "var(--d-btn-primary-text)" }}
    >
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        <span className="font-bold">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
      </div>
      <span className="font-bold">R$ {totalPrice.toFixed(2)}</span>
    </button>
  );
};

const DeliveryContent = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<DBMenuItem | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { data: bannerPromo } = useQuery({
    queryKey: ["promocoes-config"],
    staleTime: 30_000,
    gcTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from("promocoes_config").select("banner_promo").limit(1).maybeSingle();
      return (data?.banner_promo as { ativo: boolean; texto: string; cupom_codigo: string } | null) ?? null;
    },
  });

  const navigate = useNavigate();
  const { trackEvent, trackVisit } = useAnalytics();
  useGA4();

  // Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { data } = await supabase.from("maintenance_mode").select("is_active").limit(1).single();
        if (data?.is_active) {
          navigate("/maintenance", { replace: true });
        }
      } catch {}
    };
    checkMaintenance();
  }, [navigate]);

  // Track visit on mount
  useEffect(() => { trackVisit(); }, [trackVisit]);

  const { data: menuItems = [], isLoading: itemsLoading, isError: itemsError, refetch: refetchItems } = useMenuItems();
  const { data: categories = [], isError: categoriesError, refetch: refetchCategories } = useCategories();

  // Safety timeout: never show skeleton forever
  useEffect(() => {
    if (!itemsLoading) return;
    const t = setTimeout(() => setLoadingTimeout(true), 8000);
    return () => clearTimeout(t);
  }, [itemsLoading]);

  const filteredItems = useMemo(() => {
    if (!search) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }, [search, menuItems]);

  const handleCategoryChange = useCallback((id: string) => {
    setActiveCategory(id);
    setShowAll(true);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const visibleCategories = useMemo(() => {
    return categories.filter((c) => c.visivel !== false);
  }, [categories]);

  const groupedItems = useMemo(() => {
    return visibleCategories
      .map((cat) => ({
        ...cat,
        items: filteredItems.filter((i) => i.category_id === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredItems, visibleCategories]);

  const visibleGroups = useMemo(() => {
    if (showAll || search) return groupedItems;

    let count = 0;
    const limited: typeof groupedItems = [];
    for (const group of groupedItems) {
      const remaining = INITIAL_VISIBLE - count;
      if (remaining <= 0) break;
      if (group.items.length <= remaining) {
        limited.push(group);
        count += group.items.length;
      } else {
        limited.push({ ...group, items: group.items.slice(0, remaining) });
        count += remaining;
      }
    }
    return limited;
  }, [groupedItems, showAll, search]);

  const hasMoreItems = !showAll && !search && groupedItems.reduce((sum, g) => sum + g.items.length, 0) > INITIAL_VISIBLE;

  const showSkeleton = itemsLoading && !loadingTimeout;
  const showError = itemsError || categoriesError || (loadingTimeout && itemsLoading);

  const handleRetry = () => {
    setLoadingTimeout(false);
    refetchItems();
    refetchCategories();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--d-bg-body)", backgroundImage: "var(--d-bg-image, none)", backgroundSize: "cover", backgroundAttachment: "fixed", fontFamily: "var(--d-font-family)", fontSize: "var(--d-text-size)" }}>
      <StoreHeader onCartClick={() => setShowMobileCart(true)} />
      <BirthdayBanner />
      <HeroBanner />
      <CategoryNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} categories={visibleCategories} />

      <div className="container mt-2">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Promo Banner */}
      {bannerPromo?.ativo && bannerPromo.texto && (
        <div className="container mt-2">
          <div
            className={`rounded-lg border p-3 text-center text-sm flex items-center justify-center gap-2 ${(bannerPromo as any).animacao_pulsar ? "animate-pulse" : ""}`}
            style={{
              background: (bannerPromo as any).cor_fundo || "#FEF3C7",
              color: (bannerPromo as any).cor_texto || "#92400E",
              borderColor: (bannerPromo as any).cor_borda || "#F59E0B",
            }}
          >
            <Megaphone className="h-4 w-4 shrink-0" />
            <span>{bannerPromo.texto}</span>
          </div>
        </div>
      )}

      {/* Premium Sections */}
      <MenuSectionsPremium onProductClick={setSelectedItem} />

      <main className="container py-4">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">

            {showSkeleton ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-3 animate-pulse">
                    <div className="h-24 w-24 shrink-0 rounded-lg bg-muted sm:h-28 sm:w-28" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-5 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-full rounded bg-muted" />
                      <div className="h-4 w-20 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : showError ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Não foi possível carregar o cardápio.</p>
                <button
                  onClick={handleRetry}
                  className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground"
                >
                  Recarregar página
                </button>
              </div>
            ) : (
              <>
                {visibleGroups.map((group) => (
                  <section
                    key={group.id}
                    ref={(el: HTMLDivElement | null) => { sectionRefs.current[group.id] = el; }}
                    className="scroll-mt-20"
                  >
                    <div className="rounded-lg py-2.5 text-center" style={{ background: "var(--d-color-secondary)" }}>
                      <h2 className="text-xl tracking-widest" style={{ color: "var(--d-btn-secondary-text)" }}>
                        {group.name}
                      </h2>
                    </div>
                    <div className="mt-3 space-y-3">
                      {group.items.map((item) => (
                        <ProductCard key={item.id} item={item} onClick={setSelectedItem} />
                      ))}
                    </div>
                  </section>
                ))}

                {hasMoreItems && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => setShowAll(true)}
                      className="px-6 py-3 font-bold transition hover:opacity-90"
                      style={{ borderRadius: "var(--d-btn-radius)", background: "var(--d-btn-primary-bg)", color: "var(--d-btn-primary-text)" }}
                    >
                      Ver cardápio completo
                    </button>
                  </div>
                )}

                {visibleGroups.length === 0 && (
                  <p className="py-12 text-center text-muted-foreground">
                    Nenhum item encontrado.
                  </p>
                )}
              </>
            )}
          </div>

          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-20">
              <CartSidebar />
            </div>
          </aside>
        </div>
      </main>

      <MobileCartButton onClick={() => setShowMobileCart(true)} />

      {showMobileCart && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowMobileCart(false)}>
          <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm" />
          <div
            className="fixed bottom-0 left-0 right-0 z-10 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="font-display text-xl">Carrinho</h2>
              <button onClick={() => setShowMobileCart(false)} className="text-muted-foreground hover:text-foreground text-sm">
                Fechar
              </button>
            </div>
            <CartSidebar />
          </div>
        </div>
      )}

      {selectedItem && (
        <Suspense fallback={null}>
          <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        </Suspense>
      )}

      <OrderTracker />
    </div>
  );
};

const Index = () => {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        <DeliveryContent />
      </CartProvider>
    </CustomerAuthProvider>
  );
};

export default Index;
