import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { numero_pedido } = await req.json();

    if (!numero_pedido) {
      return new Response(
        JSON.stringify({ error: "numero_pedido é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Try to extract userId from JWT
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await authClient.auth.getUser();
      userId = data?.user?.id || null;
    }

    // 2. Fetch order including cliente_id for ownership check
    const { data: pedido, error } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, status_pagamento, valor_total, itens, tipo_entrega, endereco_entrega, valor_frete, created_at, cliente_id")
      .eq("numero_pedido", numero_pedido)
      .single();

    if (error || !pedido) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check ownership if authenticated
    let isOwner = false;
    if (userId) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", userId)
        .eq("id", pedido.cliente_id)
        .maybeSingle();
      isOwner = !!cliente;
    }

    // 4. Return data based on access level
    if (isOwner) {
      const { cliente_id, ...safeData } = pedido;
      return new Response(
        JSON.stringify(safeData),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Minimal data only — no items, address, or values
      return new Response(
        JSON.stringify({
          numero_pedido: pedido.numero_pedido,
          status: pedido.status,
          status_pagamento: pedido.status_pagamento,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Erro mp-check-status:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
