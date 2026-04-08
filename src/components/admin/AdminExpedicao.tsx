import { useState, useMemo, useEffect, useRef, useCallback, memo, useSyncExternalStore } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useStoreConfig } from "@/hooks/useStoreData";
import WhatsAppFallbackModal from "@/components/delivery/WhatsAppFallbackModal";
import { printPedido } from "@/utils/printReceipt";
import {
  Clock,
  MapPin,
  CreditCard,
  ChevronRight,
  Search,
  Package,
  ChefHat,
  CheckCircle2,
  Truck,
  XCircle,
  Eye,
  MessageSquare,
  Printer,
  Bell,
} from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";
import { getRealtimeStatus, onRealtimeStatusChange, type RealtimeStatus } from "@/hooks/useRealtimeSync";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Pedido = {
  id: string;
  numero_pedido: string;
  cliente_id: string;
  itens: any;
  valor_total: number;
  forma_pagamento: string;
  status: string;
  status_pagamento: string;
  tipo_entrega: string;
  endereco_entrega: string | null;
  valor_frete: number | null;
  distancia_km: number | null;
  created_at: string;
  updated_at: string | null;
  cliente?: { nome_completo: string; telefone: string };
  preparo_iniciado_em: string | null;
  preparo_finalizado_em: string | null;
  espera_iniciada_em: string | null;
  pedido_concluido_em: string | null;
  tempo_preparo: number | null;
  tempo_espera: number | null;
  tempo_total: number | null;
};

function formatTimerTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTimerColor(seconds: number): string {
  const mins = seconds / 60;
  if (mins < 10) return "text-green-500";
  if (mins < 20) return "text-yellow-500";
  return "text-destructive";
}

const ExpedicaoTimer = memo(function ExpedicaoTimer({ pedido }: { pedido: Pedido }) {
  const [now, setNow] = useState(Date.now());
  const isActive = ["pendente", "em_preparo", "pronto", "aguardando_entregador"].includes(pedido.status);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const preparoElapsed = useMemo(() => {
    if (pedido.tempo_preparo != null) return pedido.tempo_preparo;
    const start = pedido.preparo_iniciado_em || pedido.created_at;
    if (pedido.preparo_finalizado_em) {
      return Math.max(0, Math.floor((new Date(pedido.preparo_finalizado_em).getTime() - new Date(start).getTime()) / 1000));
    }
    if (["pendente", "em_preparo"].includes(pedido.status)) {
      return Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
    }
    if (pedido.updated_at) {
      return Math.max(0, Math.floor((new Date(pedido.updated_at).getTime() - new Date(start).getTime()) / 1000));
    }
    return 0;
  }, [pedido, now]);

  const esperaElapsed = useMemo(() => {
    if (pedido.tempo_espera != null) return pedido.tempo_espera;
    if (!pedido.espera_iniciada_em) return 0;
    if (pedido.pedido_concluido_em) {
      return Math.floor((new Date(pedido.pedido_concluido_em).getTime() - new Date(pedido.espera_iniciada_em).getTime()) / 1000);
    }
    if (["pronto", "aguardando_entregador"].includes(pedido.status)) {
      return Math.max(0, Math.floor((now - new Date(pedido.espera_iniciada_em).getTime()) / 1000));
    }
    return 0;
  }, [pedido, now]);

  const isPreparoPhase = ["pendente", "em_preparo"].includes(pedido.status);
  const isEsperaPhase = ["pronto", "aguardando_entregador", "saiu_entrega"].includes(pedido.status);
  const isFinal = ["concluido", "cancelado"].includes(pedido.status);

  if (isFinal && pedido.tempo_preparo == null && pedido.tempo_espera == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
      {isPreparoPhase && (
        <span className={`flex items-center gap-0.5 font-bold ${getTimerColor(preparoElapsed)}`}>
          <Clock className="h-3 w-3" /> Preparo: {formatTimerTime(preparoElapsed)}
        </span>
      )}
      {isEsperaPhase && (
        <>
          <span className="text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" /> Preparo: {formatTimerTime(preparoElapsed)}
          </span>
          <span className={`flex items-center gap-0.5 font-bold ${getTimerColor(esperaElapsed)}`}>
            ⏳ Espera: {formatTimerTime(esperaElapsed)}
          </span>
        </>
      )}
      {isFinal && (
        <>
          {pedido.tempo_preparo != null && (
            <span className="text-muted-foreground">Preparo: {formatTimerTime(pedido.tempo_preparo)}</span>
          )}
          {pedido.tempo_espera != null && (
            <span className="text-muted-foreground">Espera: {formatTimerTime(pedido.tempo_espera)}</span>
          )}
          {pedido.tempo_total != null && (
            <span className="text-muted-foreground font-bold">Total: {formatTimerTime(pedido.tempo_total)}</span>
          )}
        </>
      )}
    </div>
  );
});

