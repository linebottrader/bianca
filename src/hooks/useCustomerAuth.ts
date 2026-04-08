import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Cliente = {
  id: string;
  user_id: string;
  nome_completo: string;
  telefone: string;
  data_nascimento: string;
  endereco: string;
  email: string | null;
};


export function useCustomerAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCliente = useCallback(async (userId: string): Promise<Cliente | null> => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      const clienteData = (data as Cliente | null) ?? null;
      setCliente(clienteData);
      return clienteData;
    } catch (err) {
      console.error("Error fetching cliente:", err);
      setCliente(null);
      return null;
    }
  }, []);

  const ensureClienteRecord = useCallback(async (authUser: User, phoneHint?: string) => {
    const existingCliente = await fetchCliente(authUser.id);
    if (existingCliente) return existingCliente;

    const cleanPhone = (phoneHint || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) return null;

    const { data: byPhoneRows, error: byPhoneError } = await (supabase
      .rpc as any)("find_cliente_by_phone", { p_telefone: cleanPhone });

    if (byPhoneError) throw byPhoneError;
    const byPhone = byPhoneRows && Array.isArray(byPhoneRows) && byPhoneRows.length > 0 ? byPhoneRows[0] : null;

    if (byPhone) {
      if (byPhone.user_id !== authUser.id) {
        const { error: relinkError } = await supabase.functions.invoke("create-customer", {
          body: { action: "relink", user_id: authUser.id, cliente_id: byPhone.id },
        });
        if (relinkError) throw relinkError;
      }
    } else {
      const { error: createError } = await supabase.functions.invoke("create-customer", {
        body: {
          user_id: authUser.id,
          nome_completo: `Cliente ${cleanPhone.slice(-4)}`,
          telefone: cleanPhone,
          data_nascimento: "2000-01-01",
          endereco: "Não informado",
          email: authUser.email ?? null,
        },
      });
      if (createError) throw createError;
    }

    return fetchCliente(authUser.id);
  }, [fetchCliente]);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    const syncSession = async (session: Session | null) => {
      if (!mounted) return;

      try {
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          await ensureClienteRecord(u);
        } else {
          setCliente(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setCliente(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void syncSession(session);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        void syncSession(session);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [ensureClienteRecord]);

  const signup = async (data: {
    telefone: string;
    senha: string;
    nome_completo: string;
    data_nascimento: string;
    endereco: string;
    email: string;
  }) => {
    const cleanPhone = data.telefone.replace(/\D/g, "");
    const realEmail = data.email.trim().toLowerCase();

    const { data: registerData, error: registerError } = await supabase.functions.invoke("create-customer", {
      body: {
        action: "register",
        nome_completo: data.nome_completo.trim(),
        telefone: cleanPhone,
        data_nascimento: data.data_nascimento,
        endereco: data.endereco.trim(),
        email: realEmail,
        password: data.senha,
      },
    });

    if (registerError) {
      let message = "Erro ao criar conta.";
      try {
        const body = typeof registerError === "object" && "context" in registerError
          ? await (registerError as any).context?.json?.()
          : null;
        if (body?.error) message = body.error;
      } catch {
        if (registerError.message) message = registerError.message;
      }
      throw new Error(message);
    }

    if (registerData?.error) {
      throw new Error(registerData.error);
    }

    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email: registerData?.email ?? realEmail,
      password: data.senha,
    });

    if (loginError) {
      throw loginError;
    }

    if (!authData.user) {
      throw new Error("Conta criada, mas não foi possível iniciar a sessão.");
    }

    setUser(authData.user);
    await fetchCliente(authData.user.id);
  };

  const login = async (telefone: string, senha: string) => {
    const cleanPhone = telefone.replace(/\D/g, "");

    // Look up real email via secure RPC
    const { data: realEmail } = await (supabase
      .rpc as any)("get_email_by_phone", { p_telefone: cleanPhone }) as { data: string | null };
    const fallbackEmail = `${cleanPhone}@deliveryapp.com`;

    // Try real email first, then fallback to legacy synthetic email
    let authResult = realEmail
      ? await supabase.auth.signInWithPassword({ email: realEmail, password: senha })
      : { data: null, error: new Error("skip") };

    if (authResult.error) {
      authResult = await supabase.auth.signInWithPassword({ email: fallbackEmail, password: senha });
    }

    const { data, error } = authResult;
    if (error) throw new Error("Telefone ou senha inválidos.");

    if (data.user) {
      setUser(data.user);
      const ensuredCliente = await ensureClienteRecord(data.user, cleanPhone);
      if (!ensuredCliente) {
        throw new Error("Conta autenticada, mas não foi possível recuperar seu cadastro.");
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCliente(null);
  };

  return { user, cliente, loading, signup, login, logout };
}
