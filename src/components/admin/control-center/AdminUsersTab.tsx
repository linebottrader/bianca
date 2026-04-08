import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { logAndToast, withTimeout } from "@/utils/adminUtils";
import { UserPlus, Trash2, Shield, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleEntry {
  id: string;
  user_id: string;
  role: string;
}

export default function AdminUsersTab() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("admin");
  const [saving, setSaving] = useState(false);

  // Edit dialog state
  const [editEntry, setEditEntry] = useState<RoleEntry | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(supabase.from("user_roles").select("*"));
      if (error) throw error;
      const rolesData = data || [];
      setRoles(rolesData);

      // Fetch emails via edge function
      const userIds = rolesData.map(r => r.user_id);
      if (userIds.length > 0) {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (token) {
          const { data: result, error: fnErr } = await supabase.functions.invoke("list-admin-users", {
            body: { user_ids: userIds },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!fnErr && result?.emails) {
            setEmailMap(result.emails);
          }
        }
      }
    } catch (err) {
      logAndToast(err, "Carregar Roles", toast);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleAddRole = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: "Informe o e-mail", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const { data: result, error: fnErr } = await supabase.functions.invoke("create-admin-user", {
        body: { email, password: newPassword, role: newRole },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fnErr) throw new Error(fnErr.message || "Erro ao criar usuário");
      if (result?.error) throw new Error(result.error);

      let msg = `Novo usuário ${newRole.toUpperCase()} criado para ${email}`;
      if (result?.user_created === false && result?.password_updated) {
        msg = result?.role_created
          ? `Usuário existente encontrado. Senha atualizada e role ${newRole.toUpperCase()} vinculada para ${email}`
          : `Senha atualizada para ${email} (role ${newRole.toUpperCase()} já existia)`;
      }
      toast({ title: msg });
      setNewEmail("");
      setNewPassword("");
      fetchRoles();
    } catch (err) {
      logAndToast(err, "Criar Administrador", toast);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (entry: RoleEntry) => {
    if (entry.role === "admin") {
      const adminCount = roles.filter(r => r.role === "admin").length;
      if (adminCount <= 1) {
        toast({ title: "Não é possível remover o último admin", variant: "destructive" });
        return;
      }
    }
    try {
      const { error } = await withTimeout(supabase.from("user_roles").delete().eq("id", entry.id));
      if (error) throw error;
      await supabase.from("system_audit_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || "",
        action: "REMOVE_ROLE",
        description: `Role ${entry.role} removida de ${emailMap[entry.user_id] || entry.user_id}`,
      });
      toast({ title: "Role removida" });
      fetchRoles();
    } catch (err) {
      logAndToast(err, "Remover Role", toast);
    }
  };

  const handleEditRole = async () => {
    if (!editEntry) return;
    setEditSaving(true);
    try {
      const { error } = await withTimeout(
        supabase.from("user_roles").update({ role: editRole as any }).eq("id", editEntry.id)
      );
      if (error) throw error;
      await supabase.from("system_audit_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || "",
        action: "UPDATE_ROLE",
        description: `Role alterada de ${editEntry.role} para ${editRole} — ${emailMap[editEntry.user_id] || editEntry.user_id}`,
      });
      toast({ title: "Role atualizada" });
      setEditEntry(null);
      fetchRoles();
    } catch (err) {
      logAndToast(err, "Editar Role", toast);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Adicionar Administrador</CardTitle>
          <CardDescription>Informe o e-mail e senha para criar um novo admin ou gerente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="email"
            placeholder="E-mail do novo administrador"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Senha (mínimo 6 caracteres)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            minLength={6}
          />
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin (acesso total)</SelectItem>
              <SelectItem value="manager">Manager (pedidos, produtos, clientes)</SelectItem>
              <SelectItem value="kds">KDS (apenas painel cozinha)</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={saving} onClick={handleAddRole}>
            {saving ? "Criando..." : "Criar e Adicionar Role"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Administradores Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {emailMap[r.user_id] || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                        {r.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditEntry(r); setEditRole(r.role); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveRole(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Role — {emailMap[editEntry?.user_id || ""] || "Usuário"}</DialogTitle>
          </DialogHeader>
          <Select value={editRole} onValueChange={setEditRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin (acesso total)</SelectItem>
              <SelectItem value="manager">Manager (pedidos, produtos, clientes)</SelectItem>
              <SelectItem value="kds">KDS (apenas painel cozinha)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancelar</Button>
            <Button disabled={editSaving} onClick={handleEditRole}>
              {editSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
