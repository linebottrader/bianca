import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AdminExpedicao = lazy(() => import("@/components/admin/AdminExpedicao"));

const LazyFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export default function Expedicao() {
  const { user, isAdmin, isManager, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Verificando acesso à Expedição...
      </div>
    );
  }

  if (!user || (!isAdmin && !isManager)) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Suspense fallback={<LazyFallback />}>
        <AdminExpedicao />
      </Suspense>
    </div>
  );
}
