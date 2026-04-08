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
      console.error("[WEBHOOK] MERCADO_PAGO_ACCESS_TOKEN não configurado");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("[WEBHOOK] Recebido:", JSON.stringify(body));

    // Verificar se é notificação de pagamento
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      console.log("[WEBHOOK] Notificação ignorada, tipo:", body.type, "action:", body.action);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log("[WEBHOOK] Sem payment ID");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("[WEBHOOK] Consultando pagamento no MP, ID:", paymentId);

    // SEGURANÇA: Buscar detalhes do pagamento via API do MP
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` },
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[WEBHOOK] Erro ao buscar pagamento:", JSON.stringify(payment));
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("[WEBHOOK] Payment status:", payment.status, "| method:", payment.payment_method_id, "| type:", payment.payment_type_id, "| external_reference:", payment.external_reference);

    const pedidoId = payment.external_reference;
    if (!pedidoId) {
      console.log("[WEBHOOK] Sem external_reference no pagamento");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Atualizar pedido no banco
    const updateData: Record<string, unknown> = {
      status_pagamento: payment.status,
      mercado_pago_id: String(paymentId),
    };

    if (payment.status === "approved") {
      updateData.status = "pendente"; // Mover para pendente na expedição (pronto para preparo)
      updateData.status_pagamento = "aprovado";
      console.log("[WEBHOOK] ✅ Pagamento APROVADO! Atualizando pedido", pedidoId, "para status=pendente, status_pagamento=aprovado");
    } else if (payment.status === "rejected") {
      updateData.status_pagamento = "rejeitado";
      console.log("[WEBHOOK] ❌ Pagamento REJEITADO para pedido", pedidoId);
    } else if (payment.status === "pending" || payment.status === "in_process") {
      updateData.status_pagamento = "pendente";
      console.log("[WEBHOOK] ⏳ Pagamento PENDENTE para pedido", pedidoId);
    } else {
      console.log("[WEBHOOK] Status desconhecido:", payment.status, "para pedido", pedidoId);
    }

    const { error: updateError } = await supabase
      .from("pedidos")
      .update(updateData)
      .eq("id", pedidoId);

    if (updateError) {
      console.error("[WEBHOOK] Erro ao atualizar pedido:", updateError);
    } else {
      console.log("[WEBHOOK] ✅ Pedido atualizado com sucesso:", pedidoId);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("[WEBHOOK] Erro:", error);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
