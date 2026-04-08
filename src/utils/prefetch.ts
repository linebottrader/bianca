/**
 * Prefetch critical data into React Query cache.
 * Call once when admin dashboard mounts to warm the cache.
 */
import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function prefetchAdminData(queryClient: QueryClient) {
  // Only prefetch if not already cached or if the cached payload is incomplete
  const prefetchIfStale = (
    key: string[],
    fn: () => Promise<any>,
    staleTime = 60_000,
    shouldRefresh?: (cached: unknown) => boolean
  ) => {
    const cached = queryClient.getQueryData(key);
    if (!cached || shouldRefresh?.(cached)) {
      queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime });
    }
  };

  prefetchIfStale(["categories"], async () => {
    const { data, error } = await supabase.from("categories").select("id, name, slug, sort_order, visivel, disponivel").order("sort_order");
    if (error) throw error;
    return data;
  });

  prefetchIfStale(["store-config"], async () => {
    const { data, error } = await supabase.from("store_config").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return data;
  });

  prefetchIfStale(
    ["all-menu-items"],
    async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price, original_price, image_url, category_id, badges, is_active, visivel, disponivel, sort_order, tempo_preparo, estacao_preparo")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    60_000,
    (cached) =>
      Array.isArray(cached) &&
      cached.some(
        (item: any) =>
          item?.image_url === undefined ||
          item?.description === undefined ||
          item?.original_price === undefined ||
          item?.badges === undefined ||
          item?.tempo_preparo === undefined ||
          item?.estacao_preparo === undefined
      )
  );
}

/** Map of tab name → query keys to prefetch on hover */
const TAB_PREFETCH_MAP: Record<string, { key: string[]; fn: () => Promise<any> }[]> = {
  clientes: [
    {
      key: ["clientes"],
      fn: async () => {
        const { data, error } = await supabase.from("clientes").select("id, nome_completo, telefone, email, created_at").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return data;
      },
    },
  ],
  promocoes: [
    {
      key: ["cupons"],
      fn: async () => {
        const { data, error } = await supabase.from("cupons").select("id, codigo, nome_promocao, status, tipo_desconto, valor_desconto").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      },
    },
  ],
};

export function prefetchTabData(queryClient: QueryClient, tabName: string) {
  const entries = TAB_PREFETCH_MAP[tabName];
  if (!entries) return;
  entries.forEach(({ key, fn }) => {
    const cached = queryClient.getQueryData(key);
    if (!cached) {
      queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 30_000 });
    }
  });
}
