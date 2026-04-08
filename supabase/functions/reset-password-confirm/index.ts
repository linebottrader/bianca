import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, nova_senha } = await req.json();
    if (!token || !nova_senha) {
      return new Response(JSON.stringify({ error: "Token e nova senha são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (nova_senha.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find valid token
    const { data: resetToken, error: tErr } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();

    if (tErr || !resetToken) {
      return new Response(JSON.stringify({ error: "Token inválido ou já utilizado." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check expiration
    if (new Date(resetToken.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expirado. Solicite um novo link." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find cliente by phone
    const { data: cliente } = await supabase
      .from("clientes")
      .select("user_id")
      .eq("telefone", resetToken.telefone)
      .maybeSingle();

    if (!cliente) {
      return new Response(JSON.stringify({ error: "Conta não encontrada." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update password via Admin API
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      cliente.user_id,
      { password: nova_senha }
    );

    if (updateErr) {
      console.error("Update password error:", updateErr);
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", resetToken.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("reset-password-confirm error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
