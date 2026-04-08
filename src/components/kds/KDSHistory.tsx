import { useMemo } from "react";
import type { KDSPedido } from "./KDSCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Props = { pedidos: KDSPedido[] };

function fmtMin(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function KDSHistory({ pedidos }: Props) {
  const finalizados = useMemo(() => {
    return pedidos
      .filter((p) => ["concluido", "saiu_entrega", "cancelado"].includes(p.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);
  }, [pedidos]);

  const tempos = useMemo(() => {
    const vals = finalizados
      .filter((p) => p.status !== "cancelado")
      .map((p) => {
        if (p.tempo_total != null) return p.tempo_total / 60;
        if (p.updated_at) return (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 60000;
        return null;
      })
      .filter((t): t is number => t !== null);
    if (!vals.length) return { medio: 0, max: 0, min: 0 };
    return {
      medio: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      max: Math.round(Math.max(...vals)),
      min: Math.round(Math.min(...vals)),
    };
  }, [finalizados]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-xl font-black text-primary">{tempos.medio} min</div>
          <div className="text-xs text-muted-foreground">Tempo Médio</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-xl font-black text-destructive">{tempos.max} min</div>
          <div className="text-xs text-muted-foreground">Tempo Máximo</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-xl font-black text-green-500">{tempos.min} min</div>
          <div className="text-xs text-muted-foreground">Tempo Mínimo</div>
        </div>
      </div>

      {/* Table header */}
      <div className="hidden md:flex items-center gap-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase">
        <span className="w-20">Pedido</span>
        <span className="flex-1">Cliente</span>
        <span className="w-16 text-center">Hora</span>
        <span className="w-20 text-center">Preparo</span>
        <span className="w-20 text-center">Espera</span>
        <span className="w-20 text-center">Total</span>
        <span className="w-20 text-right">Status</span>
      </div>

      <div className="space-y-1">
        {finalizados.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-bold text-primary w-20">#{p.numero_pedido}</span>
            <span className="flex-1 truncate">{p.cliente?.nome_completo || "Cliente"}</span>
            <span className="text-xs text-muted-foreground w-16 text-center">
              {format(new Date(p.created_at), "HH:mm", { locale: ptBR })}
            </span>
            <span className="text-xs font-mono w-20 text-center">{fmtMin(p.tempo_preparo)}</span>
            <span className="text-xs font-mono w-20 text-center">{fmtMin(p.tempo_espera)}</span>
            <span className="text-xs font-mono font-bold w-20 text-center">{fmtMin(p.tempo_total)}</span>
            <span className={`text-xs font-bold w-20 text-right ${p.status === "cancelado" ? "text-destructive" : "text-green-500"}`}>
              {p.status === "cancelado" ? "Cancelado" : "Concluído"}
            </span>
          </div>
        ))}
        {finalizados.length === 0 && (
          <p className="py-8 text-center text-muted-foreground text-sm">Nenhum pedido finalizado hoje.</p>
        )}
      </div>
    </div>
  );
}
