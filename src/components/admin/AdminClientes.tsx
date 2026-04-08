import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Users, Crown, MessageCircle, FileText, FileSpreadsheet, CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, ShoppingCart, DollarSign, Download, Loader2 } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { useToast } from "@/hooks/use-toast";

type ClienteRow = {
  id: string;
  nome_completo: string;
  telefone: string;
  email: string | null;
  created_at: string;
  data_nascimento: string;
};

type PedidoRow = {
  id: string;
  numero_pedido: string;
  created_at: string;
  status: string;
  valor_total: number;
  forma_pagamento: string;
  tipo_entrega: string;
};

type ClienteComPedidos = ClienteRow & {
  total_pedidos: number;
  valor_total_gasto: number;
  ultimo_pedido: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  preparo: "Em preparo",
  pronto: "Pronto",
  saiu_entrega: "Saiu p/ entrega",
  entregue: "Entregue",
  concluido: "Concluído",
  cancelado: "Cancelado",
  awaiting_payment: "Aguardando Pgto",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-gray-100 text-gray-700",
  confirmado: "bg-blue-100 text-blue-700",
  preparo: "bg-orange-100 text-orange-700",
  pronto: "bg-sky-100 text-sky-700",
  saiu_entrega: "bg-purple-100 text-purple-700",
  entregue: "bg-green-100 text-green-700",
  concluido: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
  awaiting_payment: "bg-yellow-100 text-yellow-700",
};

const PAGE_SIZE = 20;
const VIP_THRESHOLD_PEDIDOS = 5;
const VIP_THRESHOLD_VALOR = 200;
const INACTIVE_DAYS = 30;

type SegmentFilter = "todos" | "vip" | "ativo" | "inativo" | "normal";

