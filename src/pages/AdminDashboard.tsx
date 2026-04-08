import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { prefetchAdminData, prefetchTabData } from "@/utils/prefetch";
import { useSystemStatus } from "@/hooks/useSystemHealth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Store, ExternalLink, QrCode, MapPin, Palette, Truck, Printer, Shield, UtensilsCrossed, ChefHat, Mail, Tag, Cake, BarChart3, Users, Star, WifiOff, RefreshCw } from "lucide-react";

const AdminStoreConfig = lazy(() => import("@/components/admin/AdminStoreConfig"));
const AdminCardapio = lazy(() => import("@/components/admin/AdminCardapio"));
const AdminPixConfig = lazy(() => import("@/components/admin/AdminPixConfig"));
const AdminFreteConfig = lazy(() => import("@/components/admin/AdminFreteConfig"));
const AdminDesignEditor = lazy(() => import("@/components/admin/AdminDesignEditor"));
const AdminExpedicao = lazy(() => import("@/components/admin/AdminExpedicao"));
const AdminPrinterConfig = lazy(() => import("@/components/admin/AdminPrinterConfig"));
const AdminControlCenter = lazy(() => import("@/components/admin/AdminControlCenter"));
const AdminKDSConfig = lazy(() => import("@/components/admin/AdminKDSConfig"));
const AdminSmtpConfig = lazy(() => import("@/components/admin/AdminSmtpConfig"));
const AdminPromocoes = lazy(() => import("@/components/admin/AdminPromocoes"));
const AdminAniversariantes = lazy(() => import("@/components/admin/AdminAniversariantes"));
const AdminDesempenho = lazy(() => import("@/components/admin/AdminDesempenho"));
const AdminClientes = lazy(() => import("@/components/admin/AdminClientes"));
const AdminAvaliacoes = lazy(() => import("@/components/admin/AdminAvaliacoes"));

