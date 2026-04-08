import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Star, BadgeCheck, Store } from "lucide-react";
import { useApprovedReviews, useReviewStats } from "@/hooks/useReviews";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const StarDisplay = ({ nota }: { nota: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={cn("h-3.5 w-3.5", s <= nota ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")}
      />
    ))}
  </div>
);

const ReviewsDisplayModal = ({ open, onOpenChange }: Props) => {
  const { data: reviews, isLoading } = useApprovedReviews();
  const { average, total, distribution } = useReviewStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Avaliações
          </DialogTitle>
          <DialogDescription>{total} avaliações verificadas</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary */}
            <div className="flex items-center gap-6 rounded-xl bg-muted/50 p-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{average.toFixed(1)}</p>
                <StarDisplay nota={Math.round(average)} />
                <p className="text-xs text-muted-foreground mt-1">{total} avaliações</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {distribution.map(({ star, count, percent }) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right">{star}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Progress value={percent} className="h-2 flex-1" />
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews list */}
            {reviews && reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {r.nome_cliente?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{r.nome_cliente}</p>
                          <StarDisplay nota={r.nota} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        <span>Verificado</span>
                      </div>
                    </div>
                    {r.comentario && (
                      <p className="text-sm text-muted-foreground">{r.comentario}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                    {r.resposta_loja && (
                      <div className="rounded-md bg-muted/70 p-2.5 mt-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Store className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold">Resposta da loja</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.resposta_loja}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewsDisplayModal;
