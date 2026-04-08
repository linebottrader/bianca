import { useMemo } from "react";
import type { KDSPedido } from "./KDSCard";

type Props = {
  pedidos: KDSPedido[];
  tempoAlerta: number;
};

export default function KDSDashboard({ pedidos, tempoAlerta }: Props) {
  const stats = useMemo(() => {
    const now = Date.now();
    const finalizados = pedidos.filter((p) => ["concluido", "saiu_entrega"].includes(p.status));
    const ativos = pedidos.filter((p) => ["pendente", "em_preparo", "pronto"].includes(p.status));
    const atrasados = ativos.filter((p) => {
      const start = p.preparo_iniciado_em || p.created_at;
      return (now - new Date(start).getTime()) / 60000 >= tempoAlerta;
    });

    // Use saved tempo_preparo when available, fallback to old calc
    const temposPreparo = finalizados
      .map((p) => {
        if (p.tempo_preparo != null) return p.tempo_preparo / 60;
        if (p.updated_at) return (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 60000;
        return null;
      })
      .filter((t): t is number => t !== null);
    const tempoMedioPreparo = temposPreparo.length ? Math.round(temposPreparo.reduce((a, b) => a + b, 0) / temposPreparo.length) : 0;

    const temposTotal = finalizados
      .map((p) => {
        if (p.tempo_total != null) return p.tempo_total / 60;
        if (p.updated_at) return (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 60000;
        return null;
      })
      .filter((t): t is number => t !== null);
    const tempoMedioTotal = temposTotal.length ? Math.round(temposTotal.reduce((a, b) => a + b, 0) / temposTotal.length) : 0;

    return { total: pedidos.length, ativos: ativos.length, atrasados: atrasados.length, tempoMedioPreparo, tempoMedioTotal };
  }, [pedidos, tempoAlerta]);

  const cards = [
    { label: "Pedidos hoje", value: stats.total, color: "text-primary" },
    { label: "Ativos", value: stats.ativos, color: "text-blue-500" },
    { label: "Atrasados", value: stats.atrasados, color: stats.atrasados > 0 ? "text-destructive" : "text-green-500" },
    { label: "Preparo médio", value: `${stats.tempoMedioPreparo} min`, color: "text-muted-foreground" },
    { label: "Tempo total médio", value: `${stats.tempoMedioTotal} min`, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
          <div className="text-xs text-muted-foreground">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
