import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { Trash2, RotateCcw, Download, Upload, Eraser } from "lucide-react";

const CONFIRM_LIMPAR = "LIMPAR PEDIDOS";
const CONFIRM_ZERAR = "ZERAR SISTEMA";
const CONFIRM_RESTAURAR = "RESTAURAR BACKUP";

export default function DatabaseTab() {
  const { toast } = useToast();
  const [confirmLimpar, setConfirmLimpar] = useState("");
  const [confirmZerar, setConfirmZerar] = useState("");
  const [confirmRestaurar, setConfirmRestaurar] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const logAudit = async (action: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("system_audit_logs").insert({
          user_id: user.id,
          user_email: user.email || "",
          action,
          description,
        });
      }
    } catch {}
  };

  const handleLimparPedidos = async () => {
    if (confirmLimpar !== CONFIRM_LIMPAR) {
      toast({ title: `Digite "${CONFIRM_LIMPAR}" para confirmar`, variant: "destructive" });
      return;
    }
    setLoading("limpar");
    try {
      await withTimeout(supabase.from("itens_pedido").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      await withTimeout(supabase.from("pagamentos").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      await withTimeout(supabase.from("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      await withTimeout(supabase.from("enderecos_cliente").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      await withTimeout(supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      await logAudit("LIMPAR_PEDIDOS", "Limpeza de pedidos, itens, pagamentos, clientes e endereços");
      toast({ title: "Pedidos limpos com sucesso" });
      setConfirmLimpar("");
    } catch (err) {
      logAndToast(err, "Limpar Pedidos", toast);
    } finally {
      setLoading(null);
    }
  };

  const handleResetCompleto = async () => {
    if (confirmZerar !== CONFIRM_ZERAR) {
      toast({ title: `Digite "${CONFIRM_ZERAR}" para confirmar`, variant: "destructive" });
      return;
    }
    setLoading("reset");
    try {
      const tables = ["itens_pedido", "pagamentos", "pedidos", "option_items", "menu_options", "menu_items", "categories", "enderecos_cliente", "clientes"] as const;
      for (const t of tables) {
        await withTimeout(supabase.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000"));
      }
      await logAudit("RESET_COMPLETO", "Reset completo de todas as tabelas públicas");
      toast({ title: "Sistema zerado com sucesso" });
      setConfirmZerar("");
    } catch (err) {
      logAndToast(err, "Reset Completo", toast);
    } finally {
      setLoading(null);
    }
  };

  const handleBackup = async () => {
    setLoading("backup");
    try {
      const backup: Record<string, any> = {};
      const tables = ["categories", "menu_items", "menu_options", "option_items", "clientes", "enderecos_cliente", "pedidos", "itens_pedido", "pagamentos", "store_config", "configuracao_pix", "configuracao_frete"] as const;
      for (const t of tables) {
        const { data } = await withTimeout(supabase.from(t).select("*").limit(1000));
        backup[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-delivery-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await logAudit("BACKUP", "Backup exportado");
      toast({ title: "Backup exportado com sucesso" });
    } catch (err) {
      logAndToast(err, "Backup", toast);
    } finally {
      setLoading(null);
    }
  };

  const handleRestaurar = async () => {
    if (confirmRestaurar !== CONFIRM_RESTAURAR) {
      toast({ title: `Digite "${CONFIRM_RESTAURAR}" para confirmar`, variant: "destructive" });
      return;
    }
    if (!backupFile) {
      toast({ title: "Selecione um arquivo de backup", variant: "destructive" });
      return;
    }
    setLoading("restaurar");
    try {
      const text = await backupFile.text();
      const data = JSON.parse(text);
      const insertOrder = ["categories", "menu_items", "menu_options", "option_items", "clientes", "enderecos_cliente", "pedidos", "itens_pedido", "pagamentos"] as const;
      for (const table of insertOrder) {
        if (data[table]?.length) {
          await withTimeout(supabase.from(table).upsert(data[table], { onConflict: "id" }));
        }
      }
      await logAudit("RESTAURAR_BACKUP", `Backup restaurado: ${backupFile.name}`);
      toast({ title: "Backup restaurado com sucesso" });
      setConfirmRestaurar("");
      setBackupFile(null);
    } catch (err) {
      logAndToast(err, "Restaurar Backup", toast);
    } finally {
      setLoading(null);
    }
  };

  const handleLimparCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast({ title: "Cache local limpo com sucesso" });
  };

  return (
    <div className="space-y-6">
      {/* Limpeza de Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" /> Limpeza de Pedidos</CardTitle>
          <CardDescription>Remove pedidos, itens, pagamentos, clientes e endereços</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder={`Digite "${CONFIRM_LIMPAR}" para confirmar`} value={confirmLimpar} onChange={e => setConfirmLimpar(e.target.value)} />
          <Button variant="destructive" disabled={loading === "limpar"} onClick={handleLimparPedidos}>
            {loading === "limpar" ? "Limpando..." : "Limpar Pedidos"}
          </Button>
        </CardContent>
      </Card>

      {/* Reset Completo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-destructive" /> Reset Completo</CardTitle>
          <CardDescription>Remove TODOS os dados do sistema (produtos, categorias, pedidos, clientes)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder={`Digite "${CONFIRM_ZERAR}" para confirmar`} value={confirmZerar} onChange={e => setConfirmZerar(e.target.value)} />
          <Button variant="destructive" disabled={loading === "reset"} onClick={handleResetCompleto}>
            {loading === "reset" ? "Zerando..." : "Zerar Sistema"}
          </Button>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Backup do Sistema</CardTitle>
          <CardDescription>Exporta todas as tabelas em JSON</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled={loading === "backup"} onClick={handleBackup}>
            {loading === "backup" ? "Exportando..." : "Exportar Backup"}
          </Button>
        </CardContent>
      </Card>

      {/* Restaurar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Restaurar Backup</CardTitle>
          <CardDescription>Importa dados de um arquivo JSON de backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept=".json" onChange={e => setBackupFile(e.target.files?.[0] || null)} />
          <Input placeholder={`Digite "${CONFIRM_RESTAURAR}" para confirmar`} value={confirmRestaurar} onChange={e => setConfirmRestaurar(e.target.value)} />
          <Button disabled={loading === "restaurar"} onClick={handleRestaurar}>
            {loading === "restaurar" ? "Restaurando..." : "Restaurar Backup"}
          </Button>
        </CardContent>
      </Card>

      {/* Limpar Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eraser className="h-5 w-5" /> Limpar Cache</CardTitle>
          <CardDescription>Limpa localStorage e sessionStorage do navegador</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLimparCache}>Limpar Cache Local</Button>
        </CardContent>
      </Card>
    </div>
  );
}
