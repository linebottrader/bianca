import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift, UserX, Truck, TrendingUp, Shield } from "lucide-react";

type PromoConfig = {
  id: string;
  primeira_compra: any;
  recuperacao_inativos: any;
  frete_gratis_auto: any;
  desconto_progressivo: any;
  regras_prioridade: any;
};

const DEFAULT_PRIORIDADES: Record<string, number> = {
  cupom: 1,
  relampago: 2,
  dia_semana: 3,
  happy_hour: 4,
  progressivo: 5,
  frete_gratis: 6,
};

const PRIORITY_LABELS: Record<string, string> = {
  cupom: "Cupom manual",
  relampago: "Promoção relâmpago",
  dia_semana: "Promoção por dia",
  happy_hour: "Happy hour",
  progressivo: "Desconto progressivo",
  frete_gratis: "Frete grátis automático",
};

export default function AutomacaoTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PromoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("promocoes_config").select("*").limit(1).maybeSingle().then(({ data, error }) => {
      if (error) toast({ title: "Erro ao carregar config", variant: "destructive" });
      if (data) setConfig(data as any);
      setLoading(false);
    });
  }, [toast]);

  const save = async (field: string, value: any) => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from("promocoes_config").update({ [field]: value }).eq("id", config.id);
    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else toast({ title: "Salvo!" });
    setSaving(false);
  };

  const updateField = (section: string, key: string, value: any) => {
    if (!config) return;
    const current = (config as any)[section] || {};
    const updated = { ...current, [key]: value };
    setConfig({ ...config, [section]: updated } as any);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!config) return <p className="text-center text-muted-foreground py-8">Configuração não encontrada.</p>;

  const pc = config.primeira_compra || {};
  const ri = config.recuperacao_inativos || {};
  const fga = config.frete_gratis_auto || {};
  const dp = config.desconto_progressivo || {};
  const faixas = dp.faixas || [{ valor_minimo: 30, desconto: 5 }, { valor_minimo: 60, desconto: 10 }, { valor_minimo: 100, desconto: 15 }];

  const regras = config.regras_prioridade || { desconto_maximo_percentual: 40, permite_acumular: false, prioridades: DEFAULT_PRIORIDADES };
  const prioridades = { ...DEFAULT_PRIORIDADES, ...(regras.prioridades || {}) };

  return (
    <div className="space-y-4">
      {/* Priority Rules Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5" /> Regras de Prioridade (Anti-Conflito)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Permitir acúmulo de promoções</Label>
            <Switch
              checked={regras.permite_acumular || false}
              onCheckedChange={(v) => {
                const updated = { ...regras, permite_acumular: v };
                setConfig({ ...config, regras_prioridade: updated } as any);
              }}
            />
          </div>
          <div>
            <Label>Desconto máximo por pedido (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={regras.desconto_maximo_percentual || 40}
              onChange={(e) => {
                const updated = { ...regras, desconto_maximo_percentual: Number(e.target.value) };
                setConfig({ ...config, regras_prioridade: updated } as any);
              }}
            />
          </div>
          <div>
            <Label className="mb-2 block">Ordem de prioridade (menor = mais alta)</Label>
            <div className="space-y-2">
              {Object.entries(prioridades)
                .sort(([, a], [, b]) => (a as number) - (b as number))
                .map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={val as number}
                      className="w-16"
                      onChange={(e) => {
                        const newPrioridades = { ...prioridades, [key]: Number(e.target.value) };
                        const updated = { ...regras, prioridades: newPrioridades };
                        setConfig({ ...config, regras_prioridade: updated } as any);
                      }}
                    />
                    <span className="text-sm">{PRIORITY_LABELS[key] || key}</span>
                  </div>
                ))}
            </div>
          </div>
          <Button size="sm" onClick={() => save("regras_prioridade", config.regras_prioridade)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Regras"}
          </Button>
        </CardContent>
      </Card>

      {/* Primeira Compra */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Gift className="h-5 w-5" /> Cupom de Primeira Compra</CardTitle>
            <Switch checked={pc.ativo || false} onCheckedChange={(v) => updateField("primeira_compra", "ativo", v)} />
          </div>
        </CardHeader>
        {pc.ativo && (
          <CardContent className="space-y-3">
            <div><Label>Código do cupom</Label><Input value={pc.cupom_codigo || ""} onChange={(e) => updateField("primeira_compra", "cupom_codigo", e.target.value.toUpperCase())} placeholder="BEMVINDO10" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Desconto (%)</Label><Input type="number" value={pc.desconto || 10} onChange={(e) => updateField("primeira_compra", "desconto", Number(e.target.value))} /></div>
              <div><Label>Validade (dias)</Label><Input type="number" value={pc.validade_dias || 30} onChange={(e) => updateField("primeira_compra", "validade_dias", Number(e.target.value))} /></div>
            </div>
            <Button size="sm" onClick={() => save("primeira_compra", config.primeira_compra)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Recuperação inativos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><UserX className="h-5 w-5" /> Recuperação de Cliente Inativo</CardTitle>
            <Switch checked={ri.ativo || false} onCheckedChange={(v) => updateField("recuperacao_inativos", "ativo", v)} />
          </div>
        </CardHeader>
        {ri.ativo && (
          <CardContent className="space-y-3">
            <div><Label>Dias sem comprar</Label><Input type="number" value={ri.dias_sem_compra || 15} onChange={(e) => updateField("recuperacao_inativos", "dias_sem_compra", Number(e.target.value))} /></div>
            <div><Label>Código do cupom</Label><Input value={ri.cupom_codigo || ""} onChange={(e) => updateField("recuperacao_inativos", "cupom_codigo", e.target.value.toUpperCase())} placeholder="VOLTEI10" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Desconto (%)</Label><Input type="number" value={ri.desconto || 10} onChange={(e) => updateField("recuperacao_inativos", "desconto", Number(e.target.value))} /></div>
              <div><Label>Validade (dias)</Label><Input type="number" value={ri.validade_dias || 7} onChange={(e) => updateField("recuperacao_inativos", "validade_dias", Number(e.target.value))} /></div>
            </div>
            <Button size="sm" onClick={() => save("recuperacao_inativos", config.recuperacao_inativos)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Frete grátis automático */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5" /> Frete Grátis Automático</CardTitle>
            <Switch checked={fga.ativo || false} onCheckedChange={(v) => updateField("frete_gratis_auto", "ativo", v)} />
          </div>
        </CardHeader>
        {fga.ativo && (
          <CardContent className="space-y-3">
            <div><Label>Valor mínimo do pedido (R$)</Label><Input type="number" step="0.01" value={fga.valor_minimo || 50} onChange={(e) => updateField("frete_gratis_auto", "valor_minimo", Number(e.target.value))} /></div>
            <Button size="sm" onClick={() => save("frete_gratis_auto", config.frete_gratis_auto)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Desconto progressivo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5" /> Desconto Progressivo</CardTitle>
            <Switch checked={dp.ativo || false} onCheckedChange={(v) => updateField("desconto_progressivo", "ativo", v)} />
          </div>
        </CardHeader>
        {dp.ativo && (
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Defina faixas de valor mínimo e desconto (%).</p>
            {faixas.map((f: any, i: number) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div><Label>A partir de R$</Label><Input type="number" value={f.valor_minimo} onChange={(e) => { const nf = [...faixas]; nf[i] = { ...nf[i], valor_minimo: Number(e.target.value) }; updateField("desconto_progressivo", "faixas", nf); }} /></div>
                <div><Label>Desconto %</Label><Input type="number" value={f.desconto} onChange={(e) => { const nf = [...faixas]; nf[i] = { ...nf[i], desconto: Number(e.target.value) }; updateField("desconto_progressivo", "faixas", nf); }} /></div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { const nf = [...faixas, { valor_minimo: 0, desconto: 0 }]; updateField("desconto_progressivo", "faixas", nf); }}>+ Faixa</Button>
              {faixas.length > 1 && <Button variant="outline" size="sm" onClick={() => { const nf = faixas.slice(0, -1); updateField("desconto_progressivo", "faixas", nf); }}>- Remover última</Button>}
            </div>
            <Button size="sm" onClick={() => save("desconto_progressivo", config.desconto_progressivo)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
