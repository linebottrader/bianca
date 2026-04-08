import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Send } from "lucide-react";

export default function AdminSmtpConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const hydratedRef = useRef(false);

  const { data: configData, isLoading } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("smtp_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const [config, setConfig] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
    smtp_sender_email: "",
    smtp_sender_name: "",
  });

  useEffect(() => {
    if (configData && !hydratedRef.current) {
      hydratedRef.current = true;
      setConfig({
        smtp_host: configData.smtp_host || "",
        smtp_port: configData.smtp_port || "587",
        smtp_user: configData.smtp_user || "",
        smtp_password: configData.smtp_password || "",
        smtp_sender_email: configData.smtp_sender_email || "",
        smtp_sender_name: configData.smtp_sender_name || "",
      });
    }
  }, [configData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configData?.id) {
        const { error } = await supabase.from("smtp_config").update(config).eq("id", configData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("smtp_config").insert(config).select().single();
        if (error) throw error;
      }
      hydratedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
      toast({ title: "Configuração SMTP salva!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast({ title: "Informe o email de destino", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: { email_destino: testEmail },
      });
      if (error) throw new Error("Erro ao testar SMTP");
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email de teste enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações SMTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Servidor SMTP</Label>
              <Input placeholder="smtp.gmail.com" value={config.smtp_host} onChange={(e) => setConfig(c => ({ ...c, smtp_host: e.target.value }))} />
            </div>
            <div>
              <Label>Porta SMTP</Label>
              <Input type="number" value={config.smtp_port} onChange={(e) => setConfig(c => ({ ...c, smtp_port: e.target.value || "587" }))} />
            </div>
            <div>
              <Label>Usuário SMTP</Label>
              <Input placeholder="email@gmail.com" value={config.smtp_user} onChange={(e) => setConfig(c => ({ ...c, smtp_user: e.target.value }))} />
            </div>
            <div>
              <Label>Senha SMTP</Label>
              <Input type="password" placeholder="App Password" value={config.smtp_password} onChange={(e) => setConfig(c => ({ ...c, smtp_password: e.target.value }))} />
            </div>
            <div>
              <Label>Email remetente</Label>
              <Input placeholder="noreply@sualoja.com" value={config.smtp_sender_email} onChange={(e) => setConfig(c => ({ ...c, smtp_sender_email: e.target.value }))} />
            </div>
            <div>
              <Label>Nome remetente</Label>
              <Input placeholder="Minha Loja" value={config.smtp_sender_name} onChange={(e) => setConfig(c => ({ ...c, smtp_sender_name: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testar Envio de Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email de destino</Label>
            <Input placeholder="teste@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          </div>
          <Button onClick={handleTest} disabled={testing} variant="outline">
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Enviando..." : "Testar Envio de Email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
