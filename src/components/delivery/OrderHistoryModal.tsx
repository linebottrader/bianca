import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/contexts/CustomerAuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Eye, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import ReviewModal from "./ReviewModal";
import { useOrderReview } from "@/hooks/useReviews";

type PedidoRow = {
  id: string;
  numero_pedido: string;
  status: string;
  valor_total: number;
  tipo_entrega: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_preparo: "Em Preparo",
  pronto: "Pronto",
  saiu_entrega: "Saiu p/ Entrega",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_preparo: "bg-blue-100 text-blue-800",
  pronto: "bg-green-100 text-green-800",
  saiu_entrega: "bg-purple-100 text-purple-800",
  concluido: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const OrderHistoryModal = ({ open, onOpenChange }: Props) => {
  const { cliente } = useCustomer();
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewPedido, setReviewPedido] = useState<PedidoRow | null>(null);

  useEffect(() => {
    if (!open || !cliente) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("pedidos")
          .select("id, numero_pedido, status, valor_total, tipo_entrega, created_at")
          .eq("cliente_id", cliente.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (qErr) throw new Error(qErr.message);
        setPedidos((data as PedidoRow[]) || []);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar pedidos.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [open, cliente]);

  const handleTrack = (numeroPedido: string) => {
    localStorage.setItem("pedido_codigo", numeroPedido);
    onOpenChange(false);
    // Small delay so the OrderTracker picks up the new code
    setTimeout(() => {
      window.dispatchEvent(new Event("storage"));
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Meus Pedidos
          </DialogTitle>
          <DialogDescription>Histórico dos seus pedidos</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="text-center py-6 text-sm text-destructive">{error}</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">#{p.numero_pedido}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[p.status] || "bg-muted text-muted-foreground")}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(p.created_at).toLocaleDateString("pt-BR")} {new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.valor_total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.tipo_entrega}</span>
                  <div className="flex gap-1">
                    {p.status === "concluido" && (
                      <ReviewButton pedido={p} cliente={cliente} onReview={setReviewPedido} />
                    )}
                    {p.status !== "concluido" && p.status !== "cancelado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleTrack(p.numero_pedido)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Acompanhar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {reviewPedido && cliente && (
          <ReviewModal
            open={!!reviewPedido}
            onOpenChange={(v) => !v && setReviewPedido(null)}
            pedidoId={reviewPedido.id}
            clienteId={cliente.id}
            nomeCliente={cliente.nome_completo}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Sub-component to check if review exists per order
const ReviewButton = ({ pedido, cliente, onReview }: { pedido: PedidoRow; cliente: any; onReview: (p: PedidoRow) => void }) => {
  const { data: existingReview, isLoading } = useOrderReview(pedido.id);
  
  if (isLoading) return null;
  if (existingReview) {
    return (
      <span className="text-xs text-emerald-600 flex items-center gap-1">
        <Star className="h-3 w-3 fill-current" /> Avaliado
      </span>
    );
  }
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReview(pedido)}>
      <Star className="h-3 w-3 mr-1" /> Avaliar
    </Button>
  );
};

export default OrderHistoryModal;
