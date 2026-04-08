import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreConfig } from "@/hooks/useStoreData";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Save, Store, Truck, Clock, Image, Upload, Globe } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";
import AdminStoreHours from "./AdminStoreHours";

const AdminStoreConfig = () => {
  const { data: config, isLoading } = useStoreConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  
  const data = form || config;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Nenhuma configuração encontrada.</div>;

  const updateField = (key: string, value: any) => {
    setForm((prev: any) => ({ ...(prev || config), [key]: value }));
  };

  const handleImageUpload = async (file: File, type: "logo" | "hero") => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingHero;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await withTimeout(
        supabase.storage.from("store-images").upload(path, file, { upsert: true })
      );
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(path);
      const key = type === "logo" ? "logo_url" : "hero_image_url";
      updateField(key, urlData.publicUrl);
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      logAndToast(err, `Enviar ${type}`, toast);
    } finally {
      setter(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = form || config;
      const payload = {
        name: updates.name,
        slogan: updates.slogan,
        whatsapp: updates.whatsapp,
        whatsapp_message: updates.whatsapp_message,
        rating: updates.rating,
        minimum_order: updates.minimum_order,
        is_open: updates.is_open,
        status_message: updates.status_message,
        schedule_weekdays: updates.schedule_weekdays,
        schedule_weekends: updates.schedule_weekends,
        delivery_fee: updates.delivery_fee,
        delivery_free_above: updates.delivery_free_above,
        delivery_estimated_time: updates.delivery_estimated_time,
        hero_image_url: updates.hero_image_url,
        logo_url: updates.logo_url,
        address: updates.address,
        instagram_url: updates.instagram_url,
        facebook_url: updates.facebook_url,
        show_address: updates.show_address,
        show_instagram: updates.show_instagram,
        show_facebook: updates.show_facebook,
        ga4_measurement_id: updates.ga4_measurement_id,
      };
      const { error } = await withTimeout(
        supabase.from("store_config").update(payload).eq("id", config!.id)
      );
      if (error) throw error;
      queryClient.setQueryData(["store-config"], (old: any) => old ? { ...old, ...payload } : old);
      setForm(null);
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      logAndToast(err, "Salvar configurações da loja", toast);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Informações da Loja</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome da Loja</label>
            <Input value={data.name} onChange={(e) => updateField("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Slogan</label>
            <Input value={data.slogan || ""} onChange={(e) => updateField("slogan", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">WhatsApp</label>
            <Input value={data.whatsapp || ""} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="5521999999999" />
          </div>
          <div>
            <label className="text-sm font-medium">Mensagem WhatsApp</label>
            <Input value={data.whatsapp_message || ""} onChange={(e) => updateField("whatsapp_message", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Avaliação</label>
            <Input type="number" step="0.1" min="0" max="5" value={data.rating ?? 5} onChange={(e) => updateField("rating", parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Pedido Mínimo (R$)</label>
            <Input type="number" step="0.01" value={data.minimum_order ?? 0} onChange={(e) => updateField("minimum_order", parseFloat(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Status & Horários — agora em componente dedicado */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Status & Horários</h3>
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium">Mensagem de Status (exibida no badge do header)</label>
          <Input value={data.status_message || ""} onChange={(e) => updateField("status_message", e.target.value)} placeholder="Ex: Abertos de Seg a Sáb" />
          <p className="text-xs text-muted-foreground mt-1">Texto fixo no badge do header. As mensagens automáticas (aberta/fechada/pausada) são geradas pelo sistema de horários abaixo.</p>
        </div>
        <AdminStoreHours />
      </div>

      {/* Delivery */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Entrega</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Taxa de Entrega (R$)</label>
            <Input type="number" step="0.01" value={data.delivery_fee ?? 0} onChange={(e) => updateField("delivery_fee", parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Grátis acima de (R$)</label>
            <Input type="number" step="0.01" value={data.delivery_free_above ?? 0} onChange={(e) => updateField("delivery_free_above", parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Tempo Estimado</label>
            <Input value={data.delivery_estimated_time || ""} onChange={(e) => updateField("delivery_estimated_time", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Public Info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Informações Públicas</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Endereço</label>
            <Input value={data.address || ""} onChange={(e) => updateField("address", e.target.value)} placeholder="Rua Exemplo, 123 - Bairro" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.show_address ?? true} onCheckedChange={(v) => updateField("show_address", v)} />
            <label className="text-sm">Exibir endereço</label>
          </div>
          <div />
          <div>
            <label className="text-sm font-medium">URL do Instagram</label>
            <Input value={data.instagram_url || ""} onChange={(e) => updateField("instagram_url", e.target.value)} placeholder="https://instagram.com/sualoja" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.show_instagram ?? true} onCheckedChange={(v) => updateField("show_instagram", v)} />
            <label className="text-sm">Exibir Instagram</label>
          </div>
          <div>
            <label className="text-sm font-medium">URL do Facebook</label>
            <Input value={data.facebook_url || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/sualoja" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.show_facebook ?? true} onCheckedChange={(v) => updateField("show_facebook", v)} />
            <label className="text-sm">Exibir Facebook</label>
          </div>
          <div>
            <label className="text-sm font-medium">Google Analytics 4 (Measurement ID)</label>
            <Input value={data.ga4_measurement_id || ""} onChange={(e) => updateField("ga4_measurement_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
            <p className="text-xs text-muted-foreground mt-1">Ex: G-ABC123XYZ. Deixe vazio para desativar.</p>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Image className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl tracking-wider">Imagens</h3>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Logo</label>
            {data.logo_url && (
              <img src={data.logo_url} alt="Logo" className="mt-2 h-20 w-20 rounded-full object-cover border border-border" />
            )}
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Upload className="h-4 w-4" />
              {uploadingLogo ? "Enviando..." : "Enviar logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "logo")} />
            </label>
          </div>
          <div>
            <label className="text-sm font-medium">Banner</label>
            {data.hero_image_url && (
              <img src={data.hero_image_url} alt="Banner" className="mt-2 h-20 w-full rounded-lg object-cover border border-border" />
            )}
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Upload className="h-4 w-4" />
              {uploadingHero ? "Enviando..." : "Enviar banner"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "hero")} />
            </label>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default AdminStoreConfig;
