import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, ChefHat, CheckCircle2, Truck, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "pendente", label: "Pedido Confirmado", icon: Clock },
  { key: "em_preparo", label: "Em Preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: CheckCircle2 },
  { key: "aguardando_entregador", label: "Aguardando Entregador", icon: Truck },
  { key: "saiu_entrega", label: "Saiu para Entrega", icon: Truck },
  { key: "concluido", label: "Entregue", icon: Package },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pendente: 0, em_preparo: 1, pronto: 2, aguardando_entregador: 3, saiu_entrega: 4, concluido: 5, cancelado: -1,
};

const OrderTracker = () => {
  const [open, setOpen] = useState(false);
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  const codigoPedido = typeof window !== "undefined" ? localStorage.getItem("pedido_codigo") : null;

  const cleanupStaleOrder = useCallback(() => {
    localStorage.removeItem("pedido_codigo");
    setVisible(false);
  }, []);

  const fetchPedido = useCallback(async () => {
    if (!codigoPedido) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("pedidos")
        .select("numero_pedido, status, status_pagamento, valor_total, created_at, tipo_entrega, updated_at, itens, forma_pagamento")
        .eq("numero_pedido", codigoPedido)
        .maybeSingle();

      if (queryError) throw new Error(queryError.message);

      if (!data) {
        cleanupStaleOrder();
        return;
      }

      // Auto-cleanup completed orders older than 2h
      if (data.status === "concluido" && data.updated_at) {
        const completedAt = new Date(data.updated_at).getTime();
        if (Date.now() - completedAt > 2 * 60 * 60 * 1000) {
          cleanupStaleOrder();
          return;
        }
      }

      setPedido(data);
    } catch (err: any) {
      setError(err.message || "Não foi possível carregar o pedido.");
      setPedido(null);
    } finally {
      setLoading(false);
    }
  }, [codigoPedido, cleanupStaleOrder]);

  useEffect(() => {
    if (open && codigoPedido) fetchPedido();
  }, [open, codigoPedido, fetchPedido]);

  // Validate on mount
  useEffect(() => {
    if (codigoPedido) fetchPedido();
  }, [codigoPedido, fetchPedido]);

  // Realtime subscription
  useEffect(() => {
    if (!codigoPedido) return;
    const channel = supabase
      .channel("order-tracking")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, (payload) => {
        if ((payload.new as any).numero_pedido === codigoPedido) {
          setPedido((prev: any) => (prev ? { ...prev, ...payload.new } : payload.new));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [codigoPedido]);

  // Removed polling — realtime subscription already handles updates

  if (!codigoPedido || !visible) return null;

  const currentIndex = pedido ? (STATUS_INDEX[pedido.status] ?? -1) : -1;
  const isCancelled = pedido?.status === "cancelado";
  const progressPercent = isCancelled ? 0 : currentIndex >= 0 ? ((currentIndex + 1) / STEPS.length) * 100 : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:opacity-90 transition-opacity lg:bottom-6"
      >
        <Package className="h-5 w-5" />
        <span className="text-sm font-bold">Acompanhar Pedido</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedido #{codigoPedido}
            </DialogTitle>
            <DialogDescription>Acompanhe o status do seu pedido em tempo real</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : !pedido ? (
            <p className="text-center py-6 text-muted-foreground text-sm">Pedido não encontrado.</p>
          ) : (
            <div className="space-y-5">
              {isCancelled ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="font-bold text-destructive">Pedido Cancelado</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(progressPercent)}%</p>
                  </div>
                  <div className="space-y-0">
                    {STEPS.map((step, i) => {
                      const Icon = step.icon;
                      const isComplete = i <= currentIndex;
                      const isCurrent = i === currentIndex;
                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors", isComplete ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background text-muted-foreground/40")}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {i < STEPS.length - 1 && <div className={cn("w-0.5 h-6", i < currentIndex ? "bg-primary" : "bg-muted-foreground/20")} />}
                          </div>
                          <div className="pt-1">
                            <p className={cn("text-sm font-medium", isComplete ? "text-foreground" : "text-muted-foreground/50")}>
                              {step.label}
                              {isCurrent && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <p><span className="font-semibold">Total:</span> {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pedido.valor_total)}</p>
                <p><span className="font-semibold">Tipo:</span> {pedido.tipo_entrega}</p>
                <p><span className="font-semibold">Pagamento:</span> {pedido.forma_pagamento}</p>
                {pedido.created_at && (
                  <p><span className="font-semibold">Horário:</span> {new Date(pedido.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                )}
              </div>
              {pedido.itens && Array.isArray(pedido.itens) && pedido.itens.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                  <p className="font-semibold mb-1">Itens:</p>
                  {(pedido.itens as any[]).map((item: any, idx: number) => (
                    <p key={idx} className="text-muted-foreground">
                      {item.quantity || item.quantidade || 1}x {item.name || item.nome || "Item"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderTracker;
