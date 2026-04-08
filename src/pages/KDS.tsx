import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useSearchParams } from "react-router-dom";
import KDSCard, { type KDSPedido } from "@/components/kds/KDSCard";
import KDSDashboard from "@/components/kds/KDSDashboard";
import KDSHistory from "@/components/kds/KDSHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { withTimeout, logAndToast } from "@/utils/adminUtils";
import { printPedido } from "@/utils/printReceipt";
import { useStoreConfig } from "@/hooks/useStoreData";
import { useAuth } from "@/hooks/useAuth";
import { Maximize, Minimize, Clock, BarChart3, History } from "lucide-react";
import { format } from "date-fns";

const KDS_COLUMNS = [
  { key: "pendente", label: "🟡 PENDENTES", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "em_preparo", label: "🔵 EM PREPARO", bg: "bg-blue-500/10 border-blue-500/30" },
  { key: "pronto", label: "🟢 PRONTO", bg: "bg-green-500/10 border-green-500/30" },
  { key: "aguardando_entregador", label: "🟣 AGUARDANDO ENTREGADOR", bg: "bg-purple-500/10 border-purple-500/30" },
] as const;

/** Convert local date string to UTC ISO for correct Supabase filtering */
function toLocalDayBoundaryISO(dateStr: string, boundary: "start" | "end"): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = boundary === "start"
    ? new Date(year, month - 1, day, 0, 0, 0, 0)
    : new Date(year, month - 1, day, 23, 59, 59, 999);
  return d.toISOString();
}

