import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, ExternalLink } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";

export default function AdminKDSConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["kds-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kds_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    mostrar_aguardando_entregador: false,
    modo_estacao: "unica",
    estacoes: "Cozinha,Lanches,Bebidas,Sobremesas",
    tempo_alerta_minutos: 20,
    som_novo_pedido: true,
    voz_novo_pedido: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        mostrar_aguardando_entregador: config.mostrar_aguardando_entregador,
        modo_estacao: config.modo_estacao,
        estacoes: (config.estacoes || []).join(","),
        tempo_alerta_minutos: config.tempo_alerta_minutos,
        som_novo_pedido: config.som_novo_pedido,
        voz_novo_pedido: config.voz_novo_pedido,
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await withTimeout(
        supabase.from("kds_config").update({
          mostrar_aguardando_entregador: form.mostrar_aguardando_entregador,
          modo_estacao: form.modo_estacao,
          estacoes: form.estacoes.split(",").map((s) => s.trim()).filter(Boolean),
          tempo_alerta_minutos: form.tempo_alerta_minutos,
          som_novo_pedido: form.som_novo_pedido,
          voz_novo_pedido: form.voz_novo_pedido,
        }).eq("id", config.id)
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["kds-config"] });
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      logAndToast(err, "Salvar config KDS", toast);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Configurações da Cozinha (KDS)</h2>
        <Button variant="outline" size="sm" onClick={() => window.open("/kds", "_blank")}>
          <ExternalLink className="mr-1 h-3 w-3" /> Abrir KDS
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Layout do KDS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Mostrar coluna "Aguardando Entregador"</Label>
            <Switch checked={form.mostrar_aguardando_entregador} onCheckedChange={(v) => setForm({ ...form, mostrar_aguardando_entregador: v })} />
          </div>

          <div>
            <Label>Modo de estações</Label>
            <select
              value={form.modo_estacao}
              onChange={(e) => setForm({ ...form, modo_estacao: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="unica">Estação Única</option>
              <option value="separadas">Estações Separadas</option>
            </select>
          </div>

          <div>
            <Label>Estações (separadas por vírgula)</Label>
            <Input value={form.estacoes} onChange={(e) => setForm({ ...form, estacoes: e.target.value })} placeholder="Cozinha,Lanches,Bebidas" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alertas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tempo de alerta (minutos)</Label>
            <Input type="number" value={form.tempo_alerta_minutos} onChange={(e) => setForm({ ...form, tempo_alerta_minutos: parseInt(e.target.value) || 20 })} className="w-32 mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Som de novo pedido</Label>
            <Switch checked={form.som_novo_pedido} onCheckedChange={(v) => setForm({ ...form, som_novo_pedido: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Voz de novo pedido</Label>
            <Switch checked={form.voz_novo_pedido} onCheckedChange={(v) => setForm({ ...form, voz_novo_pedido: v })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