export default function AdminClientes() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recente" | "pedidos" | "valor">("recente");
  const [segment, setSegment] = useState<SegmentFilter>("todos");
  const [page, setPage] = useState(0);
  const [selectedCliente, setSelectedCliente] = useState<ClienteComPedidos | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Detail filters
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterDateStart, setFilterDateStart] = useState<Date | undefined>();
  const [filterDateEnd, setFilterDateEnd] = useState<Date | undefined>();

  const { data: storeName } = useQuery({
    queryKey: ["store-name-export"],
    queryFn: async () => {
      const { data } = await supabase.from("store_config").select("name").limit(1).single();
      return data?.name || "Minha Loja";
    },
    staleTime: 60_000,
  });

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: async () => {
      const { data: clientesData, error: cErr } = await supabase
        .from("clientes")
        .select("id, nome_completo, telefone, email, created_at, data_nascimento")
        .order("created_at", { ascending: false });
      if (cErr) throw cErr;

      const { data: pedidosAgg, error: pErr } = await supabase
        .from("pedidos")
        .select("cliente_id, valor_total, created_at");
      if (pErr) throw pErr;

      const aggMap = new Map<string, { count: number; total: number; ultimo: string }>();
      for (const p of pedidosAgg || []) {
        const existing = aggMap.get(p.cliente_id);
        if (existing) {
          existing.count++;
          existing.total += Number(p.valor_total);
          if (p.created_at > existing.ultimo) existing.ultimo = p.created_at;
        } else {
          aggMap.set(p.cliente_id, { count: 1, total: Number(p.valor_total), ultimo: p.created_at });
        }
      }

      return (clientesData || []).map((c) => {
        const agg = aggMap.get(c.id);
        return {
          ...c,
          total_pedidos: agg?.count ?? 0,
          valor_total_gasto: agg?.total ?? 0,
          ultimo_pedido: agg?.ultimo ?? null,
        } as ClienteComPedidos;
      });
    },
    staleTime: 30_000,
  });

  const { data: clientePedidos = [], isLoading: pedidosLoading } = useQuery({
    queryKey: ["admin-cliente-pedidos", selectedCliente?.id],
    enabled: !!selectedCliente,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, created_at, status, valor_total, forma_pagamento, tipo_entrega")
        .eq("cliente_id", selectedCliente!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PedidoRow[];
    },
  });

  const isVip = (c: ClienteComPedidos) =>
    c.total_pedidos >= VIP_THRESHOLD_PEDIDOS || c.valor_total_gasto >= VIP_THRESHOLD_VALOR;

  const isInactive = (c: ClienteComPedidos) =>
    !c.ultimo_pedido || differenceInDays(new Date(), parseISO(c.ultimo_pedido)) > INACTIVE_DAYS;

  const filtered = useMemo(() => {
    let list = [...clientes];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.nome_completo.toLowerCase().includes(q) || c.telefone.includes(q)
      );
    }

    // Segment filter
    if (segment === "vip") list = list.filter(isVip);
    else if (segment === "ativo") list = list.filter((c) => !isInactive(c));
    else if (segment === "inativo") list = list.filter(isInactive);
    else if (segment === "normal") list = list.filter((c) => !isVip(c));

    // Sort
    if (sortBy === "pedidos") list.sort((a, b) => b.total_pedidos - a.total_pedidos);
    else if (sortBy === "valor") list.sort((a, b) => b.valor_total_gasto - a.valor_total_gasto);

    return list;
  }, [clientes, search, sortBy, segment]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const filteredPedidos = useMemo(() => {
    let list = [...clientePedidos];
    if (filterStatus !== "todos") list = list.filter((p) => p.status === filterStatus);
    if (filterDateStart) list = list.filter((p) => new Date(p.created_at) >= filterDateStart!);
    if (filterDateEnd) {
      const end = new Date(filterDateEnd!);
      end.setHours(23, 59, 59, 999);
      list = list.filter((p) => new Date(p.created_at) <= end);
    }
    return list;
  }, [clientePedidos, filterStatus, filterDateStart, filterDateEnd]);

  const openDetails = useCallback((c: ClienteComPedidos) => {
    setSelectedCliente(c);
    setDetailsOpen(true);
    setFilterStatus("todos");
    setFilterDateStart(undefined);
    setFilterDateEnd(undefined);
  }, []);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatPhone = (p: string) => {
    const clean = p.replace(/\D/g, "");
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return p;
  };

  const getSegmentLabel = () => {
    const labels: Record<SegmentFilter, string> = {
      todos: "Todos os Clientes",
      vip: "Clientes VIP",
      ativo: "Clientes Ativos",
      inativo: "Clientes Inativos",
      normal: "Clientes Normais",
    };
    let label = labels[segment];
    if (search.trim()) label += ` (busca: "${search}")`;
    return label;
  };

  const getClienteRow = (c: ClienteComPedidos) => ({
    nome: c.nome_completo,
    telefone: formatPhone(c.telefone),
    email: c.email || "N/A",
    cadastro: format(new Date(c.created_at), "dd/MM/yyyy"),
    total_pedidos: c.total_pedidos,
    total_gasto: formatCurrency(c.valor_total_gasto),
    ticket_medio: c.total_pedidos > 0 ? formatCurrency(c.valor_total_gasto / c.total_pedidos) : "R$ 0,00",
    ultimo_pedido: c.ultimo_pedido ? format(new Date(c.ultimo_pedido), "dd/MM/yyyy") : "Nenhum",
    status: isInactive(c) ? "Inativo" : "Ativo",
    classificacao: isVip(c) ? "VIP" : "Normal",
  });

  // ====== BULK EXPORT PDF ======
  const exportBulkPDF = useCallback(() => {
    if (filtered.length === 0) {
      toast({ title: "Nenhum cliente para exportar", variant: "destructive" });
      return;
    }
    setExporting(true);

    setTimeout(() => {
      try {
        const today = format(new Date(), "dd/MM/yyyy");
        const fileName = `clientes_${format(new Date(), "yyyy-MM-dd")}`;
        const rows = filtered.map(getClienteRow);

        const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${fileName}</title>
<style>
  @media print { @page { size: landscape; margin: 10mm; } }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .header h1 { font-size: 18px; margin: 0; }
  .header p { margin: 4px 0; color: #666; font-size: 12px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2e2e2e; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
  tr:nth-child(even) { background: #f9f9f9; }
  .vip { color: #b45309; font-weight: bold; }
  .ativo { color: #16a34a; }
  .inativo { color: #9ca3af; }
  .summary { margin-top: 16px; font-size: 11px; color: #555; border-top: 1px solid #ccc; padding-top: 8px; }
</style>
</head><body>
<div class="header">
  <h1>${storeName || "Minha Loja"}</h1>
  <p>Relatório de Clientes</p>
</div>
<div class="meta">
  <span><strong>Segmento:</strong> ${getSegmentLabel()}</span>
  <span><strong>Data:</strong> ${today}</span>
  <span><strong>Total:</strong> ${rows.length} cliente(s)</span>
</div>
<table>
<thead><tr>
  <th>Nome</th><th>Telefone</th><th>E-mail</th><th>Cadastro</th>
  <th>Pedidos</th><th>Total Gasto</th><th>Ticket Médio</th>
  <th>Último Pedido</th><th>Status</th><th>Classificação</th>
</tr></thead>
<tbody>
${rows.map(r => `<tr>
  <td>${r.nome}</td><td>${r.telefone}</td><td>${r.email}</td><td>${r.cadastro}</td>
  <td style="text-align:center">${r.total_pedidos}</td><td style="text-align:right">${r.total_gasto}</td>
  <td style="text-align:right">${r.ticket_medio}</td><td>${r.ultimo_pedido}</td>
  <td class="${r.status === "Ativo" ? "ativo" : "inativo"}">${r.status}</td>
  <td class="${r.classificacao === "VIP" ? "vip" : ""}">${r.classificacao}</td>
</tr>`).join("")}
</tbody>
</table>
<div class="summary">
  Total gasto geral: ${formatCurrency(filtered.reduce((s, c) => s + c.valor_total_gasto, 0))} •
  Ticket médio geral: ${filtered.length > 0 ? formatCurrency(filtered.reduce((s, c) => s + c.valor_total_gasto, 0) / filtered.reduce((s, c) => s + c.total_pedidos, 0) || 0) : "R$ 0,00"}
</div>
</body></html>`;

        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.document.title = fileName;
          setTimeout(() => win.print(), 500);
        }
        toast({ title: "PDF gerado com sucesso!" });
      } finally {
        setExporting(false);
      }
    }, 100);
  }, [filtered, storeName, toast, search, segment]);

  // ====== BULK EXPORT EXCEL/CSV ======
  const exportBulkExcel = useCallback(() => {
    if (filtered.length === 0) {
      toast({ title: "Nenhum cliente para exportar", variant: "destructive" });
      return;
    }
    setExporting(true);

    setTimeout(() => {
      try {
        const rows = filtered.map(getClienteRow);
        const header = "Nome;Telefone;E-mail;Data Cadastro;Total Pedidos;Total Gasto;Ticket Médio;Último Pedido;Status;Classificação\n";
        const csvRows = rows.map(r =>
          `${r.nome};${r.telefone};${r.email};${r.cadastro};${r.total_pedidos};${r.total_gasto};${r.ticket_medio};${r.ultimo_pedido};${r.status};${r.classificacao}`
        ).join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + header + csvRows], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `clientes_${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast({ title: "Exportação concluída com sucesso!" });
      } finally {
        setExporting(false);
      }
    }, 100);
  }, [filtered, toast]);

  // ====== DETAIL EXPORT PDF ======
  const exportDetailPDF = () => {
    if (!selectedCliente) return;
    const content = [
      `RELATÓRIO DO CLIENTE`,
      `Nome: ${selectedCliente.nome_completo}`,
      `Telefone: ${formatPhone(selectedCliente.telefone)}`,
      `Email: ${selectedCliente.email || "N/A"}`,
      `Cadastro: ${format(new Date(selectedCliente.created_at), "dd/MM/yyyy")}`,
      `Total de Pedidos: ${selectedCliente.total_pedidos}`,
      `Total Gasto: ${formatCurrency(selectedCliente.valor_total_gasto)}`,
      `Ticket Médio: ${selectedCliente.total_pedidos > 0 ? formatCurrency(selectedCliente.valor_total_gasto / selectedCliente.total_pedidos) : "R$ 0,00"}`,
      `Status: ${isInactive(selectedCliente) ? "Inativo" : "Ativo"}`,
      `Classificação: ${isVip(selectedCliente) ? "VIP" : "Normal"}`,
      ``,
      `HISTÓRICO DE PEDIDOS`,
      `Pedido | Data | Status | Valor | Pagamento`,
      ...filteredPedidos.map(
        (p) =>
          `${p.numero_pedido} | ${format(new Date(p.created_at), "dd/MM/yyyy HH:mm")} | ${STATUS_LABELS[p.status] || p.status} | ${formatCurrency(Number(p.valor_total))} | ${p.forma_pagamento}`
      ),
    ].join("\n");
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<pre style="font-family:monospace;font-size:12px;padding:20px;">${content}</pre>`);
      win.document.title = `Cliente - ${selectedCliente.nome_completo}`;
      win.print();
    }
  };

  const exportDetailCSV = () => {
    if (!selectedCliente || !filteredPedidos.length) return;
    const bom = "\uFEFF";
    const header = "Pedido;Data;Status;Valor;Pagamento\n";
    const rows = filteredPedidos
      .map(
        (p) =>
          `${p.numero_pedido};${format(new Date(p.created_at), "dd/MM/yyyy HH:mm")};${STATUS_LABELS[p.status] || p.status};${Number(p.valor_total).toFixed(2)};${p.forma_pagamento}`
      )
      .join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cliente_${selectedCliente.telefone}_pedidos.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Stats
  const totalClientes = clientes.length;
  const clientesVip = clientes.filter(isVip).length;
  const clientesAtivos = clientes.filter((c) => !isInactive(c)).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{totalClientes}</p>
              <p className="text-xs text-muted-foreground">Total Clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100"><Crown className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold">{clientesVip}</p>
              <p className="text-xs text-muted-foreground">Clientes VIP</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{clientesAtivos}</p>
              <p className="text-xs text-muted-foreground">Ativos (30d)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><ShoppingCart className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">
                {clientes.length > 0
                  ? formatCurrency(clientes.reduce((s, c) => s + c.valor_total_gasto, 0) / clientes.length)
                  : "R$ 0"}
              </p>
              <p className="text-xs text-muted-foreground">Gasto Médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Sort, Segment & Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Lista de Clientes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportBulkPDF} disabled={exporting || filtered.length === 0}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                Exportar PDF
              </Button>
              <Button size="sm" variant="outline" onClick={exportBulkExcel} disabled={exporting || filtered.length === 0}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={segment} onValueChange={(v) => { setSegment(v as SegmentFilter); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="vip">⭐ VIP</SelectItem>
                <SelectItem value="ativo">🟢 Ativos</SelectItem>
                <SelectItem value="inativo">⚪ Inativos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recente">Mais recentes</SelectItem>
                <SelectItem value="pedidos">Mais pedidos</SelectItem>
                <SelectItem value="valor">Maior valor gasto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters info */}
          {(segment !== "todos" || search.trim()) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="h-3.5 w-3.5" />
              Exportação incluirá: <strong>{filtered.length}</strong> cliente(s) — {getSegmentLabel()}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">E-mail</TableHead>
                      <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {c.nome_completo}
                            {isVip(c) && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-[10px] px-1.5">
                                <Crown className="h-3 w-3 mr-0.5" /> VIP
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatPhone(c.telefone)}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-center">{c.total_pedidos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(c.valor_total_gasto)}</TableCell>
                        <TableCell className="text-center">
                          {isInactive(c) ? (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-[10px]">Inativo</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px]">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openDetails(c)}>
                              Ver Detalhes
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => window.open(getWhatsAppUrl(
                                `55${c.telefone.replace(/\D/g, "")}`,
                                `Olá ${c.nome_completo.split(" ")[0]}! 😊`
                              ), "_blank")}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paged.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} cliente(s) • Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Client Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCliente && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCliente.nome_completo}
                  {isVip(selectedCliente) && (
                    <Badge className="bg-yellow-500 text-white"><Crown className="h-3 w-3 mr-1" /> VIP</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium text-sm">{formatPhone(selectedCliente.telefone)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium text-sm truncate">{selectedCliente.email || "N/A"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <p className="font-medium text-sm">{format(new Date(selectedCliente.created_at), "dd/MM/yyyy")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Último Pedido</p>
                  <p className="font-medium text-sm">
                    {selectedCliente.ultimo_pedido
                      ? format(new Date(selectedCliente.ultimo_pedido), "dd/MM/yyyy")
                      : "Nenhum"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <ShoppingCart className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{selectedCliente.total_pedidos}</p>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{formatCurrency(selectedCliente.valor_total_gasto)}</p>
                  <p className="text-xs text-muted-foreground">Total Gasto</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">
                    {selectedCliente.total_pedidos > 0
                      ? formatCurrency(selectedCliente.valor_total_gasto / selectedCliente.total_pedidos)
                      : "R$ 0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={exportDetailPDF}>
                  <FileText className="h-4 w-4 mr-1" /> Exportar PDF
                </Button>
                <Button size="sm" variant="outline" onClick={exportDetailCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300"
                  onClick={() => window.open(getWhatsAppUrl(
                    `55${selectedCliente.telefone.replace(/\D/g, "")}`,
                    `Olá ${selectedCliente.nome_completo.split(" ")[0]}! 😊`
                  ), "_blank")}
                >
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              </div>

              <div className="mt-4">
                <h3 className="font-semibold mb-3">Histórico de Pedidos</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="preparo">Em preparo</SelectItem>
                      <SelectItem value="pronto">Pronto</SelectItem>
                      <SelectItem value="saiu_entrega">Saiu p/ entrega</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {filterDateStart ? format(filterDateStart, "dd/MM/yy") : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={filterDateStart} onSelect={setFilterDateStart} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {filterDateEnd ? format(filterDateEnd, "dd/MM/yy") : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={filterDateEnd} onSelect={setFilterDateEnd} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>

                  {(filterStatus !== "todos" || filterDateStart || filterDateEnd) && (
                    <Button variant="ghost" size="sm" className="h-9" onClick={() => {
                      setFilterStatus("todos");
                      setFilterDateStart(undefined);
                      setFilterDateEnd(undefined);
                    }}>
                      Limpar
                    </Button>
                  )}
                </div>

                {pedidosLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Pagamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPedidos.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-sm">#{p.numero_pedido.slice(0, 8)}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700"}`}>
                                {STATUS_LABELS[p.status] || p.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(p.valor_total))}
                            </TableCell>
                            <TableCell className="text-sm">{p.forma_pagamento}</TableCell>
                          </TableRow>
                        ))}
                        {filteredPedidos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              Nenhum pedido encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
