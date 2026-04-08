import { useState, useEffect, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, AlertTriangle, ChevronRight, MapPin, Timer } from "lucide-react";

export type KDSPedido = {
  id: string;
  numero_pedido: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  itens: any;
  valor_total: number;
  tipo_entrega: string;
  endereco_entrega: string | null;
  forma_pagamento: string;
  observacoes: string | null;
  cliente?: { nome_completo: string; telefone: string } | null;
  preparo_iniciado_em: string | null;
  preparo_finalizado_em: string | null;
  espera_iniciada_em: string | null;
  pedido_concluido_em: string | null;
  tempo_preparo: number | null;
  tempo_espera: number | null;
  tempo_total: number | null;
};

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTimerColor(seconds: number): string {
  const mins = seconds / 60;
  if (mins < 10) return "text-green-500";
  if (mins < 20) return "text-yellow-500";
  return "text-red-500";
}

type Props = {
  pedido: KDSPedido;
  onStatusChange: (id: string, status: string) => void;
  isNew?: boolean;
  tempoAlerta: number;
  showAguardando: boolean;
  updating?: boolean;
};

function KDSCard({ pedido, onStatusChange, isNew, tempoAlerta, showAguardando, updating }: Props) {
  const [now, setNow] = useState(Date.now());

  // Tick every second only for active orders
  const isActive = ["pendente", "em_preparo", "pronto", "aguardando_entregador"].includes(pedido.status);
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // Calculate prep timer
  const preparoElapsed = useMemo(() => {
    if (pedido.tempo_preparo != null) return pedido.tempo_preparo; // already saved
    const start = pedido.preparo_iniciado_em || pedido.created_at;
    // If prep is finished, calculate from timestamps
    if (pedido.preparo_finalizado_em) {
      return Math.max(0, Math.floor((new Date(pedido.preparo_finalizado_em).getTime() - new Date(start).getTime()) / 1000));
    }
    // Still in prep phase — live counter
    if (["pendente", "em_preparo"].includes(pedido.status)) {
      return Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
    }
    // Fallback for orders in pronto/later without saved data (legacy)
    if (pedido.updated_at) {
      return Math.max(0, Math.floor((new Date(pedido.updated_at).getTime() - new Date(start).getTime()) / 1000));
    }
    return 0;
  }, [pedido, now]);

  // Calculate wait timer
  const esperaElapsed = useMemo(() => {
    if (pedido.tempo_espera != null) return pedido.tempo_espera; // already saved
    if (!pedido.espera_iniciada_em) return 0;
    if (pedido.pedido_concluido_em) {
      return Math.floor((new Date(pedido.pedido_concluido_em).getTime() - new Date(pedido.espera_iniciada_em).getTime()) / 1000);
    }
    if (["pronto", "aguardando_entregador"].includes(pedido.status)) {
      return Math.max(0, Math.floor((now - new Date(pedido.espera_iniciada_em).getTime()) / 1000));
    }
    return 0;
  }, [pedido, now]);

  // Total elapsed for alert check
  const totalElapsed = preparoElapsed + esperaElapsed;
  const isAtrasado = totalElapsed / 60 >= tempoAlerta;

  // Which timer is currently active
  const isPreparoPhase = ["pendente", "em_preparo"].includes(pedido.status);
  const isEsperaPhase = ["pronto", "aguardando_entregador"].includes(pedido.status);

  // Parse items individually (no grouping, to preserve per-item observations)
  const parsedItems = useMemo(() => {
    const raw = Array.isArray(pedido.itens) ? pedido.itens : [];
    return raw.map((item: any) => ({
      nome: item.nome || "Item",
      quantidade: item.quantidade || 1,
      observacao: item.observacao || item.observacoes || "",
      opcoes: Array.isArray(item.opcoes) ? item.opcoes : [],
    }));
  }, [pedido.itens]);

  // Estimated prep time
  const tempoEstimado = useMemo(() => {
    const raw = Array.isArray(pedido.itens) ? pedido.itens : [];
    const tempos = raw.map((i: any) => i.tempo_preparo || 10);
    return Math.max(...tempos, 10);
  }, [pedido.itens]);

  const nextStatus: Record<string, string> = {
    pendente: "em_preparo",
    em_preparo: "pronto",
    pronto: showAguardando ? "aguardando_entregador" : "saiu_entrega",
    aguardando_entregador: "saiu_entrega",
  };

  const actionLabel: Record<string, string> = {
    pendente: "▶ INICIAR",
    em_preparo: "✓ PRONTO",
    pronto: showAguardando ? "🚚 ENTREGADOR" : "🚚 ENVIAR",
    aguardando_entregador: "🚚 ENVIAR",
  };

  return (
    <div
      className={`rounded-xl border-2 bg-card p-4 transition-all ${
        isNew ? "animate-pulse border-primary shadow-lg shadow-primary/20" : ""
      } ${isAtrasado ? "border-destructive" : "border-border"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-black text-primary">#{pedido.numero_pedido}</span>
        <div className="flex flex-col items-end gap-0.5">
          {/* Active timer */}
          {isPreparoPhase && (
            <div className={`flex items-center gap-1 text-lg font-mono font-bold ${getTimerColor(preparoElapsed)}`}>
              <Clock className="h-4 w-4" />
              <span className="text-xs font-sans mr-1">Preparo</span>
              {formatTime(preparoElapsed)}
            </div>
          )}
          {isEsperaPhase && (
            <>
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Clock className="h-3 w-3" />
                Preparo: {formatTime(preparoElapsed)}
              </div>
              <div className={`flex items-center gap-1 text-lg font-mono font-bold ${getTimerColor(esperaElapsed)}`}>
                <Timer className="h-4 w-4" />
                <span className="text-xs font-sans mr-1">Espera</span>
                {formatTime(esperaElapsed)}
              </div>
            </>
          )}
        </div>
      </div>

      {isAtrasado && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 mb-3 text-destructive font-bold text-sm">
          <AlertTriangle className="h-4 w-4" /> PEDIDO ATRASADO
        </div>
      )}

      {/* Client */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold truncate">{pedido.cliente?.nome_completo || "Cliente"}</span>
      </div>

      {/* Delivery info */}
      {pedido.endereco_entrega && (
        <div className="flex items-start gap-2 mb-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{pedido.endereco_entrega}</span>
        </div>
      )}

      {/* Estimated time */}
      <div className="text-xs text-muted-foreground mb-3">
        ⏱ Tempo estimado: <span className="font-bold">{tempoEstimado} min</span>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3">
        {parsedItems.map((item, i) => (
          <div key={i} className="text-sm">
            <span className="font-bold">
              {item.quantidade}x {item.nome}
            </span>
            {item.opcoes.length > 0 && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {item.opcoes.map((op: string, j: number) => (
                  <div key={j} className="text-xs text-muted-foreground">+ {op}</div>
                ))}
              </div>
            )}
            {item.observacao && (
              <div className="ml-4 mt-0.5 rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                ⚠ {item.observacao.toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Global observations */}
      {pedido.observacoes && (
        <div className="rounded bg-yellow-500/15 px-3 py-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-3">
          ⚠ {pedido.observacoes.toUpperCase()}
        </div>
      )}

      {/* Action button */}
      {nextStatus[pedido.status] && (
        <Button
          className="w-full h-12 text-base font-bold"
          onClick={() => onStatusChange(pedido.id, nextStatus[pedido.status])}
          disabled={updating}
        >
          {actionLabel[pedido.status] || "Avançar"} <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

const MemoizedKDSCard = memo(KDSCard);
MemoizedKDSCard.displayName = "KDSCard";
export default MemoizedKDSCard;
