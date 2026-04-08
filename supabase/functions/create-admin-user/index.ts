import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admins podem criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");
    const role = String(payload?.role || "").trim().toLowerCase();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "email, password e role são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["admin", "manager", "kds"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role inválida. Use: admin, manager ou kds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find existing user by email
    const findUserByEmail = async (targetEmail: string) => {
      let page = 1;
      while (page <= 10) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const existingUser = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
        if (existingUser) return existingUser;
        if (data.users.length < 200) break;
        page += 1;
      }
      return null;
    };

    let targetUser = await findUserByEmail(email);
    let userCreated = false;
    let passwordUpdated = false;

    if (!targetUser) {
      // Create new user
      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetUser = createdUser.user;
      userCreated = true;
    } else {
      // User exists — update password to the one provided in admin panel
      const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
        password,
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: `Erro ao atualizar senha: ${updateError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      passwordUpdated = true;
    }

    // Check if role already exists
    const { data: existingRole, error: existingRoleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("role", role)
      .maybeSingle();

    if (existingRoleError) {
      return new Response(JSON.stringify({ error: existingRoleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let roleCreated = false;
    if (!existingRole) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: targetUser.id, role });

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      roleCreated = true;
    }

    // Audit log
    let action = "CREATE_ADMIN_USER";
    let description = `Novo usuário ${role} criado: ${email}`;
    if (!userCreated && passwordUpdated && roleCreated) {
      action = "UPDATE_EXISTING_USER";
      description = `Senha atualizada e role ${role} vinculada ao usuário existente ${email}`;
    } else if (!userCreated && passwordUpdated && !roleCreated) {
      action = "UPDATE_EXISTING_USER";
      description = `Senha atualizada para ${email} (role ${role} já existia)`;
    }

    await supabase.from("system_audit_logs").insert({
      user_id: caller.id,
      action,
      description,
    });

    return new Response(
      JSON.stringify({
        user_id: targetUser.id,
        email,
        role,
        user_created: userCreated,
        password_updated: passwordUpdated,
        role_created: roleCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
