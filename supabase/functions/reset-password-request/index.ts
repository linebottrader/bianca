import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { telefone, metodo } = await req.json();
    if (!telefone || !metodo) {
      return new Response(JSON.stringify({ error: "telefone e metodo são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find client by phone
    const { data: cliente, error: cErr } = await supabase
      .from("clientes")
      .select("telefone, email, nome_completo")
      .eq("telefone", telefone.replace(/\D/g, ""))
      .maybeSingle();

    if (cErr || !cliente) {
      return new Response(JSON.stringify({ error: "Telefone não encontrado." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: max 3 per hour
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabase
      .from("password_reset_tokens")
      .select("id", { count: "exact", head: true })
      .eq("telefone", cliente.telefone)
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Limite de solicitações atingido. Tente novamente em 1 minuto." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from("password_reset_tokens")
      .insert({ telefone: cliente.telefone, token, expires_at: expiresAt });

    if (insertErr) throw insertErr;

    // Get store config for domain/whatsapp
    const { data: storeConfig } = await supabase
      .from("store_config")
      .select("name, logo_url, whatsapp")
      .limit(1)
      .maybeSingle();

    const storeName = storeConfig?.name || "Loja";

    // Build reset link - use origin or published URL
    const origin = req.headers.get("origin") || "https://admteste.lovable.app";
    const resetLink = `${origin}/resetar-senha?token=${token}`;

    if (metodo === "email") {
      if (!cliente.email) {
        return new Response(JSON.stringify({ error: "Nenhum email cadastrado para este telefone." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get SMTP config
      const { data: smtp } = await supabase
        .from("smtp_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!smtp || !smtp.smtp_host || !smtp.smtp_user) {
        return new Response(JSON.stringify({ error: "Configuração SMTP não encontrada. Contate o administrador." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const logoHtml = storeConfig?.logo_url
        ? `<img src="${storeConfig.logo_url}" alt="${storeName}" style="max-height:60px;margin-bottom:16px;" />`
        : "";

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align:center;">
      ${logoHtml}
      <h2 style="color:#2e2e2e;margin-bottom:8px;">${storeName}</h2>
    </div>
    <h3 style="color:#333;text-align:center;">Recuperação de Senha</h3>
    <p style="color:#555;line-height:1.6;">Olá${cliente.nome_completo ? `, ${cliente.nome_completo.split(" ")[0]}` : ""},</p>
    <p style="color:#555;line-height:1.6;">Recebemos uma solicitação para redefinir sua senha.</p>
    <p style="color:#555;line-height:1.6;">Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetLink}" style="background:#f07c00;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">REDEFINIR SENHA</a>
    </div>
    <p style="color:#999;font-size:13px;">Este link expira em 15 minutos.</p>
    <p style="color:#999;font-size:13px;">Se você não solicitou essa alteração, ignore este email.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="color:#bbb;font-size:12px;text-align:center;">Sistema de pedidos - ${storeName}</p>
  </div>
</body>
</html>`;

      try {
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
          from: `${smtp.smtp_sender_name || storeName} <${smtp.smtp_sender_email || smtp.smtp_user}>`,
          to: cliente.email,
          subject: `Recuperação de Senha - ${storeName}`,
          text: "Recuperação de senha",
          html: htmlBody,
        });
      } catch (smtpErr) {
        console.error("SMTP error:", smtpErr);
        return new Response(JSON.stringify({ error: "Erro ao enviar email. Verifique a configuração SMTP." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, metodo: "email" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (metodo === "direto") {
      // Admin-only: require authenticated admin user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Acesso não autorizado." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const authSupabase = createAuthClient(
        Deno.env.get("SUPABASE_URL")!,
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token_jwt = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token_jwt);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Acesso não autorizado." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const userId = claimsData.claims.sub;
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: true,
        metodo: "direto",
        reset_link: resetLink,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Método inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("reset-password-request error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
