import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase();
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    const action = payload?.action ?? "create";
    const user_id = typeof payload?.user_id === "string" ? payload.user_id : "";
    const nome_completo = normalizeText(payload?.nome_completo);
    const telefone = normalizePhone(payload?.telefone);
    const data_nascimento = normalizeText(payload?.data_nascimento);
    const endereco = normalizeText(payload?.endereco);
    const email = normalizeEmail(payload?.email);
    const password = typeof payload?.password === "string" ? payload.password : "";
    const cliente_id = typeof payload?.cliente_id === "string" ? payload.cliente_id : "";

    if (action === "register") {
      if (!nome_completo || !telefone || !data_nascimento || !endereco || !email || !password) {
        return jsonResponse({ error: "Campos obrigatórios: nome_completo, telefone, data_nascimento, endereco, email, password" }, 400);
      }

      if (nome_completo.length < 3) {
        return jsonResponse({ error: "Nome inválido." }, 400);
      }

      if (telefone.length < 10) {
        return jsonResponse({ error: "Telefone inválido." }, 400);
      }

      if (!isValidEmail(email)) {
        return jsonResponse({ error: "Email inválido." }, 400);
      }

      if (password.length < 6) {
        return jsonResponse({ error: "Senha deve ter no mínimo 6 caracteres." }, 400);
      }

      const [phoneCheck, emailCheck] = await Promise.all([
        supabase.from("clientes").select("id", { head: true, count: "exact" }).eq("telefone", telefone),
        supabase.from("clientes").select("id", { head: true, count: "exact" }).eq("email", email),
      ]);

      if ((phoneCheck.count ?? 0) > 0) {
        return jsonResponse({ error: "Telefone já cadastrado." }, 409);
      }

      if ((emailCheck.count ?? 0) > 0) {
        return jsonResponse({ error: "Email já cadastrado." }, 409);
      }

      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome_completo,
          telefone,
        },
      });

      if (createUserError || !createdUser.user) {
        return jsonResponse({ error: createUserError?.message || "Não foi possível criar a conta." }, 400);
      }

      const { data: cliente, error: insertError } = await supabase
        .from("clientes")
        .insert({
          user_id: createdUser.user.id,
          nome_completo,
          telefone,
          data_nascimento,
          endereco,
          email,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.auth.admin.deleteUser(createdUser.user.id);
        return jsonResponse({ error: insertError.message }, 500);
      }

      return jsonResponse({ success: true, user_id: createdUser.user.id, email, cliente });
    }

    if (!user_id) {
      return jsonResponse({ error: "user_id é obrigatório" }, 400);
    }

    if (action === "relink") {
      if (!cliente_id) {
        return jsonResponse({ error: "cliente_id é obrigatório para relink" }, 400);
      }

      const { error } = await supabase
        .from("clientes")
        .update({ user_id })
        .eq("id", cliente_id);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    if (!nome_completo || !telefone || !data_nascimento || !endereco) {
      return jsonResponse({ error: "Campos obrigatórios: nome_completo, telefone, data_nascimento, endereco" }, 400);
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        user_id,
        nome_completo,
        telefone,
        data_nascimento,
        endereco,
        email: email || null,
      })
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true, cliente: data });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Erro desconhecido" }, 500);
  }
});
