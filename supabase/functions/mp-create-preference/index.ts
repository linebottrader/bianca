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
    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return new Response(
        JSON.stringify({ error: "pedido_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEGURANÇA: buscar valor do banco, nunca confiar no frontend
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select("*, clientes:cliente_id(nome_completo, telefone)")
      .eq("id", pedido_id)
      .single();

    if (pedidoError || !pedido) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pedido.valor_total <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor do pedido inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDEMPOTÊNCIA: se já existe uma preferência criada, reutilizá-la
    if (pedido.mercado_pago_id && pedido.mercado_pago_id.length > 5) {
      try {
        const existingPref = await fetch(
          `https://api.mercadopago.com/checkout/preferences/${pedido.mercado_pago_id}`,
          { headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` } }
        );
        if (existingPref.ok) {
          const existingData = await existingPref.json();
          return new Response(
            JSON.stringify({ preference_id: existingData.id, init_point: existingData.init_point }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.warn("Não foi possível reutilizar preferência existente, criando nova:", e);
      }
    }

    // Buscar config da loja para nome
    const { data: storeConfig } = await supabase
      .from("store_config")
      .select("name, whatsapp")
      .limit(1)
      .single();

    const storeName = storeConfig?.name || "Loja";

    // Determinar URLs base
    const origin = req.headers.get("origin") || "https://luizadm.lovable.app";

    // Criar preferência no Mercado Pago
    const preferenceBody = {
      items: [
        {
          id: pedido.id,
          title: `Pedido #${pedido.numero_pedido} - ${storeName}`,
          description: `Pedido de delivery #${pedido.numero_pedido} - ${storeName}`,
          category_id: "foods",
          quantity: 1,
          unit_price: Number(pedido.valor_total),
          currency_id: "BRL",
        },
      ],
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
      },
      back_urls: {
        success: `${origin}/pagamento/sucesso?pedido=${pedido.numero_pedido}`,
        failure: `${origin}/pagamento/erro?pedido=${pedido.numero_pedido}`,
        pending: `${origin}/pagamento/pendente?pedido=${pedido.numero_pedido}`,
      },
      auto_return: "approved",
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      external_reference: pedido.id,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago:", JSON.stringify(mpData));
      throw new Error(`Erro ao criar preferência: ${mpData.message || mpResponse.status}`);
    }

    // Salvar preference id no pedido
    await supabase
      .from("pedidos")
      .update({ mercado_pago_id: mpData.id })
      .eq("id", pedido_id);

    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        init_point: mpData.init_point,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro mp-create-preference:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
