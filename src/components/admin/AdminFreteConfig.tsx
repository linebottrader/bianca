import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, MapPin, Eye, EyeOff } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";

type FreteConfig = {
  id?: string;
  endereco_loja: string;
  api_provider: string;
  api_key: string;
  valor_base: number;
  valor_por_km: number;
  ativo: boolean;
};

const EMPTY: FreteConfig = {
  endereco_loja: "",
  api_provider: "mapbox",
  api_key: "",
  valor_base: 5,
  valor_por_km: 1.5,
  ativo: true,
};

const AdminFreteConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const hydratedRef = useRef(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["frete-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_frete")
        .select("*")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FreteConfig | null;
    },
    staleTime: 60_000,
  });

  const [form, setForm] = useState<FreteConfig>(EMPTY);

  useEffect(() => {
    if (config && !hydratedRef.current) {
      hydratedRef.current = true;
      setForm(config);
    }
  }, [config]);

  const handleSave = async () => {
    if (!form.endereco_loja.trim()) {
      toast({ title: "Preencha o endereço da loja", variant: "destructive" });
      return;
    }
    if (!form.api_key.trim()) {
      toast({ title: "Preencha a API Key", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        const { error } = await withTimeout(
          supabase
            .from("configuracao_frete")
            .update({
              endereco_loja: form.endereco_loja,
              api_provider: form.api_provider,
              api_key: form.api_key,
              valor_base: form.valor_base,
              valor_por_km: form.valor_por_km,
              ativo: form.ativo,
            })
            .eq("id", form.id)
        );
        if (error) throw error;
      } else {
        await supabase.from("configuracao_frete").update({ ativo: false }).eq("ativo", true);
        const { data, error } = await withTimeout(
          supabase
            .from("configuracao_frete")
            .insert({
              endereco_loja: form.endereco_loja,
              api_provider: form.api_provider,
              api_key: form.api_key,
              valor_base: form.valor_base,
              valor_por_km: form.valor_por_km,
              ativo: true,
            })
            .select()
            .single()
        );
        if (error) throw error;
        setForm(data as unknown as FreteConfig);
      }
      hydratedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["frete-config"] });
      toast({ title: "Configuração de frete salva!" });
    } catch (err: any) {
      logAndToast(err, "Salvar configuração de frete", toast);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Configuração de Frete por Distância</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Endereço da Loja *</label>
            <Input
              value={form.endereco_loja}
              onChange={(e) => setForm((p) => ({ ...p, endereco_loja: e.target.value }))}
              placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
            />
            <p className="text-xs text-muted-foreground mt-1">Endereço completo para cálculo da distância</p>
          </div>

          <div>
            <label className="text-sm font-medium">Provedor de API *</label>
            <select
              value={form.api_provider}
              onChange={(e) => setForm((p) => ({ ...p, api_provider: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="mapbox">Mapbox</option>
              <option value="google_maps" disabled>Google Maps (em breve)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">API Key *</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={form.api_key}
                onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
                placeholder="pk.xxxxxxxx..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">A chave é armazenada de forma segura e nunca exposta ao cliente</p>
          </div>

          <div>
            <label className="text-sm font-medium">Valor Base (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_base}
              onChange={(e) => setForm((p) => ({ ...p, valor_base: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground mt-1">Taxa fixa cobrada em toda entrega</p>
          </div>

          <div>
            <label className="text-sm font-medium">Valor por Km (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_por_km}
              onChange={(e) => setForm((p) => ({ ...p, valor_por_km: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground mt-1">Valor cobrado por quilômetro de distância</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <strong>Fórmula:</strong> Frete = Valor Base + (Distância em Km × Valor por Km)
          <br />
          <strong>Exemplo:</strong> R$ {form.valor_base.toFixed(2)} + (5km × R$ {form.valor_por_km.toFixed(2)}) = R$ {(form.valor_base + 5 * form.valor_por_km).toFixed(2)}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configuração de Frete"}
      </Button>
    </div>
  );
};

export default AdminFreteConfig;
