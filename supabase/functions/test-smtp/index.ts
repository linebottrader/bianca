import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: hasRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Apenas admins podem testar SMTP" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email_destino } = await req.json();
    if (!email_destino) {
      return new Response(JSON.stringify({ error: "Email de destino obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: smtp } = await supabase.from("smtp_config").select("*").limit(1).maybeSingle();
    if (!smtp || !smtp.smtp_host || !smtp.smtp_user) {
      return new Response(JSON.stringify({ error: "Configuração SMTP não encontrada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const port = Number(smtp.smtp_port || 587);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port,
      secure,
      auth: {
        user: smtp.smtp_user,
        pass: smtp.smtp_password,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `${smtp.smtp_sender_name || "Sistema"} <${smtp.smtp_sender_email || smtp.smtp_user}>`,
      to: email_destino,
      subject: "Teste de configuração SMTP",
      text: "Este é um email de teste do sistema de pedidos.",
      html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;">
        <h2 style="color:#333;">✅ Teste de configuração SMTP</h2>
        <p style="color:#555;">Este é um email de teste do sistema de pedidos.</p>
        <p style="color:#555;">Se você recebeu este email, a configuração SMTP está funcionando corretamente.</p>
      </div>`,
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("test-smtp error:", err);
    return new Response(JSON.stringify({ error: `Erro SMTP: ${err.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
