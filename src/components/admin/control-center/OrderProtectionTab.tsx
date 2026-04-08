import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DuplicateOrder {
  mercado_pago_id: string;
  count: number;
  ids: string[];
}

interface OrphanPayment {
  id: string;
  mercado_pago_payment_id: string;
  status: string;
  valor: number;
  pedido_id: string;
}

export default function OrderProtectionTab() {
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<DuplicateOrder[]>([]);
  const [orphans, setOrphans] = useState<OrphanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const analyze = async () => {
    setLoading(true);
    try {
      // Check for duplicate mercado_pago_id
      const { data: pedidos } = await withTimeout(
        supabase.from("pedidos").select("id, mercado_pago_id").not("mercado_pago_id", "eq", "").not("mercado_pago_id", "is", null)
      );
      const mpMap = new Map<string, string[]>();
      (pedidos || []).forEach(p => {
        if (p.mercado_pago_id) {
          const list = mpMap.get(p.mercado_pago_id) || [];
          list.push(p.id);
          mpMap.set(p.mercado_pago_id, list);
        }
      });
      const dups: DuplicateOrder[] = [];
      mpMap.forEach((ids, mpId) => {
        if (ids.length > 1) dups.push({ mercado_pago_id: mpId, count: ids.length, ids });
      });
      setDuplicates(dups);

      // Check for payments without matching order
      const { data: pagamentos } = await withTimeout(
        supabase.from("pagamentos").select("id, mercado_pago_payment_id, status, valor, pedido_id")
      );
      const pedidoIds = new Set((pedidos || []).map(p => p.id));
      const orph = (pagamentos || []).filter(p => !pedidoIds.has(p.pedido_id));
      setOrphans(orph);
    } catch (err) {
      logAndToast(err, "Analisar Proteção", toast);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { analyze(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Proteção de Pedidos</h3>
        <Button variant="outline" size="sm" onClick={analyze} disabled={loading}>Atualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos Duplicados (mesmo Mercado Pago ID)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : duplicates.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-green-500" /> Nenhum pedido duplicado encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mercado Pago ID</TableHead>
                  <TableHead>Duplicatas</TableHead>
                  <TableHead>IDs dos Pedidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicates.map(d => (
                  <TableRow key={d.mercado_pago_id}>
                    <TableCell className="font-mono text-xs">{d.mercado_pago_id}</TableCell>
                    <TableCell><Badge variant="destructive">{d.count}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{d.ids.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Pagamentos Órfãos
          </CardTitle>
          <CardDescription>Pagamentos sem pedido correspondente no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : orphans.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-green-500" /> Nenhum pagamento órfão encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pagamento</TableHead>
                  <TableHead>MP Payment ID</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphans.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{o.mercado_pago_payment_id || "—"}</TableCell>
                    <TableCell>R$ {Number(o.valor).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
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