const TabFallback = () => (
  <div className="flex justify-center py-12">
    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const systemStatus = useSystemStatus();
  const [activeTab, setActiveTab] = useState("expedicao");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["expedicao"]));

  // Prefetch critical data on mount
  useEffect(() => {
    if (user && isAdmin) {
      prefetchAdminData(queryClient);
    }
  }, [user, isAdmin, queryClient]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  const handleTabHover = useCallback((tab: string) => {
    prefetchTabData(queryClient, tab);
  }, [queryClient]);

  // Handle session expiry: redirect to login
  useEffect(() => {
    if (systemStatus === "expired") {
      console.warn("[AdminDashboard] Sessão expirada, redirecionando...");
      navigate("/admin/login");
    }
  }, [systemStatus, navigate]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, loading, navigate]);

  // When recovering from degraded, invalidate stale queries
  useEffect(() => {
    if (systemStatus === "ok") {
      // Refresh critical data when connection is restored
      queryClient.invalidateQueries({ queryKey: ["admin-pedidos"] });
    }
  }, [systemStatus, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Connection status banner */}
      {(systemStatus === "degraded" || systemStatus === "recovering") && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span>Reconectando ao servidor...</span>
          <RefreshCw className="h-3 w-3 animate-spin" />
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-3">
          <div>
            <h1 className="font-display text-2xl tracking-wider">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ExternalLink className="mr-1 h-3 w-3" /> Ver Loja
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/admin/login");
              }}
            >
              <LogOut className="mr-1 h-3 w-3" /> Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container py-6">
        <Tabs className="space-y-6" onValueChange={handleTabChange} value={activeTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="aniversariantes" className="flex items-center gap-1.5">
              <Cake className="h-4 w-4" />
              <span className="hidden sm:inline">Aniversariantes</span>
            </TabsTrigger>
            <TabsTrigger value="expedicao" className="flex items-center gap-1.5">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Expedição</span>
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Loja</span>
            </TabsTrigger>
            <TabsTrigger value="cardapio" className="flex items-center gap-1.5" onMouseEnter={() => handleTabHover("cardapio")}>
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Cardápio</span>
            </TabsTrigger>
            <TabsTrigger value="promocoes" className="flex items-center gap-1.5" onMouseEnter={() => handleTabHover("promocoes")}>
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Promoções</span>
            </TabsTrigger>
            <TabsTrigger value="pix" className="flex items-center gap-1.5">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">PIX</span>
            </TabsTrigger>
            <TabsTrigger value="frete" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Frete</span>
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
            <TabsTrigger value="impressora" className="flex items-center gap-1.5">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Impressora</span>
            </TabsTrigger>
            <TabsTrigger value="controle" className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Centro de Controle</span>
            </TabsTrigger>
            <TabsTrigger value="cozinha" className="flex items-center gap-1.5">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Cozinha</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="desempenho" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">📊 Desempenho</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-1.5" onMouseEnter={() => handleTabHover("clientes")}>
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">👥 Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="avaliacoes" className="flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">⭐ Avaliações</span>
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<TabFallback />}>
            {visitedTabs.has("aniversariantes") && (
              <TabsContent value="aniversariantes" forceMount className={activeTab !== "aniversariantes" ? "hidden" : ""}>
                <AdminAniversariantes />
              </TabsContent>
            )}
            {visitedTabs.has("expedicao") && (
              <TabsContent value="expedicao" forceMount className={activeTab !== "expedicao" ? "hidden" : ""}>
                <AdminExpedicao />
              </TabsContent>
            )}
            {visitedTabs.has("store") && (
              <TabsContent value="store" forceMount className={activeTab !== "store" ? "hidden" : ""}>
                <AdminStoreConfig />
              </TabsContent>
            )}
            {visitedTabs.has("cardapio") && (
              <TabsContent value="cardapio" forceMount className={activeTab !== "cardapio" ? "hidden" : ""}>
                <AdminCardapio />
              </TabsContent>
            )}
            {visitedTabs.has("pix") && (
              <TabsContent value="pix" forceMount className={activeTab !== "pix" ? "hidden" : ""}>
                <AdminPixConfig />
              </TabsContent>
            )}
            {visitedTabs.has("promocoes") && (
              <TabsContent value="promocoes" forceMount className={activeTab !== "promocoes" ? "hidden" : ""}>
                <AdminPromocoes />
              </TabsContent>
            )}
            {visitedTabs.has("frete") && (
              <TabsContent value="frete" forceMount className={activeTab !== "frete" ? "hidden" : ""}>
                <AdminFreteConfig />
              </TabsContent>
            )}
            {visitedTabs.has("design") && (
              <TabsContent value="design" forceMount className={activeTab !== "design" ? "hidden" : ""}>
                <AdminDesignEditor />
              </TabsContent>
            )}
            {visitedTabs.has("impressora") && (
              <TabsContent value="impressora" forceMount className={activeTab !== "impressora" ? "hidden" : ""}>
                <AdminPrinterConfig />
              </TabsContent>
            )}
            {visitedTabs.has("controle") && (
              <TabsContent value="controle" forceMount className={activeTab !== "controle" ? "hidden" : ""}>
                <AdminControlCenter />
              </TabsContent>
            )}
            {visitedTabs.has("cozinha") && (
              <TabsContent value="cozinha" forceMount className={activeTab !== "cozinha" ? "hidden" : ""}>
                <AdminKDSConfig />
              </TabsContent>
            )}
            {visitedTabs.has("email") && (
              <TabsContent value="email" forceMount className={activeTab !== "email" ? "hidden" : ""}>
                <AdminSmtpConfig />
              </TabsContent>
            )}
            {visitedTabs.has("desempenho") && (
              <TabsContent value="desempenho" forceMount className={activeTab !== "desempenho" ? "hidden" : ""}>
                <AdminDesempenho />
              </TabsContent>
            )}
            {visitedTabs.has("clientes") && (
              <TabsContent value="clientes" forceMount className={activeTab !== "clientes" ? "hidden" : ""}>
                <AdminClientes />
              </TabsContent>
            )}
            {visitedTabs.has("avaliacoes") && (
              <TabsContent value="avaliacoes" forceMount className={activeTab !== "avaliacoes" ? "hidden" : ""}>
                <AdminAvaliacoes />
              </TabsContent>
            )}
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
