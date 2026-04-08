import { useState, useEffect } from "react";
import { useCustomer } from "@/contexts/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Cake, Copy, Check } from "lucide-react";

const BirthdayBanner = () => {
  const { cliente } = useCustomer();
  const [cupom, setCupom] = useState<{ codigo: string; desconto: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!cliente) return;

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const birth = new Date(cliente.data_nascimento + "T12:00:00");
    if (birth.getDate() !== now.getDate() || birth.getMonth() !== now.getMonth()) return;

    const year = now.getFullYear();
    supabase
      .from("cupons_aniversario" as any)
      .select("codigo, desconto, validade, usado")
      .eq("cliente_id", cliente.id)
      .eq("ano", year)
      .eq("usado", false)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        if (new Date(d.validade) > new Date()) {
          setCupom({ codigo: d.codigo, desconto: d.desconto });
        }
      });
  }, [cliente]);

  if (!cupom) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(cupom.codigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mt-2">
      <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-center text-sm flex flex-col sm:flex-row items-center justify-center gap-2">
        <Cake className="h-5 w-5 text-primary shrink-0" />
        <span>
          🎉 Feliz Aniversário, <strong>{cliente?.nome_completo?.split(" ")[0]}</strong>!
          Use seu cupom de <strong>{cupom.desconto}% OFF</strong>:
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
        >
          {cupom.codigo}
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
};

export default BirthdayBanner;