const STATUS_COLUMNS = [
  { key: "aguardando_pagamento", label: "Aguardando Pgto", icon: CreditCard, color: "bg-gray-700" },
  { key: "pendente", label: "Pendentes", icon: Clock, color: "bg-yellow-500" },
  { key: "em_preparo", label: "Em Preparo", icon: ChefHat, color: "bg-blue-500" },
  { key: "pronto", label: "Pronto", icon: CheckCircle2, color: "bg-green-500" },
  { key: "aguardando_entregador", label: "Aguardando Entregador", icon: Bell, color: "bg-purple-500" },
  { key: "saiu_entrega", label: "Saiu p/ Entrega", icon: Truck, color: "bg-indigo-500" },
  { key: "concluido", label: "Concluído", icon: Package, color: "bg-emerald-600" },
  { key: "cancelado", label: "Cancelado", icon: XCircle, color: "bg-red-500" },
] as const;

const NEXT_STATUS: Record<string, string | null> = {
  aguardando_pagamento: null,
  pendente: "em_preparo",
  em_preparo: "pronto",
  pronto: "aguardando_entregador",
  aguardando_entregador: "saiu_entrega",
  saiu_entrega: "concluido",
  concluido: null,
  cancelado: null,
};

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  aprovado: { label: "Pago", className: "bg-green-600 text-white" },
  pago: { label: "Pago", className: "bg-green-600 text-white" },
  pendente: { label: "Pgto Pendente", className: "bg-gray-800 text-white" },
  rejeitado: { label: "Pgto Rejeitado", className: "bg-red-600 text-white" },
};

