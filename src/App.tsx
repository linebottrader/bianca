import React, { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { useSystemHealth } from "./hooks/useSystemHealth";
import ThemeApplier from "./components/ThemeApplier";
import ErrorBoundary from "./components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage"));

const PagamentoSucesso = lazy(() => import("./pages/PagamentoStatus").then(m => ({ default: m.PagamentoSucesso })));
const PagamentoErro = lazy(() => import("./pages/PagamentoStatus").then(m => ({ default: m.PagamentoErro })));
const PagamentoPendente = lazy(() => import("./pages/PagamentoStatus").then(m => ({ default: m.PagamentoPendente })));
const PedidoConfirmado = lazy(() => import("./pages/PedidoConfirmado"));
const KDS = lazy(() => import("./pages/KDS"));
const ResetarSenha = lazy(() => import("./pages/ResetarSenha"));
const ResetarSenhaAdmin = lazy(() => import("./pages/ResetarSenhaAdmin"));
const Expedicao = lazy(() => import("./pages/Expedicao"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "always",
    },
  },
});

/**
 * SessionGuard: validates session on mount.
 * Does NOT sign out aggressively on transient auth issues.
 * No window.location.reload().
 */
const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("SessionGuard: unable to validate session", error);
        } else if (session && !session.access_token) {
          console.warn("SessionGuard: session without access token detected");
        }
      } catch (err) {
        console.error("SessionGuard error:", err);
      } finally {
        if (mounted) setReady(true);
      }
    };

    validate();

    // Listen for auth events — log only, no aggressive actions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") {
        console.info("[SessionGuard] ✅ Token renovado");
      }
      if (event === "SIGNED_OUT") {
        console.info("[SessionGuard] Sessão encerrada");
        // Don't clear queryClient here — let individual pages/components handle redirect
      }
    });

    // Hard timeout - never block the app
    const t = setTimeout(() => {
      if (mounted) setReady(true);
    }, 3000);

    return () => { mounted = false; clearTimeout(t); subscription.unsubscribe(); };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
};

const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  useRealtimeSync();
  useSystemHealth();
  return <>{children}</>;
};

const LazyFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SessionGuard>
        <RealtimeProvider>
          <ThemeApplier />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
                  <Route path="/pagamento/erro" element={<PagamentoErro />} />
                  <Route path="/pagamento/pendente" element={<PagamentoPendente />} />
                  <Route path="/pedido-confirmado" element={<PedidoConfirmado />} />
                  <Route path="/kds" element={<KDS />} />
                  <Route path="/resetar-senha" element={<ResetarSenha />} />
                  <Route path="/resetar-senha-admin" element={<ResetarSenhaAdmin />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/expedicao" element={<Expedicao />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </RealtimeProvider>
      </SessionGuard>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
