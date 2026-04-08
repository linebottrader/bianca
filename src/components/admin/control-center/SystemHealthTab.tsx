import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HealthMetric {
  label: string;
  value: string | number;
  status: "ok" | "warn" | "error";
}

export default function SystemHealthTab() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    const results: HealthMetric[] = [];
    try {
      // DB connection test
      const start = Date.now();
      const { error: dbErr } = await withTimeout(supabase.from("store_config").select("id").limit(1));
      const responseTime = Date.now() - start;
      results.push({
        label: "Conexão Banco de Dados",
        value: dbErr ? "Erro" : `OK (${responseTime}ms)`,
        status: dbErr ? "error" : responseTime > 3000 ? "warn" : "ok",
      });

      // Total orders
      const { count: totalPedidos } = await withTimeout(supabase.from("pedidos").select("*", { count: "exact", head: true }));
      results.push({ label: "Total de Pedidos", value: totalPedidos ?? 0, status: "ok" });

      // Pending payments
      const { count: pagPendentes } = await withTimeout(
        supabase.from("pagamentos").select("*", { count: "exact", head: true }).eq("status", "pendente")
      );
      results.push({
        label: "Pagamentos Pendentes",
        value: pagPendentes ?? 0,
        status: (pagPendentes ?? 0) > 10 ? "warn" : "ok",
      });

      // Orders with error status
      const { count: pedidosErro } = await withTimeout(
        supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("status", "erro")
      );
      results.push({
        label: "Pedidos com Erro",
        value: pedidosErro ?? 0,
        status: (pedidosErro ?? 0) > 0 ? "error" : "ok",
      });

      // Stuck orders (pending > 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: travados } = await withTimeout(
        supabase.from("pedidos").select("*", { count: "exact", head: true })
          .eq("status", "pendente")
          .lt("created_at", oneHourAgo)
      );
      results.push({
        label: "Pedidos Travados (>1h pendente)",
        value: travados ?? 0,
        status: (travados ?? 0) > 0 ? "warn" : "ok",
      });

      // Maintenance mode
      const { data: maint } = await withTimeout(supabase.from("maintenance_mode").select("is_active").limit(1).single());
      results.push({
        label: "Modo Manutenção",
        value: maint?.is_active ? "ATIVO" : "Desativado",
        status: maint?.is_active ? "warn" : "ok",
      });
    } catch (err) {
      logAndToast(err, "Verificar Saúde", toast);
    }
    setMetrics(results);
    setLoading(false);
  };

  useEffect(() => { checkHealth(); }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ok") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === "warn") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Activity className="h-5 w-5" /> Saúde do Sistema</h3>
        <Button variant="outline" size="sm" onClick={checkHealth} disabled={loading}>
          {loading ? "Verificando..." : "Atualizar"}
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 p-4">
                <StatusIcon status={m.status} />
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-lg font-bold">{m.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
