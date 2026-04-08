import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useSubmitReview } from "@/hooks/useReviews";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  clienteId: string;
  nomeCliente: string;
};

const ReviewModal = ({ open, onOpenChange, pedidoId, clienteId, nomeCliente }: Props) => {
  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const submit = useSubmitReview();

  const handleSubmit = () => {
    if (nota === 0) return;
    submit.mutate(
      { cliente_id: clienteId, pedido_id: pedidoId, nome_cliente: nomeCliente, nota, comentario: comentario.trim() },
      { onSuccess: () => { onOpenChange(false); setNota(0); setComentario(""); } }
    );
  };

  const displayNota = hoverNota || nota;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar Pedido</DialogTitle>
          <DialogDescription>Como foi sua experiência?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Stars */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNota(s)}
                onMouseEnter={() => setHoverNota(s)}
                onMouseLeave={() => setHoverNota(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    s <= displayNota ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
          {displayNota > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"][displayNota]}
            </p>
          )}

          {/* Comment */}
          <div className="space-y-1">
            <Textarea
              placeholder="Deixe seu comentário (opcional, máx. 300 caracteres)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 300))}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comentario.length}/300</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={nota === 0 || submit.isPending}
            className="w-full"
          >
            {submit.isPending ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
