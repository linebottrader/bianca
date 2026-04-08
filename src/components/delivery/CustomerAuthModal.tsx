import { useState } from "react";
import { useCustomer } from "@/contexts/CustomerAuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Props = { onClose: () => void };

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length >= 5) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const parseDateBR = (value: string): string | null => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = parseInt(dd), month = parseInt(mm), year = parseInt(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${yyyy}-${mm}-${dd}`;
};

const CustomerAuthModal = ({ onClose }: Props) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signup, login } = useCustomer();
  const { toast } = useToast();

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = telefone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({ title: "Telefone inválido", description: "Informe um telefone com DDD.", variant: "destructive" });
      return;
    }
    if (senha.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }

    if (mode === "signup") {
      if (nome.trim().length < 3) {
        toast({ title: "Nome inválido", description: "Mínimo 3 caracteres.", variant: "destructive" });
        return;
      }
      const isoDate = parseDateBR(nascimento);
      if (!isoDate) {
        toast({ title: "Data de nascimento inválida", description: "Use o formato dd/mm/aaaa.", variant: "destructive" });
        return;
      }
      if (endereco.trim().length < 5) {
        toast({ title: "Endereço inválido", description: "Informe seu endereço completo.", variant: "destructive" });
        return;
      }
      if (!validateEmail(email)) {
        toast({ title: "Email inválido", description: "Informe um email válido.", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(cleanPhone, senha);
        toast({ title: "Bem-vindo de volta!" });
      } else {
        const isoDate = parseDateBR(nascimento);
        await signup({
          telefone: cleanPhone,
          senha,
          nome_completo: nome.trim(),
          data_nascimento: isoDate!,
          endereco: endereco.trim(),
          email: email.trim(),
        });
        toast({ title: "Conta criada com sucesso!" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = telefone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({ title: "Telefone inválido", description: "Informe um telefone com DDD.", variant: "destructive" });
      return;
    }
    await handleRecovery();
  };

  const handleRecovery = async () => {
    const cleanPhone = telefone.replace(/\D/g, "");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password-request", {
        body: { telefone: cleanPhone, metodo: "email" },
      });

      if (error) {
        let msg = "Erro ao solicitar recuperação.";
        try {
          const body = typeof error === "object" && "context" in error
            ? await (error as any).context?.json?.()
            : null;
          if (body?.error) msg = body.error;
        } catch { /* use default */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast({ title: "Link enviado!", description: "Verifique seu email para redefinir a senha." });
      setMode("login");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderForgot = () => (
    <>
      <button onClick={() => setMode("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="font-display text-2xl tracking-wider mb-4">Recuperar Senha</h2>
      <p className="text-sm text-muted-foreground mb-3">Informe seu telefone para receber o link de redefinição por email.</p>
      <form onSubmit={handleForgotSubmit} className="space-y-3">
        <Input
          placeholder="Telefone (com DDD)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar link por email"}
        </Button>
      </form>
    </>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[100]" />
      <div
        className="relative z-[110] w-full max-w-md rounded-xl bg-card p-6 shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        {mode === "forgot" && renderForgot()}
        {(mode === "login" || mode === "signup") && (
          <>
            <h2 className="font-display text-2xl tracking-wider mb-4">
              {mode === "login" ? "Entrar" : "Criar Conta"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <>
                  <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={3} />
                  <Input type="tel" inputMode="numeric" placeholder="Data de nascimento (dd/mm/aaaa)" value={nascimento} onChange={(e) => setNascimento(formatDateInput(e.target.value))} maxLength={10} required />
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input placeholder="Endereço completo" value={endereco} onChange={(e) => setEndereco(e.target.value)} required minLength={5} />
                </>
              )}
              <Input placeholder="Telefone (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
              <Input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
              </Button>
            </form>
            {mode === "login" && (
              <button onClick={() => setMode("forgot")} className="mt-2 block w-full text-center text-sm text-primary font-semibold hover:underline">
                ESQUECI MINHA SENHA
              </button>
            )}
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Não tem conta?{" "}<button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Cadastre-se</button></>
              ) : (
                <>Já tem conta?{" "}<button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Entrar</button></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerAuthModal;
