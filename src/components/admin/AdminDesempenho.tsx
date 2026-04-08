import { useState, useMemo, useCallback } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart3, Users, ShoppingCart, DollarSign, TrendingUp, Smartphone, Monitor,
  Eye, MousePointer, CreditCard, Lightbulb, Filter, RefreshCw, CalendarIcon
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell
} from "recharts";
import { cn } from "@/lib/utils";

type AnalyticsEvent = {
  id: string;
  event_type: string;
  session_id: string;
  device_type: string;
  metadata: any;
  created_at: string;
};

const PERIOD_OPTIONS = [
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "Personalizado", value: "custom" },
];

function getDateRange(period: string, customStart?: Date, customEnd?: Date) {
  if (period === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString() };
  }
  const now = new Date();
  const start = new Date();
  if (period === "today") start.setHours(0, 0, 0, 0);
  else if (period === "7d") start.setDate(now.getDate() - 7);
  else start.setDate(now.getDate() - 30);
  return { start: start.toISOString(), end: now.toISOString() };
}

const FUNNEL_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 70% 50%))", "hsl(var(--chart-3, 40 80% 55%))", "hsl(var(--chart-4, 280 60% 55%))", "hsl(var(--success, 142 76% 36%))"];

const AdminDesempenho = () => {
  const isTabVisible = usePageVisibility();
  const [period, setPeriod] = useState("7d");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["analytics-events"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-pedidos"] });
  }, [queryClient]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value !== "custom") {
      setCustomStart(undefined);
      setCustomEnd(undefined);
    }
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["analytics-events", period, customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: async () => {
      const { start, end } = getDateRange(period, customStart, customEnd);
      const { data, error } = await supabase
        .from("analytics_events" as any)
        .select("*")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as AnalyticsEvent[];
    },
    enabled: period !== "custom" || (!!customStart && !!customEnd),
    refetchInterval: isTabVisible ? 30000 : false,
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ["analytics-pedidos", period, customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: async () => {
      const { start, end } = getDateRange(period, customStart, customEnd);
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, valor_total, created_at, itens, status")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: period !== "custom" || (!!customStart && !!customEnd),
    refetchInterval: isTabVisible ? 30000 : false,
  });

  // KPIs
  const kpis = useMemo(() => {
    const visits = events.filter((e) => e.event_type === "visit");
    const uniqueSessions = new Set(visits.map((e) => e.session_id)).size;
    const productViews = events.filter((e) => e.event_type === "product_view").length;
    const clickOrders = events.filter((e) => e.event_type === "click_order").length;
    const orderStarted = events.filter((e) => e.event_type === "order_started").length;
    const orderCompleted = events.filter((e) => e.event_type === "order_completed").length;

    const completedPedidos = pedidos.filter((p) => p.status !== "cancelado");
    const faturamento = completedPedidos.reduce((s, p) => s + Number(p.valor_total), 0);
    const ticketMedio = completedPedidos.length > 0 ? faturamento / completedPedidos.length : 0;
    const conversao = visits.length > 0 ? (orderCompleted / visits.length) * 100 : 0;

    const mobileCount = events.filter((e) => e.device_type === "mobile").length;
    const desktopCount = events.filter((e) => e.device_type === "desktop").length;
    const mobilePercent = events.length > 0 ? (mobileCount / events.length) * 100 : 0;

    return {
      visitantes: visits.length,
      uniqueSessions,
      productViews,
      clickOrders,
      orderStarted,
      orderCompleted,
      totalPedidos: completedPedidos.length,
      faturamento,
      ticketMedio,
      conversao,
      mobileCount,
      desktopCount,
      mobilePercent,
    };
  }, [events, pedidos]);

  // Daily charts data
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; visitas: number; pedidos: number; faturamento: number }> = {};
    events.forEach((e) => {
      const d = e.created_at.substring(0, 10);
      if (!map[d]) map[d] = { date: d, visitas: 0, pedidos: 0, faturamento: 0 };
      if (e.event_type === "visit") map[d].visitas++;
    });
    pedidos.forEach((p) => {
      const d = p.created_at.substring(0, 10);
      if (!map[d]) map[d] = { date: d, visitas: 0, pedidos: 0, faturamento: 0 };
      if (p.status !== "cancelado") {
        map[d].pedidos++;
        map[d].faturamento += Number(p.valor_total);
      }
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
      ...d,
      date: d.date.substring(5), // MM-DD
    }));
  }, [events, pedidos]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    pedidos.forEach((p) => {
      if (p.status === "cancelado") return;
      const itens = Array.isArray(p.itens) ? p.itens : [];
      itens.forEach((item: any) => {
        const name = item.name || item.produto || "Desconhecido";
        if (!map[name]) map[name] = { name, count: 0, revenue: 0 };
        map[name].count += item.quantity || 1;
        map[name].revenue += (item.totalPrice || item.preco_unitario || 0) * (item.quantity || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [pedidos]);

  // Funnel data
  const funnelData = useMemo(() => [
    { name: "Visitantes", value: kpis.visitantes, fill: FUNNEL_COLORS[0] },
    { name: "Visualizações", value: kpis.productViews, fill: FUNNEL_COLORS[1] },
    { name: "Cliques em Pedir", value: kpis.clickOrders, fill: FUNNEL_COLORS[2] },
    { name: "Checkout Iniciado", value: kpis.orderStarted, fill: FUNNEL_COLORS[3] },
    { name: "Pedido Finalizado", value: kpis.orderCompleted, fill: FUNNEL_COLORS[4] },
  ], [kpis]);

  // Device data
  const deviceData = useMemo(() => [
    { name: "Mobile", value: kpis.mobileCount },
    { name: "Desktop", value: kpis.desktopCount },
  ], [kpis]);

  // Insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    msgs.push(`${period === "today" ? "Hoje" : `Nos últimos ${period === "7d" ? "7 dias" : "30 dias"}`} você teve ${kpis.visitantes} visitantes.`);
    msgs.push(`Taxa de conversão: ${kpis.conversao.toFixed(1)}%`);
    if (topProducts[0]) msgs.push(`Produto mais vendido: ${topProducts[0].name} (${topProducts[0].count}x)`);
    msgs.push(`${kpis.mobilePercent.toFixed(0)}% dos acessos são mobile.`);
    msgs.push(`Ticket médio: R$ ${kpis.ticketMedio.toFixed(2)}`);

    // Peak hour
    const hourMap: Record<number, number> = {};
    events.filter((e) => e.event_type === "order_completed").forEach((e) => {
      const h = new Date(e.created_at).getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourMap).sort(([, a], [, b]) => b - a)[0];
    if (peakHour) msgs.push(`Melhor horário de vendas: ${peakHour[0]}h`);

    return msgs;
  }, [kpis, topProducts, events, period]);

  // Abandonments
  const abandonments = useMemo(() => {
    const startedSessions = new Map<string, AnalyticsEvent>();
    const completedSessions = new Set<string>();
    events.forEach((e) => {
      if (e.event_type === "order_started") startedSessions.set(e.session_id, e);
      if (e.event_type === "order_completed") completedSessions.add(e.session_id);
    });
    const result: { session_id: string; created_at: string; metadata: any; timeSince: string }[] = [];
    startedSessions.forEach((ev, sid) => {
      if (!completedSessions.has(sid)) {
        const diff = Date.now() - new Date(ev.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        result.push({
          session_id: sid.substring(0, 8),
          created_at: new Date(ev.created_at).toLocaleString("pt-BR"),
          metadata: ev.metadata,
          timeSince: mins < 60 ? `${mins}min` : `${Math.floor(mins / 60)}h${mins % 60}min`,
        });
      }
    });
    return result.slice(0, 20);
  }, [events]);

  const KPICard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {PERIOD_OPTIONS.map((o) => (
          <Button
            key={o.value}
            size="sm"
            variant={period === o.value ? "default" : "outline"}
            onClick={() => handlePeriodChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {customStart ? format(customStart, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !customEnd && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {customEnd ? format(customEnd, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
        <Button size="sm" variant="ghost" onClick={handleRefresh}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Tabs defaultValue="metricas" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* MÉTRICAS */}
        <TabsContent value="metricas">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <KPICard icon={Users} label="Visitantes" value={String(kpis.visitantes)} sub={`${kpis.uniqueSessions} sessões únicas`} />
            <KPICard icon={Eye} label="Visualizações" value={String(kpis.productViews)} />
            <KPICard icon={MousePointer} label="Cliques em Pedir" value={String(kpis.clickOrders)} />
            <KPICard icon={CreditCard} label="Checkouts Iniciados" value={String(kpis.orderStarted)} />
            <KPICard icon={ShoppingCart} label="Pedidos" value={String(kpis.totalPedidos)} />
            <KPICard icon={DollarSign} label="Faturamento" value={`R$ ${kpis.faturamento.toFixed(2)}`} />
            <KPICard icon={TrendingUp} label="Conversão" value={`${kpis.conversao.toFixed(1)}%`} sub="visitantes → pedidos" />
            <KPICard icon={DollarSign} label="Ticket Médio" value={`R$ ${kpis.ticketMedio.toFixed(2)}`} />
            <KPICard icon={Smartphone} label="Mobile" value={`${kpis.mobilePercent.toFixed(0)}%`} sub={`${kpis.mobileCount} acessos`} />
            <KPICard icon={Monitor} label="Desktop" value={`${(100 - kpis.mobilePercent).toFixed(0)}%`} sub={`${kpis.desktopCount} acessos`} />
          </div>
        </TabsContent>

        {/* GRÁFICOS */}
        <TabsContent value="graficos" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Visitas por Dia</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="visitas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Pedidos por Dia</CardTitle></CardHeader>
              <CardContent className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="pedidos" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Faturamento por Dia</CardTitle></CardHeader>
              <CardContent className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Top 10 Produtos Mais Vendidos</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Dispositivos</CardTitle></CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceData}>
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNIL */}
        <TabsContent value="funil" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Funil de Conversão</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {funnelData.map((step, i) => {
                  const maxVal = funnelData[0].value || 1;
                  const width = Math.max((step.value / maxVal) * 100, 8);
                  const prevValue = i > 0 ? funnelData[i - 1].value : step.value;
                  const dropoff = prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : "100";
                  return (
                    <div key={step.name} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-right text-muted-foreground">{step.name}</div>
                      <div className="flex-1">
                        <div
                          className="h-8 rounded flex items-center px-3 text-xs font-bold text-white transition-all"
                          style={{ width: `${width}%`, background: step.fill, minWidth: "40px" }}
                        >
                          {step.value}
                        </div>
                      </div>
                      {i > 0 && (
                        <span className="text-xs text-muted-foreground w-12">{dropoff}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Abandonos Recentes</CardTitle></CardHeader>
            <CardContent>
              {abandonments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum abandono detectado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="pb-2 font-medium">Sessão</th>
                        <th className="pb-2 font-medium">Data</th>
                        <th className="pb-2 font-medium">Há quanto tempo</th>
                        <th className="pb-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abandonments.map((a, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 font-mono text-xs">{a.session_id}…</td>
                          <td className="py-2">{a.created_at}</td>
                          <td className="py-2 text-destructive">{a.timeSince}</td>
                          <td className="py-2">
                            {a.metadata?.cart_total ? `R$ ${Number(a.metadata.cart_total).toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSIGHTS */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-yellow-500" /> Insights Automáticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-sm">{msg}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDesempenho;