const AdminExpedicao = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: storeConfig } = useStoreConfig();
  const realtimeStatus = useSyncExternalStore(onRealtimeStatusChange, getRealtimeStatus);

  const { data: printerConfig } = useQuery({
    queryKey: ["printer-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_impressao")
        .select("*")
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const today = new Date();
  const [dateStart, setDateStart] = useState(format(today, "yyyy-MM-dd"));
  const [dateEnd, setDateEnd] = useState(format(today, "yyyy-MM-dd"));
  const [detailPedido, setDetailPedido] = useState<Pedido | null>(null);
  const [newPedidoIds, setNewPedidoIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const repeatAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadRef = useRef(true);

  const toLocalDayBoundaryISO = useCallback((date: string, boundary: "start" | "end") => {
    const [year, month, day] = date.split("-").map(Number);
    const localDate =
      boundary === "start"
        ? new Date(year, month - 1, day, 0, 0, 0, 0)
        : new Date(year, month - 1, day, 23, 59, 59, 999);

    return localDate.toISOString();
  }, []);

  const isTabVisible = usePageVisibility();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["admin-pedidos", dateStart, dateEnd],
    queryFn: async () => {
      const startDate = toLocalDayBoundaryISO(dateStart, "start");
      const endDate = toLocalDayBoundaryISO(dateEnd, "end");

      const { data, error } = await supabase
        .from("pedidos")
        .select("*, clientes:cliente_id(nome_completo, telefone)")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        cliente: p.clientes,
      })) as Pedido[];
    },
    refetchInterval: isTabVisible ? 5000 : false,
  });

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Stop repeat sound when viewing a new order
  const stopRepeatSound = useCallback(() => {
    if (repeatAudioRef.current) {
      repeatAudioRef.current.pause();
      repeatAudioRef.current.currentTime = 0;
      repeatAudioRef.current = null;
    }
  }, []);

  // Detect new orders and trigger notifications
  useEffect(() => {
    const currentIds = new Set(pedidos.map((p) => p.id));

    // Skip on initial load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevIdsRef.current = currentIds;
      return;
    }

    const incoming = pedidos.filter(
      (p) => !prevIdsRef.current.has(p.id) && (p.status === "pendente" || p.status === "aguardando_pagamento")
    );

    if (incoming.length > 0) {
      console.log("[Expedição] Novos pedidos detectados:", incoming.map(p => p.numero_pedido));

      // Mark new pedido IDs for visual highlight
      const ids = new Set(incoming.map((p) => p.id));
      setNewPedidoIds(ids);
      setTimeout(() => setNewPedidoIds(new Set()), 8000);

      // Vibration (moderate)
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }

      // Play sound
      const soundEnabled = printerConfig?.som_novo_pedido_ativo ?? true;
      if (soundEnabled) {
        stopRepeatSound();
        const url = (printerConfig as any)?.som_novo_pedido_url || "/sounds/new-order.mp3";
        const soundUrl = url || "/sounds/new-order.mp3";
        const audio = new Audio(soundUrl);
        audio.volume = ((printerConfig as any)?.som_volume ?? 80) / 100;

        if ((printerConfig as any)?.som_repetir) {
          audio.loop = true;
          repeatAudioRef.current = audio;
        }

        audio.play().catch(() => {});
      }

      // Toast notification for each new order
      incoming.forEach((p) => {
        const formatCurrency = (v: number) =>
          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

        toast({
          title: "🔔 Novo Pedido Recebido",
          description: `Pedido #${p.numero_pedido} — ${p.cliente?.nome_completo || "Cliente"} — ${formatCurrency(p.valor_total)}`,
          duration: 10000,
        });

        // Browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Novo Pedido Recebido", {
            body: `Pedido #${p.numero_pedido}\n${p.cliente?.nome_completo || "Cliente"}\nTotal: ${formatCurrency(p.valor_total)}`,
            icon: "/favicon.ico",
          });
        }
      });

      // Auto-print removed from here — now only triggers when status changes to "em_preparo"
    }

    prevIdsRef.current = currentIds;
  }, [pedidos, printerConfig, storeConfig, toast, stopRepeatSound]);

  // Audio unlock on first user interaction
  useEffect(() => {
    const unlock = () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume().then(() => ctx.close()).catch(() => {});
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Direct realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("expedicao-pedidos-direct")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
        console.log("[Expedição] Evento realtime pedidos:", payload.eventType);
        queryClient.invalidateQueries({ queryKey: ["admin-pedidos"] });
      })
      .subscribe((status) => {
        console.log("[Expedição] Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const grouped = useMemo(() => {
    const map: Record<string, Pedido[]> = {};
    STATUS_COLUMNS.forEach((c) => (map[c.key] = []));
    pedidos.forEach((p) => {
      if (map[p.status]) {
        map[p.status].push(p);
      } else {
        console.warn("[Expedição] Status não reconhecido, ignorando pedido:", p.id, p.status);
      }
    });
    return map;
  }, [pedidos]);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const autoPrintPedido = useCallback((pedido: Pedido) => {
    if (!printerConfig?.impressao_automatica || !printerConfig?.ativo) return;
    const store = {
      name: storeConfig?.name || "Estabelecimento",
      whatsapp: storeConfig?.whatsapp || "",
      address: storeConfig?.address || "",
    };
    const paperWidth = printerConfig?.largura_papel || "80mm";
    const fontOptions = { fontSize: printerConfig?.fonte_tamanho || "12px", bold: printerConfig?.fonte_negrito ?? false, obsFontSize: printerConfig?.fonte_obs_tamanho || "11px", obsColor: printerConfig?.fonte_obs_cor || "#000000" };
    printPedido(pedido, store, paperWidth, fontOptions);
  }, [printerConfig, storeConfig]);

  const updateStatus = async (pedidoId: string, newStatus: string) => {
    setUpdatingId(pedidoId);
    try {
      const nowISO = new Date().toISOString();
      const pedido = pedidos.find((p) => p.id === pedidoId);
      const updateData: Record<string, any> = { status: newStatus, updated_at: nowISO };

      // Set preparo_iniciado_em when entering "em_preparo"
      if (newStatus === "em_preparo") {
        updateData.preparo_iniciado_em = nowISO;
      } else if (newStatus === "pronto") {
        updateData.preparo_finalizado_em = nowISO;
        updateData.espera_iniciada_em = nowISO;
        const start = pedido?.preparo_iniciado_em || pedido?.created_at;
        if (!pedido?.preparo_iniciado_em) {
          updateData.preparo_iniciado_em = pedido?.created_at || nowISO;
        }
        if (start) {
          updateData.tempo_preparo = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
        }
      } else if (newStatus === "aguardando_entregador") {
        if (!pedido?.espera_iniciada_em) {
          updateData.espera_iniciada_em = nowISO;
        }
      } else if (newStatus === "saiu_entrega" || newStatus === "concluido") {
        updateData.pedido_concluido_em = nowISO;
        if (pedido?.espera_iniciada_em) {
          const esperaSec = Math.floor((Date.now() - new Date(pedido.espera_iniciada_em).getTime()) / 1000);
          updateData.tempo_espera = esperaSec;
          updateData.tempo_total = (pedido.tempo_preparo || 0) + esperaSec;
        }
      }

      const { error } = await withTimeout(
        supabase
          .from("pedidos")
          .update(updateData)
          .eq("id", pedidoId)
      );
      if (error) throw error;
      toast({ title: `Status atualizado para "${newStatus}"` });
      queryClient.invalidateQueries({ queryKey: ["admin-pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["kds-pedidos"] });

      // Auto-print ONLY when status changes to "em_preparo"
      if (newStatus === "em_preparo") {
        if (pedido) autoPrintPedido(pedido);
      }
    } catch (err: any) {
      logAndToast(err, "Atualizar status do pedido", toast);
    } finally {
      setUpdatingId(null);
    }
  };

  const [whatsappFallbackUrl, setWhatsappFallbackUrl] = useState<string | null>(null);

  const sendWhatsApp = (pedido: Pedido, statusLabel: string) => {
    if (!pedido.cliente?.telefone) return;
    const phone = pedido.cliente.telefone.replace(/\D/g, "");
    const msg = `Olá ${pedido.cliente?.nome_completo || ""}! Seu pedido #${pedido.numero_pedido} está agora: *${statusLabel}*. Obrigado pela preferência! 🎉`;
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      setWhatsappFallbackUrl(url);
    }
  };

  const handlePrint = (pedido: Pedido) => {
    const store = {
      name: storeConfig?.name || "Estabelecimento",
      whatsapp: storeConfig?.whatsapp || "",
      address: storeConfig?.address || "",
    };
    const paperWidth = printerConfig?.largura_papel || "80mm";
    const fontOptions = { fontSize: printerConfig?.fonte_tamanho || "12px", bold: printerConfig?.fonte_negrito ?? false, obsFontSize: printerConfig?.fonte_obs_tamanho || "11px", obsColor: printerConfig?.fonte_obs_cor || "#000000" };
    printPedido(pedido, store, paperWidth, fontOptions);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleViewDetail = (pedido: Pedido) => {
    // Stop repeat sound when viewing any order
    stopRepeatSound();
    setNewPedidoIds((prev) => {
      const next = new Set(prev);
      next.delete(pedido.id);
      return next;
    });
    setDetailPedido(pedido);
  };

  return (
    <div className="space-y-4">
      {/* Date filter + connection status */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data Final</label>
            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-40" />
          </div>
          <Button
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-pedidos"] })}
          >
            <Search className="mr-1 h-3 w-3" /> Buscar
          </Button>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full ${realtimeStatus === "connected" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-muted-foreground">
              {realtimeStatus === "connected" ? "Online" : "Offline"}
            </span>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {STATUS_COLUMNS.map((col) => {
            const Icon = col.icon;
            const columnPedidos = grouped[col.key] || [];
            return (
              <div key={col.key} className="space-y-2">
                {/* Column header */}
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-white ${col.color}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-bold">{col.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {columnPedidos.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[100px]">
                  {columnPedidos.map((pedido) => {
                    const isNew = newPedidoIds.has(pedido.id);
                    return (
                      <Card
                        key={pedido.id}
                        className={`text-sm shadow-sm hover:shadow-md transition-shadow ${
                          isNew ? "ring-2 ring-success animate-novo-pedido" : ""
                        }`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-primary">#{pedido.numero_pedido}</span>
                              {isNew && (
                                <Badge className="bg-success text-success-foreground text-[9px] px-1.5 py-0">
                                  NOVO
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(pedido.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>

                          <ExpedicaoTimer pedido={pedido} />

                          <p className="font-medium truncate">
                            {pedido.cliente?.nome_completo || "Cliente"}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="font-bold">{formatCurrency(pedido.valor_total)}</span>
                            <Badge
                              variant={pedido.forma_pagamento === "pix_manual" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {pedido.forma_pagamento === "mercado_pago" ? "Mercado Pago" : pedido.forma_pagamento === "pix_manual" ? "PIX Manual" : pedido.forma_pagamento === "cartao_whatsapp" ? "Cartão WhatsApp" : pedido.forma_pagamento}
                            </Badge>
                          </div>

                          {/* Payment status badge */}
                          {pedido.forma_pagamento === "mercado_pago" && PAYMENT_BADGE[pedido.status_pagamento] && (
                            <Badge className={`text-[10px] ${PAYMENT_BADGE[pedido.status_pagamento].className}`}>
                              {PAYMENT_BADGE[pedido.status_pagamento].label}
                            </Badge>
                          )}

                          {pedido.endereco_entrega && (
                            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{pedido.endereco_entrega}</span>
                            </p>
                          )}

                          <div className="flex gap-1 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handlePrint(pedido)}
                            >
                              <Printer className="mr-1 h-3 w-3" /> Imprimir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={() => handleViewDetail(pedido)}
                            >
                              <Eye className="mr-1 h-3 w-3" /> Detalhes
                            </Button>

                            {NEXT_STATUS[pedido.status] && (
                              <Button
                                size="sm"
                                className="flex-1 text-xs h-7"
                                onClick={() => updateStatus(pedido.id, NEXT_STATUS[pedido.status]!)}
                              >
                                <ChevronRight className="mr-1 h-3 w-3" /> Avançar
                              </Button>
                            )}
                          </div>

                          {pedido.status !== "cancelado" && pedido.status !== "concluido" && (
                            <div className="flex gap-1">
                              {["em_preparo", "pronto", "aguardando_entregador", "saiu_entrega"].includes(pedido.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[10px] h-6 flex-1"
                                  onClick={() => {
                                    const label = STATUS_COLUMNS.find((c) => c.key === pedido.status)?.label || pedido.status;
                                    sendWhatsApp(pedido, label);
                                  }}
                                >
                                  <MessageSquare className="mr-1 h-3 w-3" /> WhatsApp
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 text-destructive hover:text-destructive"
                                onClick={() => updateStatus(pedido.id, "cancelado")}
                              >
                                <XCircle className="mr-1 h-3 w-3" /> Cancelar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {columnPedidos.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6">Nenhum pedido</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!detailPedido} onOpenChange={() => setDetailPedido(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido #{detailPedido?.numero_pedido}</DialogTitle>
            <DialogDescription>Detalhes completos do pedido</DialogDescription>
          </DialogHeader>
          {detailPedido && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs">Cliente</span>
                  <p className="font-medium">{detailPedido.cliente?.nome_completo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Telefone</span>
                  <p className="font-medium">{detailPedido.cliente?.telefone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Tipo</span>
                  <p className="font-medium">{detailPedido.tipo_entrega}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Pagamento</span>
                  <p className="font-medium">{detailPedido.forma_pagamento === "mercado_pago" ? "Mercado Pago (PIX / Cartão)" : detailPedido.forma_pagamento === "pix_manual" ? "PIX Manual" : detailPedido.forma_pagamento === "cartao_whatsapp" ? "Cartão via WhatsApp" : detailPedido.forma_pagamento}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Status Pagamento</span>
                  <p className="font-medium capitalize">{detailPedido.status_pagamento}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Horário</span>
                  <p className="font-medium">
                    {format(new Date(detailPedido.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {detailPedido.endereco_entrega && (
                <div>
                  <span className="text-muted-foreground text-xs">Endereço</span>
                  <p className="font-medium">{detailPedido.endereco_entrega}</p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground text-xs">Itens</span>
                <div className="mt-1 space-y-1">
                  {(Array.isArray(detailPedido.itens) ? detailPedido.itens : []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between rounded bg-muted/50 px-2 py-1">
                      <span>
                        {item.quantidade}x {item.nome}
                        {item.opcoes?.length > 0 && (
                          <span className="text-muted-foreground text-xs"> ({item.opcoes.join(", ")})</span>
                        )}
                        {item.observacao && (
                          <span className="text-muted-foreground text-xs block">Obs: {item.observacao}</span>
                        )}
                      </span>
                      <span className="font-medium">{formatCurrency(item.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detailPedido.valor_frete != null && detailPedido.valor_frete > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Frete {detailPedido.distancia_km ? `(${detailPedido.distancia_km.toFixed(1)} km)` : ""}
                  </span>
                  <span className="font-medium">{formatCurrency(detailPedido.valor_frete)}</span>
                </div>
              )}

              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(detailPedido.valor_total)}</span>
              </div>

              {/* Print + Status change buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs"
                  onClick={() => handlePrint(detailPedido)}
                >
                  <Printer className="mr-1 h-3 w-3" /> Imprimir Comanda
                </Button>
                {STATUS_COLUMNS.filter((c) => c.key !== detailPedido.status).map((col) => {
                  const Icon = col.icon;
                  return (
                    <Button
                      key={col.key}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        updateStatus(detailPedido.id, col.key);
                        setDetailPedido({ ...detailPedido, status: col.key });
                      }}
                    >
                      <Icon className="mr-1 h-3 w-3" /> {col.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {whatsappFallbackUrl && (
        <WhatsAppFallbackModal url={whatsappFallbackUrl} onClose={() => setWhatsappFallbackUrl(null)} />
      )}
    </div>
  );
};

export default AdminExpedicao;
