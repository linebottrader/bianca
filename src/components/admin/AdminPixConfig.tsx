import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { withTimeout, logAndToast } from "@/utils/adminUtils";

const AdminPixConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const hydratedRef = useRef(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["pix-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_pix")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const [form, setForm] = useState({ qr_code_url: "", nome_recebedor: "", chave_pix: "" });

  useEffect(() => {
    if (config && !hydratedRef.current) {
      hydratedRef.current = true;
      setForm({
        qr_code_url: config.qr_code_url || "",
        nome_recebedor: config.nome_recebedor || "",
        chave_pix: config.chave_pix || "",
      });
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config?.id) {
        const { error } = await withTimeout(
          supabase.from("configuracao_pix").update(form).eq("id", config.id)
        );
        if (error) throw error;
      } else {
        const { error } = await withTimeout(
          supabase.from("configuracao_pix").insert(form).select().single()
        );
        if (error) throw error;
      }
      hydratedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["pix-config"] });
      toast({ title: "Configuração PIX salva!" });
    } catch (err: any) {
      logAndToast(err, "Salvar configuração PIX", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `pix/qrcode-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await withTimeout(
        supabase.storage.from("store-images").upload(path, file, { upsert: true }),
        60000
      );
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(path);
      setForm((f) => ({ ...f, qr_code_url: urlData.publicUrl }));
    } catch (err: any) {
      logAndToast(err, "Enviar QR Code", toast);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" /> Configuração PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>QR Code PIX</Label>
          <Input type="file" accept="image/*" onChange={handleQrUpload} disabled={uploading} />
          {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
          {form.qr_code_url && (
            <img src={form.qr_code_url} alt="QR Code" className="h-32 w-32 rounded-lg object-contain border border-border" />
          )}
        </div>
        <div className="space-y-2">
          <Label>Nome do Recebedor</Label>
          <Input value={form.nome_recebedor} onChange={(e) => setForm((f) => ({ ...f, nome_recebedor: e.target.value }))} placeholder="Nome completo" />
        </div>
        <div className="space-y-2">
          <Label>Chave PIX</Label>
          <Input value={form.chave_pix} onChange={(e) => setForm((f) => ({ ...f, chave_pix: e.target.value }))} placeholder="CPF, CNPJ, e-mail ou telefone" />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Configuração PIX"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminPixConfig;