export default function KDS() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin, isManager, isKds, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const estacaoFilter = searchParams.get("estacao")?.toLowerCase() || null;
  const hasKdsAccess = !!user && (isAdmin || isManager || isKds);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [view, setView] = useState<"kds" | "dashboard" | "history">("kds");
  const [stationFilter, setStationFilter] = useState<string>("todas");
  const [now, setNow] = useState(new Date());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newPedidoIds, setNewPedidoIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // KDS Config
  const { data: kdsConfig } = useQuery({
    queryKey: ["kds-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kds_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
    enabled: hasKdsAccess,
  });

  const showAguardando = kdsConfig?.mostrar_aguardando_entregador ?? false;
  const tempoAlerta = kdsConfig?.tempo_alerta_minutos ?? 20;
  const estacoes = kdsConfig?.estacoes || ["Cozinha", "Lanches", "Bebidas", "Sobremesas"];
  const somEnabled = kdsConfig?.som_novo_pedido ?? true;
  const vozEnabled = kdsConfig?.voz_novo_pedido ?? true;

  // Printer config for auto-print on "em_preparo"
  const { data: printerConfig } = useQuery({
    queryKey: ["printer-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_impressao").select("*").limit(1).single();
      if (error) return null;
      return data;
    },
    staleTime: 60_000,
    enabled: hasKdsAccess,
  });

  const { data: storeConfig } = useStoreConfig();

  // Today's pedidos with timezone-safe filtering
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: pedidos = [] } = useQuery({
    queryKey: ["kds-pedidos", today],
    queryFn: async () => {
      const startISO = toLocalDayBoundaryISO(today, "start");
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, status, created_at, updated_at, itens, valor_total, tipo_entrega, endereco_entrega, forma_pagamento, observacoes, preparo_iniciado_em, preparo_finalizado_em, espera_iniciada_em, pedido_concluido_em, tempo_preparo, tempo_espera, tempo_total, clientes:cliente_id(nome_completo, telefone)")
        .gte("created_at", startISO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        cliente: p.clientes,
      })) as KDSPedido[];
    },
    refetchInterval: hasKdsAccess ? 5000 : false,
    enabled: hasKdsAccess,
  });

  // Direct realtime subscription as safety net
  useEffect(() => {
    if (!hasKdsAccess) return;

    const channel = supabase
      .channel("kds-pedidos-direct")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
        console.log("[KDS] Evento realtime pedidos:", payload.eventType);
        queryClient.invalidateQueries({ queryKey: ["kds-pedidos"] });
      })
      .subscribe((status) => {
        console.log("[KDS] Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, hasKdsAccess]);

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

  // New order detection
  useEffect(() => {
    const currentIds = new Set(pedidos.map((p) => p.id));
    const newIds = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevIdsRef.current.has(id)) newIds.add(id);
    });

    if (newIds.size > 0 && prevIdsRef.current.size > 0) {
      console.log("[KDS] Novos pedidos detectados:", [...newIds]);
      setNewPedidoIds(newIds);

      // Vibration (moderate)
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }

      if (somEnabled) {
        try {
          const soundUrl = printerConfig?.som_novo_pedido_url || "/sounds/new-order.mp3";
          const audio = new Audio(soundUrl || "/sounds/new-order.mp3");
          audio.volume = (printerConfig as any)?.som_volume != null ? (printerConfig as any).som_volume : 0.8;
          audio.play().catch(() => console.warn("[KDS] Som bloqueado pelo navegador"));
        } catch {}
      }
      if (vozEnabled && "speechSynthesis" in window) {
        const utt = new SpeechSynthesisUtterance("Novo pedido recebido na cozinha");
        utt.lang = "pt-BR";
        utt.rate = 1;
        speechSynthesis.speak(utt);
      }
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 200);
      setTimeout(() => setNewPedidoIds(new Set()), 5000);
    }
    prevIdsRef.current = currentIds;
  }, [pedidos, somEnabled, vozEnabled]);

  const updateStatus = useCallback(async (pedidoId: string, newStatus: string) => {
    setUpdatingId(pedidoId);
    try {
      const nowISO = new Date().toISOString();
      const pedido = pedidos.find((p) => p.id === pedidoId);
      const updateData: Record<string, any> = { status: newStatus, updated_at: nowISO };

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
        supabase.from("pedidos").update(updateData).eq("id", pedidoId)
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["kds-pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pedidos"] });

      if (newStatus === "em_preparo" && printerConfig?.impressao_automatica && printerConfig?.ativo && pedido) {
        const store = {
          name: storeConfig?.name || "Estabelecimento",
          whatsapp: storeConfig?.whatsapp || "",
          address: storeConfig?.address || "",
        };
        const paperWidth = printerConfig?.largura_papel || "80mm";
        const fontOptions = {
          fontSize: printerConfig?.fonte_tamanho || "12px",
          bold: printerConfig?.fonte_negrito ?? false,
          obsFontSize: printerConfig?.fonte_obs_tamanho || "11px",
          obsColor: printerConfig?.fonte_obs_cor || "#000000",
        };
        printPedido(pedido as any, store, paperWidth, fontOptions);
      }
    } catch (err: any) {
      logAndToast(err, "Atualizar status", toast);
    } finally {
      setUpdatingId(null);
    }
  }, [queryClient, toast, pedidos, printerConfig, storeConfig]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const filteredPedidos = useMemo(() => {
    let list = pedidos;
    const stFilter = estacaoFilter || (stationFilter !== "todas" ? stationFilter.toLowerCase() : null);
    if (stFilter) {
      list = list.filter((p) => {
        const itens = Array.isArray(p.itens) ? p.itens : [];
        return itens.some((i: any) => (i.estacao_preparo || "Cozinha").toLowerCase() === stFilter);
      });
    }
    return list;
  }, [pedidos, estacaoFilter, stationFilter]);

  const sortPedidos = useCallback((list: KDSPedido[]) => {
    const nowMs = Date.now();
    return [...list].sort((a, b) => {
      const aDelay = (nowMs - new Date(a.created_at).getTime()) / 60000 >= tempoAlerta ? 1 : 0;
      const bDelay = (nowMs - new Date(b.created_at).getTime()) / 60000 >= tempoAlerta ? 1 : 0;
      if (aDelay !== bDelay) return bDelay - aDelay;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tempoAlerta]);

  const grouped = useMemo(() => {
    const map: Record<string, KDSPedido[]> = {};
    KDS_COLUMNS.forEach((c) => (map[c.key] = []));
    filteredPedidos.forEach((p) => {
      if (map[p.status]) map[p.status].push(p);
    });
    Object.keys(map).forEach((k) => {
      map[k] = sortPedidos(map[k]);
    });
    return map;
  }, [filteredPedidos, sortPedidos]);

  const columns = showAguardando ? KDS_COLUMNS : KDS_COLUMNS.filter((c) => c.key !== "aguardando_entregador");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Verificando acesso ao KDS...
      </div>
    );
  }

  if (!hasKdsAccess) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-4 py-2 flex items-center gap-3 shrink-0">
        <h1 className="text-xl font-black tracking-wider text-primary">KDS</h1>
        <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
          <Clock className="h-4 w-4" />
          {format(now, "HH:mm:ss")}
        </div>

        <div className="flex-1" />

        {!estacaoFilter && (
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="todas">Todas Estações</option>
            {estacoes.map((e: string) => (
              <option key={e} value={e.toLowerCase()}>{e}</option>
            ))}
          </select>
        )}

        {estacaoFilter && (
          <Badge variant="secondary" className="text-xs">Estação: {estacaoFilter}</Badge>
        )}

        <Button variant={view === "kds" ? "default" : "outline"} size="sm" onClick={() => setView("kds")} className="h-8 text-xs">
          KDS
        </Button>
        <Button variant={view === "dashboard" ? "default" : "outline"} size="sm" onClick={() => setView("dashboard")} className="h-8 text-xs">
          <BarChart3 className="mr-1 h-3 w-3" /> Dashboard
        </Button>
        <Button variant={view === "history" ? "default" : "outline"} size="sm" onClick={() => setView("history")} className="h-8 text-xs">
          <History className="mr-1 h-3 w-3" /> Histórico
        </Button>

        <Button variant="outline" size="sm" onClick={toggleFullscreen} className="h-8 text-xs">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        {view === "dashboard" && <KDSDashboard pedidos={filteredPedidos} tempoAlerta={tempoAlerta} />}
        {view === "history" && <KDSHistory pedidos={filteredPedidos} />}
        {view === "kds" && (
          <div className={`grid gap-4 h-full ${columns.length === 4 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
            {columns.map((col) => {
              const colPedidos = grouped[col.key] || [];
              return (
                <div key={col.key} className="flex flex-col min-h-0">
                  <div className={`rounded-t-xl border-2 px-4 py-2 font-bold text-sm flex items-center justify-between ${col.bg}`}>
                    {col.label}
                    <Badge variant="secondary">{colPedidos.length}</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 rounded-b-xl border-2 border-t-0 border-border bg-muted/20 p-3">
                    {colPedidos.map((p) => (
                      <KDSCard
                        key={p.id}
                        pedido={p}
                        onStatusChange={updateStatus}
                        isNew={newPedidoIds.has(p.id)}
                        tempoAlerta={tempoAlerta}
                        showAguardando={showAguardando}
                        updating={updatingId === p.id}
                      />
                    ))}
                    {colPedidos.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-12">Nenhum pedido</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}