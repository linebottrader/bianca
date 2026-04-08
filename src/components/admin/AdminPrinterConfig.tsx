import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Printer, TestTube, Volume2, Upload, Bell, Type } from "lucide-react";
import { printTestPage } from "@/utils/printReceipt";
import { withTimeout, logAndToast } from "@/utils/adminUtils";

const ACCEPTED_AUDIO = ".mp3,.wav,.ogg";

const AdminPrinterConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["printer-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_impressao")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (config && !form) {
      setForm(config);
    }
  }, [config]);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  const data = form || config;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Nenhuma configuração encontrada.</div>;

  const updateField = (key: string, value: any) => {
    setForm((prev: any) => ({ ...(prev || config), [key]: value }));
  };

  const handleSave = async () => {
    if (!data?.id) return;
    setSaving(true);
    try {
      const { error } = await withTimeout(
        supabase
          .from("configuracoes_impressao")
          .update({
            ativo: data.ativo,
            tipo_impressora: data.tipo_impressora,
            largura_papel: data.largura_papel,
            metodo_impressao: data.metodo_impressao,
            nome_impressora: data.nome_impressora,
            impressao_automatica: data.impressao_automatica,
            som_novo_pedido_ativo: data.som_novo_pedido_ativo,
            som_novo_pedido_url: data.som_novo_pedido_url,
            som_repetir: data.som_repetir,
            som_volume: data.som_volume,
            fonte_tamanho: data.fonte_tamanho,
            fonte_negrito: data.fonte_negrito,
            fonte_obs_tamanho: data.fonte_obs_tamanho,
            fonte_obs_cor: data.fonte_obs_cor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)
      );
      if (error) throw error;
      toast({ title: "Configurações salvas!" });
      queryClient.invalidateQueries({ queryKey: ["printer-config"] });
    } catch (err: any) {
      logAndToast(err, "Salvar configurações de impressão", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = () => {
    printTestPage(data.largura_papel, { fontSize: data.fonte_tamanho || "12px", bold: data.fonte_negrito ?? false, obsFontSize: data.fonte_obs_tamanho || "11px", obsColor: data.fonte_obs_cor || "#000000" });
    toast({ title: "Impressão de teste enviada!" });
  };

  const handleTestSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const url = data.som_novo_pedido_url || "/sounds/new-order.mp3";
    const audio = new Audio(url);
    audio.volume = (data.som_volume ?? 80) / 100;
    audio.play().catch(() => toast({ title: "Não foi possível reproduzir o som", variant: "destructive" }));
    audioRef.current = audio;
  };

  const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande (máx 5MB)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `sounds/notification-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(path);
      updateField("som_novo_pedido_url", urlData.publicUrl);
      toast({ title: "Arquivo de som enviado!" });
    } catch (err: any) {
      logAndToast(err, "Upload do som", toast);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Printer config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configurações de Impressora
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar impressão */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base font-medium">Ativar Impressão de Pedidos</Label>
              <p className="text-sm text-muted-foreground">Habilitar sistema de impressão de comandas</p>
            </div>
            <Switch checked={data.ativo} onCheckedChange={(v) => updateField("ativo", v)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Impressora</Label>
              <Select value={data.tipo_impressora} onValueChange={(v) => updateField("tipo_impressora", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">Impressora térmica 80mm</SelectItem>
                  <SelectItem value="58mm">Impressora térmica 58mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Largura do Papel</Label>
              <Select value={data.largura_papel} onValueChange={(v) => updateField("largura_papel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80mm</SelectItem>
                  <SelectItem value="58mm">58mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Método de Impressão</Label>
              <Select value={data.metodo_impressao} onValueChange={(v) => updateField("metodo_impressao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="navegador">Impressão pelo navegador (window.print)</SelectItem>
                  <SelectItem value="escpos">Impressão automática ESC/POS</SelectItem>
                  <SelectItem value="servidor">Impressão via servidor local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Impressora</Label>
              <Input
                value={data.nome_impressora}
                onChange={(e) => updateField("nome_impressora", e.target.value)}
                placeholder="Ex: Epson TM-T20X"
              />
            </div>
          </div>

          {/* Font config */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4" />
                Formatação da Comanda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tamanho da Fonte</Label>
                <Select value={data.fonte_tamanho || "12px"} onValueChange={(v) => updateField("fonte_tamanho", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10px">Pequena (10px)</SelectItem>
                    <SelectItem value="11px">Média pequena (11px)</SelectItem>
                    <SelectItem value="12px">Média (12px) - Padrão</SelectItem>
                    <SelectItem value="14px">Grande (14px)</SelectItem>
                    <SelectItem value="16px">Extra grande (16px)</SelectItem>
                    <SelectItem value="18px">Máxima (18px)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Tamanho base do texto na comanda impressa</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">Texto em Negrito</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprime todo o texto com letras mais grossas e escuras para melhor leitura
                  </p>
                </div>
                <Switch
                  checked={data.fonte_negrito ?? false}
                  onCheckedChange={(v) => updateField("fonte_negrito", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tamanho da Fonte das Observações/Opções</Label>
                <Select value={data.fonte_obs_tamanho || "11px"} onValueChange={(v) => updateField("fonte_obs_tamanho", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10px">Pequena (10px)</SelectItem>
                    <SelectItem value="11px">Média pequena (11px) - Padrão</SelectItem>
                    <SelectItem value="12px">Média (12px)</SelectItem>
                    <SelectItem value="14px">Grande (14px)</SelectItem>
                    <SelectItem value="16px">Extra grande (16px)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Tamanho do texto de observações, opções e descrições dos itens</p>
              </div>

              <div className="space-y-2">
                <Label>Cor das Observações/Descrições</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={data.fonte_obs_cor || "#000000"}
                    onChange={(e) => updateField("fonte_obs_cor", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-border"
                  />
                  <Input
                    value={data.fonte_obs_cor || "#000000"}
                    onChange={(e) => updateField("fonte_obs_cor", e.target.value)}
                    placeholder="#000000"
                    className="max-w-[140px]"
                  />
                  <span className="text-xs text-muted-foreground">Use #000000 (preto) para máxima visibilidade</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impressão automática */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base font-medium">Impressão Automática</Label>
              <p className="text-sm text-muted-foreground">
                Imprimir automaticamente quando um novo pedido confirmado chegar
              </p>
            </div>
            <Switch
              checked={data.impressao_automatica}
              onCheckedChange={(v) => updateField("impressao_automatica", v)}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
            <Button variant="outline" onClick={handleTestPrint}>
              <TestTube className="mr-1 h-4 w-4" />
              Testar Impressão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sound config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configuração de Som de Novo Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle ativar som */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base font-medium">Ativar Som de Notificação</Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som quando um novo pedido chegar no painel
              </p>
            </div>
            <Switch
              checked={data.som_novo_pedido_ativo ?? true}
              onCheckedChange={(v) => updateField("som_novo_pedido_ativo", v)}
            />
          </div>

          {/* Upload de som personalizado */}
          <div className="space-y-2">
            <Label>Arquivo de Som de Notificação</Label>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: MP3, WAV, OGG (máx 5MB). Deixe vazio para usar o som padrão.
            </p>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-1 h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar Áudio"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_AUDIO}
                className="hidden"
                onChange={handleUploadSound}
              />
              {data.som_novo_pedido_url && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {data.som_novo_pedido_url.split("/").pop()}
                </span>
              )}
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label>Volume do Som: {data.som_volume ?? 80}%</Label>
            </div>
            <Slider
              value={[data.som_volume ?? 80]}
              onValueChange={([v]) => updateField("som_volume", v)}
              min={0}
              max={100}
              step={5}
              className="w-full max-w-xs"
            />
          </div>

          {/* Toggle repetir som */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base font-medium">Repetir Som até Visualizar Pedido</Label>
              <p className="text-sm text-muted-foreground">
                O som continuará tocando até que o administrador visualize o pedido
              </p>
            </div>
            <Switch
              checked={data.som_repetir ?? false}
              onCheckedChange={(v) => updateField("som_repetir", v)}
            />
          </div>

          {/* Testar som */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleTestSound}>
              <TestTube className="mr-1 h-4 w-4" />
              Testar Som
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPrinterConfig;
