import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { BarChart3, TrendingUp, Users, Clock, DollarSign, ShoppingBag, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Pedido {
  id: string;
  valor_total: number;
  created_at: string;
  cliente_id: string;
  itens: any;
  status: string;
}

export default function SalesAnalyticsTab() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from("pedidos").select("id, valor_total, created_at, cliente_id, itens, status").order("created_at", { ascending: false }).limit(1000)
      );
      if (error) throw error;
      setPedidos(data || []);
    } catch (err) {
      logAndToast(err, "Carregar Analytics", toast);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const completed = pedidos.filter(p => p.status !== "cancelado");
  const vendasHoje = completed.filter(p => p.created_at.slice(0, 10) === todayStr).reduce((s, p) => s + Number(p.valor_total), 0);
  const vendasSemana = completed.filter(p => new Date(p.created_at) >= weekAgo).reduce((s, p) => s + Number(p.valor_total), 0);
  const vendasMes = completed.filter(p => new Date(p.created_at) >= monthStart).reduce((s, p) => s + Number(p.valor_total), 0);
  const vendasTotal = completed.reduce((s, p) => s + Number(p.valor_total), 0);
  const ticketMedio = completed.length > 0 ? vendasTotal / completed.length : 0;

  const vendasMesAnterior = completed.filter(p => {
    const d = new Date(p.created_at);
    return d >= lastMonthStart && d <= lastMonthEnd;
  }).reduce((s, p) => s + Number(p.valor_total), 0);
  const crescimento = vendasMesAnterior > 0 ? ((vendasMes - vendasMesAnterior) / vendasMesAnterior) * 100 : 0;

  // Top 10 products
  const productMap = new Map<string, { name: string; qty: number; total: number }>();
  completed.forEach(p => {
    const items = Array.isArray(p.itens) ? p.itens : [];
    items.forEach((item: any) => {
      const name = item.name || item.nome || "Desconhecido";
      const qty = Number(item.quantity || item.quantidade || 1);
      const price = Number(item.price || item.preco || item.preco_unitario || 0) * qty;
      const existing = productMap.get(name) || { name, qty: 0, total: 0 };
      productMap.set(name, { name, qty: existing.qty + qty, total: existing.total + price });
    });
  });
  const topProducts = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Peak hours
  const hourMap = new Array(24).fill(0);
  completed.forEach(p => {
    const h = new Date(p.created_at).getHours();
    hourMap[h]++;
  });
  const maxHourCount = Math.max(...hourMap, 1);

  // Recurring customers
  const clientMap = new Map<string, number>();
  completed.forEach(p => clientMap.set(p.cliente_id, (clientMap.get(p.cliente_id) || 0) + 1));
  const topClients = [...clientMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));
  const recurrentCount = [...clientMap.values()].filter(c => c > 1).length;
  const uniqueClients = clientMap.size;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Analytics de Vendas</h3>
        <Button variant="outline" size="sm" onClick={fetchData}>Atualizar</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { icon: DollarSign, label: "Hoje", value: fmt(vendasHoje) },
          { icon: DollarSign, label: "Semana", value: fmt(vendasSemana) },
          { icon: DollarSign, label: "Mês", value: fmt(vendasMes) },
          { icon: ShoppingBag, label: "Ticket Médio", value: fmt(ticketMedio) },
          { icon: TrendingUp, label: "Crescimento", value: `${crescimento >= 0 ? "+" : ""}${crescimento.toFixed(1)}%` },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <kpi.icon className="h-5 w-5 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Faturamento</p>
            <p className="text-xl font-bold text-primary">{fmt(vendasTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Pedidos</p>
            <p className="text-xl font-bold">{completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Clientes Únicos / Recorrentes</p>
            <p className="text-lg font-bold">{uniqueClients} / {recurrentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Top 10 Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p, i) => (
                  <TableRow key={p.name}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.qty}</TableCell>
                    <TableCell>{fmt(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Horários de Pico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {hourMap.map((count, hour) => (
              <div key={hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(count / maxHourCount) * 100}%`, minHeight: count > 0 ? "4px" : "0" }}
                />
                <span className="text-[9px] text-muted-foreground mt-1">{hour}h</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Clientes Recorrentes</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente ID</TableHead>
                  <TableHead>Pedidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{c.id.slice(0, 12)}...</TableCell>
                    <TableCell>{c.count}</TableCell>
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
