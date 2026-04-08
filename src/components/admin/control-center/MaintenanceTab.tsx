import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { Construction } from "lucide-react";

export default function MaintenanceTab() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStatus = async () => {
    try {
      const { data } = await withTimeout(supabase.from("maintenance_mode").select("*").limit(1).single());
      if (data) {
        setIsActive(data.is_active);
        setMessage(data.message || "");
      }
    } catch (err) {
      logAndToast(err, "Carregar Manutenção", toast);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleToggle = async (active: boolean) => {
    setSaving(true);
    try {
      const { data: rows } = await supabase.from("maintenance_mode").select("id").limit(1);
      const id = rows?.[0]?.id;
      if (!id) throw new Error("Registro de manutenção não encontrado");
      const { error } = await withTimeout(
        supabase.from("maintenance_mode").update({ is_active: active, message, updated_at: new Date().toISOString() }).eq("id", id)
      );
      if (error) throw error;
      setIsActive(active);

      const user = (await supabase.auth.getUser()).data.user;
      await supabase.from("system_audit_logs").insert({
        user_id: user?.id || "",
        user_email: user?.email || "",
        action: active ? "MAINTENANCE_ON" : "MAINTENANCE_OFF",
        description: `Modo manutenção ${active ? "ativado" : "desativado"}`,
      });

      toast({ title: `Modo manutenção ${active ? "ativado" : "desativado"}` });
    } catch (err) {
      logAndToast(err, "Alterar Manutenção", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessage = async () => {
    setSaving(true);
    try {
      const { data: rows } = await supabase.from("maintenance_mode").select("id").limit(1);
      const id = rows?.[0]?.id;
      if (!id) throw new Error("Registro não encontrado");
      await withTimeout(supabase.from("maintenance_mode").update({ message }).eq("id", id));
      toast({ title: "Mensagem salva" });
    } catch (err) {
      logAndToast(err, "Salvar Mensagem", toast);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Construction className="h-5 w-5" /> Modo Manutenção</CardTitle>
        <CardDescription>Quando ativo, clientes são redirecionados para uma página de manutenção</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={handleToggle} disabled={saving} />
          <span className={isActive ? "text-destructive font-semibold" : "text-muted-foreground"}>
            {isActive ? "ATIVO — Loja bloqueada" : "Desativado — Loja normal"}
          </span>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Mensagem para clientes</label>
          <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Sistema em manutenção..." />
          <Button size="sm" variant="outline" onClick={handleSaveMessage} disabled={saving}>Salvar Mensagem</Button>
        </div>
      </CardContent>
    </Card>
  );
}
