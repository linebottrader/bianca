import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Review = {
  id: string;
  cliente_id: string;
  pedido_id: string;
  nome_cliente: string;
  nota: number;
  comentario: string;
  resposta_loja: string | null;
  aprovado: boolean;
  criado_em: string;
  respondido_em: string | null;
};

// Approved reviews for public display
export function useApprovedReviews() {
  return useQuery({
    queryKey: ["reviews", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("aprovado", true)
        .order("criado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Review[];
    },
    staleTime: 60_000,
  });
}

// Review stats (average + count)
export function useReviewStats() {
  const { data: reviews, ...rest } = useApprovedReviews();
  const total = reviews?.length || 0;
  const average = total > 0
    ? reviews!.reduce((sum, r) => sum + r.nota, 0) / total
    : 0;
  
  // Distribution by star
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews?.filter(r => r.nota === star).length || 0,
    percent: total > 0 ? ((reviews?.filter(r => r.nota === star).length || 0) / total) * 100 : 0,
  }));

  return { average, total, distribution, ...rest };
}

// Check if user already reviewed a specific order
export function useOrderReview(pedidoId: string | null) {
  return useQuery({
    queryKey: ["reviews", "order", pedidoId],
    queryFn: async () => {
      if (!pedidoId) return null;
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("pedido_id", pedidoId)
        .maybeSingle();
      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!pedidoId,
  });
}

// Submit a review
export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: { cliente_id: string; pedido_id: string; nome_cliente: string; nota: number; comentario: string }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert(review)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Avaliação enviada! Aguarde aprovação.");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate key") || err.message?.includes("reviews_pedido_unique")) {
        toast.error("Você já avaliou este pedido.");
      } else {
        toast.error("Erro ao enviar avaliação.");
      }
    },
  });
}

// Admin: all reviews
export function useAdminReviews() {
  return useQuery({
    queryKey: ["reviews", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data || []) as Review[];
    },
  });
}

// Admin: approve review
export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, aprovado }: { id: string; aprovado: boolean }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ aprovado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Avaliação atualizada.");
    },
  });
}

// Admin: respond to review
export function useRespondReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resposta_loja }: { id: string; resposta_loja: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ resposta_loja, respondido_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Resposta salva.");
    },
  });
}

// Admin: delete review
export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Avaliação excluída.");
    },
  });
}
