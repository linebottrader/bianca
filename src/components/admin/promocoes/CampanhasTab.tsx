import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Calendar, Zap, Image, Sparkles } from "lucide-react";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type PromoConfig = {
  id: string;
  happy_hour: any;
  promo_dia_semana: any;
  promo_relampago: any;
  banner_promo: any;
  cupom_surpresa: any;
};

export default function CampanhasTab() {
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

  const u = (section: string, key: string, value: any) => {
    if (!config) return;
    const current = (config as any)[section] || {};
    setConfig({ ...config, [section]: { ...current, [key]: value } } as any);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!config) return <p className="text-center text-muted-foreground py-8">Configuração não encontrada.</p>;

  const hh = config.happy_hour || {};
  const pds = config.promo_dia_semana || {};
  const pr = config.promo_relampago || {};
  const bp = config.banner_promo || {};
  const cs = config.cupom_surpresa || {};

  return (
    <div className="space-y-4">
      {/* Happy Hour */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5" /> Happy Hour</CardTitle>
            <Switch checked={hh.ativo || false} onCheckedChange={(v) => u("happy_hour", "ativo", v)} />
          </div>
        </CardHeader>
        {hh.ativo && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="time" value={hh.hora_inicio || "14:00"} onChange={(e) => u("happy_hour", "hora_inicio", e.target.value)} /></div>
              <div><Label>Fim</Label><Input type="time" value={hh.hora_fim || "17:00"} onChange={(e) => u("happy_hour", "hora_fim", e.target.value)} /></div>
            </div>
            <div><Label>Desconto (%)</Label><Input type="number" value={hh.desconto || 10} onChange={(e) => u("happy_hour", "desconto", Number(e.target.value))} /></div>
            <Button size="sm" onClick={() => save("happy_hour", config.happy_hour)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Promoção por dia da semana */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-5 w-5" /> Promoção por Dia da Semana</CardTitle>
            <Switch checked={pds.ativo || false} onCheckedChange={(v) => u("promo_dia_semana", "ativo", v)} />
          </div>
        </CardHeader>
        {pds.ativo && (
          <CardContent className="space-y-3">
            <div>
              <Label>Dia da semana</Label>
              <Select value={String(pds.dia ?? 3)} onValueChange={(v) => u("promo_dia_semana", "dia", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIAS_SEMANA.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Desconto (%)</Label><Input type="number" value={pds.desconto || 20} onChange={(e) => u("promo_dia_semana", "desconto", Number(e.target.value))} /></div>
            <Button size="sm" onClick={() => save("promo_dia_semana", config.promo_dia_semana)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Promoção Relâmpago */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-5 w-5" /> Promoção Relâmpago</CardTitle>
            <Switch checked={pr.ativo || false} onCheckedChange={(v) => u("promo_relampago", "ativo", v)} />
          </div>
        </CardHeader>
        {pr.ativo && (
          <CardContent className="space-y-3">
            <div><Label>Duração (minutos)</Label><Input type="number" value={pr.duracao_minutos || 30} onChange={(e) => u("promo_relampago", "duracao_minutos", Number(e.target.value))} /></div>
            <div><Label>Desconto (%)</Label><Input type="number" value={pr.desconto || 20} onChange={(e) => u("promo_relampago", "desconto", Number(e.target.value))} /></div>
            <Button size="sm" onClick={() => save("promo_relampago", config.promo_relampago)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Banner Promocional */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Image className="h-5 w-5" /> Banner Promocional</CardTitle>
            <Switch checked={bp.ativo || false} onCheckedChange={(v) => u("banner_promo", "ativo", v)} />
          </div>
        </CardHeader>
        {bp.ativo && (
          <CardContent className="space-y-3">
            <div><Label>Texto do banner</Label><Input value={bp.texto || ""} onChange={(e) => u("banner_promo", "texto", e.target.value)} placeholder="Use o cupom PIZZA10 e ganhe 10% OFF" /></div>
            <div><Label>Cupom vinculado</Label><Input value={bp.cupom_codigo || ""} onChange={(e) => u("banner_promo", "cupom_codigo", e.target.value.toUpperCase())} placeholder="PIZZA10" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Cor de fundo</Label><Input type="color" value={bp.cor_fundo || "#FEF3C7"} onChange={(e) => u("banner_promo", "cor_fundo", e.target.value)} /></div>
              <div><Label>Cor do texto</Label><Input type="color" value={bp.cor_texto || "#92400E"} onChange={(e) => u("banner_promo", "cor_texto", e.target.value)} /></div>
              <div><Label>Cor da borda</Label><Input type="color" value={bp.cor_borda || "#F59E0B"} onChange={(e) => u("banner_promo", "cor_borda", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={bp.animacao_pulsar || false} onCheckedChange={(v) => u("banner_promo", "animacao_pulsar", v)} />
              <Label>Animação pulsante (chamar atenção)</Label>
            </div>
            {/* Preview */}
            <div>
              <Label className="text-xs text-muted-foreground">Prévia:</Label>
              <div
                className={`mt-1 rounded-lg border p-3 text-center text-sm flex items-center justify-center gap-2 ${bp.animacao_pulsar ? "animate-pulse" : ""}`}
                style={{ background: bp.cor_fundo || "#FEF3C7", color: bp.cor_texto || "#92400E", borderColor: bp.cor_borda || "#F59E0B" }}
              >
                📢 {bp.texto || "Use o cupom PIZZA10 e ganhe 10% OFF"}
              </div>
            </div>
            <Button size="sm" onClick={() => save("banner_promo", config.banner_promo)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>

      {/* Cupom Surpresa */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-5 w-5" /> Cupom Surpresa no Checkout</CardTitle>
            <Switch checked={cs.ativo || false} onCheckedChange={(v) => u("cupom_surpresa", "ativo", v)} />
          </div>
        </CardHeader>
        {cs.ativo && (
          <CardContent className="space-y-3">
            <div><Label>Código do cupom</Label><Input value={cs.cupom_codigo || ""} onChange={(e) => u("cupom_surpresa", "cupom_codigo", e.target.value.toUpperCase())} placeholder="AGORA5" /></div>
            <div><Label>Valor do desconto (R$)</Label><Input type="number" value={cs.valor_desconto || 5} onChange={(e) => u("cupom_surpresa", "valor_desconto", Number(e.target.value))} /></div>
            <div><Label>Valor mínimo do pedido (R$)</Label><Input type="number" step="0.01" value={cs.valor_minimo_pedido || 30} onChange={(e) => u("cupom_surpresa", "valor_minimo_pedido", Number(e.target.value))} /></div>
            <Button size="sm" onClick={() => save("cupom_surpresa", config.cupom_surpresa)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
