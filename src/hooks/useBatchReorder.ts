import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type TableName = "categories" | "menu_items" | "option_groups" | "option_items";

export function useBatchReorder(table: TableName, queryKeys: string[][]) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      try {
        const orders = orderedIds.map((_, i) => i);
        const { error } = await supabase.rpc("batch_update_sort_order", {
          p_table: table,
          p_ids: orderedIds,
          p_orders: orders,
        });
        if (error) throw error;

        queryKeys.forEach((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        );
      } catch (err: any) {
        console.error(`[Reorder] ${table}:`, err);
        toast({
          title: "Erro ao salvar ordenação",
          description: err?.message || "Tente novamente.",
          variant: "destructive",
        });
        queryKeys.forEach((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        );
      }
    },
    [table, queryClient, queryKeys, toast]
  );

  return reorder;
}
