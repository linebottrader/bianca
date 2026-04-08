import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { Wrench, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HealingLog {
  id: string;
  issue_type: string;
  description: string;
  resolved: boolean;
  resolution: string;
  created_at: string;
}

export default function SelfHealingTab() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<HealingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await withTimeout(
        supabase.from("system_self_healing_logs").select("*").order("created_at", { ascending: false }).limit(50)
      );
      setLogs(data || []);
    } catch (err) {
      logAndToast(err, "Carregar Logs", toast);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const runHealing = async () => {
    setRunning(true);
    let fixed = 0;
    try {
      // 1. Detect stuck orders (pending > 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: stuck } = await withTimeout(
        supabase.from("pedidos").select("id, numero_pedido, status").eq("status", "pendente").lt("created_at", twoHoursAgo)
      );
      for (const order of (stuck || [])) {
        await supabase.from("system_self_healing_logs").insert({
          issue_type: "PEDIDO_TRAVADO",
          description: `Pedido ${order.numero_pedido} travado como pendente por mais de 2 horas`,
          resolved: false,
          resolution: "Detectado — necessita revisão manual",
        });
        fixed++;
      }

      // 2. Detect payments without corresponding order
      const { data: allPayments } = await withTimeout(supabase.from("pagamentos").select("id, pedido_id, status"));
      const { data: allOrders } = await withTimeout(supabase.from("pedidos").select("id"));
      const orderIds = new Set((allOrders || []).map(o => o.id));
      const orphanPayments = (allPayments || []).filter(p => !orderIds.has(p.pedido_id));
      for (const p of orphanPayments) {
        await supabase.from("system_self_healing_logs").insert({
          issue_type: "PAGAMENTO_ORFAO",
          description: `Pagamento ${p.id.slice(0, 8)} sem pedido correspondente (pedido_id: ${p.pedido_id.slice(0, 8)})`,
          resolved: false,
          resolution: "Detectado — pagamento sem pedido válido",
        });
        fixed++;
      }

      // 3. Detect approved payments with pending order
      const { data: approvedPayments } = await withTimeout(
        supabase.from("pagamentos").select("id, pedido_id").eq("status", "aprovado")
      );
      for (const ap of (approvedPayments || [])) {
        const { data: order } = await supabase.from("pedidos").select("id, status_pagamento").eq("id", ap.pedido_id).single();
        if (order && order.status_pagamento === "pendente") {
          await supabase.from("pedidos").update({ status_pagamento: "aprovado" }).eq("id", order.id);
          await supabase.from("system_self_healing_logs").insert({
            issue_type: "PAGAMENTO_NAO_SINCRONIZADO",
            description: `Pedido ${order.id.slice(0, 8)} com pagamento aprovado mas status_pagamento pendente`,
            resolved: true,
            resolution: "Corrigido automaticamente: status_pagamento atualizado para aprovado",
          });
          fixed++;
        }
      }

      const user = (await supabase.auth.getUser()).data.user;

      // Always log the execution in healing logs so history is never empty
      await supabase.from("system_self_healing_logs").insert({
        issue_type: "VERIFICACAO",
        description: `Verificação completa: ${fixed} problema(s) detectado(s)`,
        resolved: true,
        resolution: fixed === 0 ? "Nenhum problema encontrado — sistema saudável" : `${fixed} problema(s) registrado(s)`,
      });

      await supabase.from("system_audit_logs").insert({
        user_id: user?.id || "",
        user_email: user?.email || "",
        action: "SELF_HEALING",
        description: `Auto-correção executada. ${fixed} problema(s) detectado(s).`,
      });

      toast({ title: `Verificação completa: ${fixed} problema(s) detectado(s)` });
      fetchLogs();
    } catch (err) {
      logAndToast(err, "Auto-Correção", toast);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Auto-Correção do Sistema</CardTitle>
          <CardDescription>Detecta e corrige automaticamente: pedidos travados, pagamentos órfãos, status inconsistentes</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runHealing} disabled={running}>
            <Play className="mr-1 h-4 w-4" />
            {running ? "Executando verificação..." : "Executar Auto-Correção"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Auto-Correção</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{log.issue_type}</TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate">{log.description}</TableCell>
                    <TableCell>
                      <Badge variant={log.resolved ? "default" : "secondary"}>
                        {log.resolved ? "Corrigido" : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
