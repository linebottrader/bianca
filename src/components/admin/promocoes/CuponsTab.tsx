import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Cupom = {
  id: string;
  nome_promocao: string;
  codigo: string;
  tipo_desconto: string;
  valor_desconto: number;
  valor_minimo_pedido: number;
  limite_total_uso: number;
  limite_por_cliente: number;
  usos_atuais: number;
  data_inicio: string | null;
  data_fim: string | null;
  status: boolean;
  created_at: string;
};

const EMPTY: Omit<Cupom, "id" | "created_at" | "usos_atuais"> = {
  nome_promocao: "",
  codigo: "",
  tipo_desconto: "percentual",
  valor_desconto: 10,
  valor_minimo_pedido: 0,
  limite_total_uso: 100,
  limite_por_cliente: 1,
  data_inicio: null,
  data_fim: null,
  status: true,
};

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "PROMO-";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function CuponsTab() {
  const { toast } = useToast();
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cupom | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchCupons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cupons").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar cupons", variant: "destructive" });
    else setCupons((data as any[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchCupons(); }, [fetchCupons]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (c: Cupom) => {
    setEditing(c);
    setForm({
      nome_promocao: c.nome_promocao,
      codigo: c.codigo,
      tipo_desconto: c.tipo_desconto,
      valor_desconto: c.valor_desconto,
      valor_minimo_pedido: c.valor_minimo_pedido,
      limite_total_uso: c.limite_total_uso,
      limite_por_cliente: c.limite_por_cliente,
      data_inicio: c.data_inicio,
      data_fim: c.data_fim,
      status: c.status,
    });
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    let code = generateCode();
    // Check uniqueness
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("cupons").select("id").eq("codigo", code).maybeSingle();
      if (!data) break;
      code = generateCode();
    }
    setForm((f) => ({ ...f, codigo: code }));
  };

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nome_promocao.trim()) {
      toast({ title: "Preencha nome e código", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome_promocao: form.nome_promocao.trim(),
        codigo: form.codigo.trim().toUpperCase(),
        tipo_desconto: form.tipo_desconto,
        valor_desconto: Number(form.valor_desconto),
        valor_minimo_pedido: Number(form.valor_minimo_pedido),
        limite_total_uso: Number(form.limite_total_uso),
        limite_por_cliente: Number(form.limite_por_cliente),
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from("cupons").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Cupom atualizado" });
      } else {
        // check unique code
        const { data: exists } = await supabase.from("cupons").select("id").eq("codigo", payload.codigo).maybeSingle();
        if (exists) { toast({ title: "Código já existe", variant: "destructive" }); setSaving(false); return; }
        const { error } = await supabase.from("cupons").insert(payload);
        if (error) throw error;
        toast({ title: "Cupom criado" });
      }
      setDialogOpen(false);
      fetchCupons();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c: Cupom) => {
    await supabase.from("cupons").update({ status: !c.status }).eq("id", c.id);
    fetchCupons();
  };

  const deleteCupom = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    await supabase.from("cupons").delete().eq("id", id);
    fetchCupons();
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
  const tipoLabel = (t: string) => ({ percentual: "Porcentagem", valor_fixo: "Valor fixo", frete_gratis: "Frete grátis" }[t] || t);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cupons de Desconto</h3>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Criar Promoção</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : cupons.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum cupom cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Mín. pedido</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold">{c.codigo}</TableCell>
                    <TableCell>{c.nome_promocao}</TableCell>
                    <TableCell>{tipoLabel(c.tipo_desconto)}</TableCell>
                    <TableCell>{c.tipo_desconto === "percentual" ? `${c.valor_desconto}%` : c.tipo_desconto === "frete_gratis" ? "—" : `R$ ${c.valor_desconto.toFixed(2)}`}</TableCell>
                    <TableCell>R$ {c.valor_minimo_pedido.toFixed(2)}</TableCell>
                    <TableCell>{c.usos_atuais}/{c.limite_total_uso || "∞"}</TableCell>
                    <TableCell>{formatDate(c.data_inicio)}</TableCell>
                    <TableCell>{formatDate(c.data_fim)}</TableCell>
                    <TableCell><Badge variant={c.status ? "default" : "secondary"}>{c.status ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => toggleStatus(c)}><RefreshCw className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteCupom(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Cupom" : "Criar Promoção"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome da promoção *</Label>
                <Input value={form.nome_promocao} onChange={(e) => setForm((f) => ({ ...f, nome_promocao: e.target.value }))} placeholder="Ex: Promoção de inauguração" />
              </div>
              <div>
                <Label>Código do cupom *</Label>
                <div className="flex gap-2">
                  <Input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="PROMO-XXXXX" className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerate}>Gerar</Button>
                </div>
              </div>
              <div>
                <Label>Tipo de desconto</Label>
                <Select value={form.tipo_desconto} onValueChange={(v) => setForm((f) => ({ ...f, tipo_desconto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Porcentagem (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                    <SelectItem value="frete_gratis">Frete grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipo_desconto !== "frete_gratis" && (
                <div>
                  <Label>Valor do desconto</Label>
                  <Input type="number" min={0} value={form.valor_desconto} onChange={(e) => setForm((f) => ({ ...f, valor_desconto: Number(e.target.value) }))} />
                </div>
              )}
              <div>
                <Label>Valor mínimo do pedido (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.valor_minimo_pedido} onChange={(e) => setForm((f) => ({ ...f, valor_minimo_pedido: Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Limite total de uso</Label>
                  <Input type="number" min={0} value={form.limite_total_uso} onChange={(e) => setForm((f) => ({ ...f, limite_total_uso: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Limite por cliente</Label>
                  <Input type="number" min={1} value={form.limite_por_cliente} onChange={(e) => setForm((f) => ({ ...f, limite_por_cliente: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data início</Label>
                  <Input type="date" value={form.data_inicio?.split("T")[0] || ""} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                </div>
                <div>
                  <Label>Data fim</Label>
                  <Input type="date" value={form.data_fim?.split("T")[0] || ""} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value ? new Date(e.target.value + "T23:59:59").toISOString() : null }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.status} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                <Label>Ativo</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Salvando..." : editing ? "Atualizar" : "Criar Cupom"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
