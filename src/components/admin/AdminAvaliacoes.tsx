import { useState } from "react";
import { useAdminReviews, useApproveReview, useRespondReview, useDeleteReview, Review } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, CheckCircle2, XCircle, MessageSquare, Trash2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FilterType = "all" | "pending" | "approved";

const StarDisplay = ({ nota }: { nota: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={cn("h-4 w-4", s <= nota ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")}
      />
    ))}
  </div>
);

const AdminAvaliacoes = () => {
  const { data: reviews, isLoading } = useAdminReviews();
  const approve = useApproveReview();
  const respond = useRespondReview();
  const remove = useDeleteReview();
  const [filter, setFilter] = useState<FilterType>("all");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");

  const filtered = reviews?.filter((r) => {
    if (filter === "pending") return !r.aprovado;
    if (filter === "approved") return r.aprovado;
    return true;
  }) || [];

  const pendingCount = reviews?.filter(r => !r.aprovado).length || 0;
  const approvedCount = reviews?.filter(r => r.aprovado).length || 0;
  const averageRating = reviews && reviews.length > 0
    ? (reviews.filter(r => r.aprovado).reduce((sum, r) => sum + r.nota, 0) / (reviews.filter(r => r.aprovado).length || 1)).toFixed(1)
    : "0.0";

  const handleRespond = (review: Review) => {
    setRespondingId(review.id);
    setResposta(review.resposta_loja || "");
  };

  const submitResponse = () => {
    if (!respondingId || !resposta.trim()) return;
    respond.mutate(
      { id: respondingId, resposta_loja: resposta.trim() },
      { onSuccess: () => { setRespondingId(null); setResposta(""); } }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta avaliação?")) {
      remove.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">⭐ Avaliações</h2>
          <p className="text-sm text-muted-foreground">Gerencie as avaliações dos clientes</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
            <p className="text-lg font-bold">{averageRating}</p>
            <p className="text-xs text-muted-foreground">Média</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([
          { key: "all", label: "Todas" },
          { key: "pending", label: `Pendentes (${pendingCount})` },
          { key: "approved", label: `Aprovadas (${approvedCount})` },
        ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Nenhuma avaliação encontrada.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card key={r.id} className={cn(!r.aprovado && "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {r.nome_cliente?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{r.nome_cliente}</p>
                      <StarDisplay nota={r.nota} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      r.aprovado ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"
                    )}>
                      {r.aprovado ? "Aprovada" : "Pendente"}
                    </span>
                  </div>
                </div>

                {r.comentario && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2">{r.comentario}</p>
                )}

                {r.resposta_loja && (
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-2.5 text-sm">
                    <p className="text-xs font-semibold text-blue-700 mb-1">💬 Resposta da loja</p>
                    <p className="text-muted-foreground">{r.resposta_loja}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.criado_em).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(r.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="flex gap-1">
                    {!r.aprovado && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                        onClick={() => approve.mutate({ id: r.id, aprovado: true })}
                        disabled={approve.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                    )}
                    {r.aprovado && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-yellow-600 hover:text-yellow-700"
                        onClick={() => approve.mutate({ id: r.id, aprovado: false })}
                        disabled={approve.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Ocultar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleRespond(r)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Responder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Respond Dialog */}
      <Dialog open={!!respondingId} onOpenChange={(v) => !v && setRespondingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Responder Avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Escreva sua resposta ao cliente..."
              value={resposta}
              onChange={(e) => setResposta(e.target.value.slice(0, 500))}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{resposta.length}/500</p>
            <Button onClick={submitResponse} disabled={!resposta.trim() || respond.isPending} className="w-full">
              {respond.isPending ? "Salvando..." : "Salvar Resposta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAvaliacoes;
