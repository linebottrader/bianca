import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DBCategory = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  visivel: boolean;
  disponivel: boolean;
};

export type DBOptionItem = {
  id: string;
  group_id: string;
  name: string;
  descricao: string;
  price: number;
  imagem_url: string;
  ativo: boolean;
  sort_order: number;
};

export type DBOptionGroup = {
  id: string;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  min_selecao: number;
  max_selecao: number;
  ativo: boolean;
  items: DBOptionItem[];
};

export type DBMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category_id: string;
  badges: string[];
  sort_order: number;
  is_active: boolean;
  disponivel: boolean;
  visivel: boolean;
  options?: DBOptionGroup[];
};

export type DBStoreConfig = {
  id: string;
  name: string;
  slogan: string;
  whatsapp: string;
  whatsapp_message: string;
  rating: number;
  minimum_order: number;
  is_open: boolean;
  status_message: string;
  schedule_weekdays: string;
  schedule_weekends: string;
  delivery_fee: number;
  delivery_free_above: number;
  delivery_estimated_time: string;
  hero_image_url: string;
  logo_url: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  show_address: boolean;
  show_instagram: boolean;
  show_facebook: boolean;
  [key: `design_${string}`]: string;
};

// Helper: wraps query to handle auth errors gracefully
async function resilientQuery<T>(fn: () => PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await fn();
  if (error) {
    if (error.code === "PGRST301" || error.message?.includes("JWT")) {
      console.warn("Auth error in query, session may be stale:", error.message);
    }
    throw error;
  }
  return data;
}

export function useStoreConfig() {
  return useQuery({
    queryKey: ["store-config"],
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 2,
    networkMode: "always",
    queryFn: async () => {
      const data = await resilientQuery(() =>
        supabase.from("store_config").select("*").limit(1).maybeSingle()
      );
      if (!data) throw new Error("Store config not found");
      return data as unknown as DBStoreConfig;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 2,
    networkMode: "always",
    queryFn: async () => {
      return await resilientQuery(() =>
        supabase.from("categories").select("*").order("sort_order")
      ) as unknown as DBCategory[];
    },
  });
}

/** Fetch all option_groups with their items */
export function useOptionGroups() {
  return useQuery({
    queryKey: ["option-groups"],
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 2,
    networkMode: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("option_groups")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      
      const { data: items, error: itemsError } = await supabase
        .from("option_items")
        .select("*")
        .order("sort_order");
      if (itemsError) throw itemsError;

      return (data as any[]).map((g) => ({
        ...g,
        items: (items as any[])
          .filter((i) => i.group_id === g.id)
          .map((i) => ({ ...i, price: Number(i.price ?? 0) })),
      })) as DBOptionGroup[];
    },
  });
}

/** Fetch product_option_groups junction */
export function useProductOptionGroups() {
  return useQuery({
    queryKey: ["product-option-groups"],
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 2,
    networkMode: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_option_groups")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data as { id: string; product_id: string; group_id: string; ordem: number }[];
    },
  });
}

function mapMenuItems(
  items: any[],
  optionGroups: DBOptionGroup[],
  productOptionGroups: { product_id: string; group_id: string; ordem: number }[]
): DBMenuItem[] {
  return items.map((item) => {
    const linkedGroupIds = productOptionGroups
      .filter((pog) => pog.product_id === item.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((pog) => pog.group_id);

    const options = linkedGroupIds
      .map((gid) => optionGroups.find((g) => g.id === gid))
      .filter((g): g is DBOptionGroup => !!g && g.ativo && g.items.filter((i) => i.ativo).length > 0)
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.ativo),
      }));

    return {
      ...item,
      price: Number(item.price),
      original_price: item.original_price ? Number(item.original_price) : null,
      badges: item.badges || [],
      disponivel: item.disponivel ?? true,
      visivel: item.visivel ?? true,
      options,
    };
  });
}

export function useMenuItems() {
  return useQuery({
    queryKey: ["menu-items"],
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 2,
    networkMode: "always",
    queryFn: async () => {
      const [itemsRes, groupsRes, groupItemsRes, pogRes] = await Promise.all([
        supabase.from("menu_items").select("*").eq("is_active", true).eq("visivel", true).order("sort_order"),
        supabase.from("option_groups").select("*").eq("ativo", true),
        supabase.from("option_items").select("*").eq("ativo", true).order("sort_order"),
        supabase.from("product_option_groups").select("*").order("ordem"),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (groupItemsRes.error) throw groupItemsRes.error;
      if (pogRes.error) throw pogRes.error;

      const groups: DBOptionGroup[] = (groupsRes.data as any[]).map((g) => ({
        ...g,
        items: (groupItemsRes.data as any[])
          .filter((i) => i.group_id === g.id)
          .map((i) => ({ ...i, price: Number(i.price ?? 0) })),
      }));

      return mapMenuItems(itemsRes.data as any[], groups, pogRes.data as any[]);
    },
  });
}

/** Lightweight store config — only essential fields, no design_* columns */
export function useStoreConfigLite() {
  return useQuery({
    queryKey: ["store-config-lite"],
    staleTime: 120_000,
    gcTime: 300_000,
    retry: 2,
    networkMode: "always",
    queryFn: async () => {
      const data = await resilientQuery(() =>
        supabase
          .from("store_config")
          .select("id, name, slogan, whatsapp, whatsapp_message, rating, minimum_order, is_open, status_message, schedule_weekdays, schedule_weekends, delivery_fee, delivery_free_above, delivery_estimated_time, hero_image_url, logo_url, address, instagram_url, facebook_url, show_address, show_instagram, show_facebook")
          .limit(1)
          .maybeSingle()
      );
      if (!data) throw new Error("Store config not found");
      return data as unknown as Omit<DBStoreConfig, `design_${string}`>;
    },
  });
}

export function useAllMenuItems() {
  return useQuery({
    queryKey: ["all-menu-items"],
    staleTime: 30_000,
    gcTime: 300_000,
    networkMode: "always",
    queryFn: async () => {
      const [itemsRes, groupsRes, groupItemsRes, pogRes] = await Promise.all([
        supabase.from("menu_items").select("*").order("sort_order"),
        supabase.from("option_groups").select("*"),
        supabase.from("option_items").select("*").order("sort_order"),
        supabase.from("product_option_groups").select("*").order("ordem"),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (groupItemsRes.error) throw groupItemsRes.error;
      if (pogRes.error) throw pogRes.error;

      const groups: DBOptionGroup[] = (groupsRes.data as any[]).map((g) => ({
        ...g,
        items: (groupItemsRes.data as any[])
          .filter((i) => i.group_id === g.id)
          .map((i) => ({ ...i, price: Number(i.price ?? 0) })),
      }));

      return mapMenuItems(itemsRes.data as any[], groups, pogRes.data as any[]);
    },
  });
}
