import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cake, Gift, Send, Loader2, Settings, PartyPopper } from "lucide-react";

type Cliente = {
  id: string;
  nome_completo: string;
  telefone: string;
  data_nascimento: string;
  email: string | null;
};

type CupomAniversario = {
  id: string;
  cliente_id: string;
  codigo: string;
  desconto: number;
  validade: string;
  usado: boolean;
  whatsapp_enviado: boolean;
  ano: number;
};

type Config = {
  id: string;
  ativo: boolean;
  desconto_percentual: number;
  validade_horas: number;
  mensagem_whatsapp: string;
  envio_automatico: boolean;
};

const DEFAULT_CONFIG: Omit<Config, "id"> = {
  ativo: true,
  desconto_percentual: 10,
  validade_horas: 24,
  mensagem_whatsapp: "🎉 Parabéns, {nome}! Hoje é seu aniversário 🎂\nPreparamos um presente pra você:\n🎁 Cupom: {codigo}\n💸 Desconto: {desconto}%\n⏰ Válido por {validade}h\nAproveite agora: {link_loja}",
  envio_automatico: true,
};

function getSPDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function isBirthdayToday(dataNascimento: string): boolean {
  const sp = getSPDate();
  const birth = new Date(dataNascimento + "T12:00:00");
  return birth.getDate() === sp.getDate() && birth.getMonth() === sp.getMonth();
}

function isBirthdayInNext7Days(dataNascimento: string): boolean {
  const sp = getSPDate();
  const birth = new Date(dataNascimento + "T12:00:00");
  const bDay = birth.getDate();
  const bMonth = birth.getMonth();

  for (let i = 1; i <= 7; i++) {
    const future = new Date(sp);
    future.setDate(future.getDate() + i);
    if (future.getDate() === bDay && future.getMonth() === bMonth) return true;
  }
  return false;
}

function formatDate(d: string): string {
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "ANIVER-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return "+" + digits;
  return "+55" + digits;
}

const AdminAniversariantes = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cupons, setCupons] = useState<CupomAniversario[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [configForm, setConfigForm] = useState<Omit<Config, "id">>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const currentYear = getSPDate().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientesRes, cuponsRes, configRes] = await Promise.all([
        supabase.from("clientes").select("id, nome_completo, telefone, data_nascimento, email"),
        supabase.from("cupons_aniversario" as any).select("*").eq("ano", currentYear),
        supabase.from("aniversario_config" as any).select("*").limit(1).maybeSingle(),
      ]);

      if (clientesRes.data) setClientes(clientesRes.data as unknown as Cliente[]);
      if (cuponsRes.data) setCupons(cuponsRes.data as unknown as CupomAniversario[]);
      if (configRes.data) {
        const c = configRes.data as unknown as Config;
        setConfig(c);
        setConfigForm({
          ativo: c.ativo,
          desconto_percentual: c.desconto_percentual,
          validade_horas: c.validade_horas,
          mensagem_whatsapp: c.mensagem_whatsapp,
          envio_automatico: c.envio_automatico,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const aniversariantesHoje = clientes.filter((c) => isBirthdayToday(c.data_nascimento));
  const proximos7Dias = clientes.filter((c) => isBirthdayInNext7Days(c.data_nascimento));

  const getCupomForCliente = (clienteId: string) => cupons.find((c) => c.cliente_id === clienteId);

  const handleGerarCupons = async () => {
    if (!config?.ativo) {
      toast({ title: "Sistema de aniversário desativado", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const storeUrl = window.location.origin;
      const { data: storeConfig } = await supabase.from("store_config").select("whatsapp").limit(1).maybeSingle();
      const whatsapp = storeConfig?.whatsapp || "";

      let created = 0;
      let sent = 0;

      for (const cliente of aniversariantesHoje) {
        const existing = getCupomForCliente(cliente.id);
        if (existing) continue;

        const codigo = generateCode();
        const validade = new Date();
        validade.setHours(validade.getHours() + (config.validade_horas || 24));

        const { error } = await supabase.from("cupons_aniversario" as any).insert({
          cliente_id: cliente.id,
          codigo,
          desconto: config.desconto_percentual,
          validade: validade.toISOString(),
          ano: currentYear,
        } as any);

        if (error) {
          if (error.code === "23505") continue; // duplicate
          console.error(error);
          continue;
        }
        created++;

        // Send WhatsApp if enabled
        if (config.envio_automatico && cliente.telefone && whatsapp) {
          const msg = config.mensagem_whatsapp
            .replace("{nome}", cliente.nome_completo)
            .replace("{codigo}", codigo)
            .replace("{desconto}", String(config.desconto_percentual))
            .replace("{validade}", String(config.validade_horas))
            .replace("{link_loja}", storeUrl);

          const cleanPhone = formatPhoneForWhatsApp(cliente.telefone);
          const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
          window.open(waUrl, "_blank");

          await supabase.from("cupons_aniversario" as any)
            .update({ whatsapp_enviado: true } as any)
            .eq("cliente_id", cliente.id)
            .eq("ano", currentYear);
          sent++;
        }
      }

      await fetchData();
      toast({
        title: "Cupons gerados!",
        description: `${created} cupom(ns) criado(s)${sent > 0 ? `, ${sent} mensagem(ns) enviada(s)` : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Erro ao gerar cupons", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleEnviarWhatsApp = async (cliente: Cliente) => {
    const cupom = getCupomForCliente(cliente.id);
    if (!cupom || !config) return;

    const storeUrl = window.location.origin;
    const msg = config.mensagem_whatsapp
      .replace("{nome}", cliente.nome_completo)
      .replace("{codigo}", cupom.codigo)
      .replace("{desconto}", String(cupom.desconto))
      .replace("{validade}", String(config.validade_horas))
      .replace("{link_loja}", storeUrl);

    const cleanPhone = formatPhoneForWhatsApp(cliente.telefone);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;

    // Open in new tab - user needs to click send in WhatsApp
    window.open(waUrl, "_blank");

    await supabase.from("cupons_aniversario" as any)
      .update({ whatsapp_enviado: true } as any)
      .eq("id", cupom.id);

    await fetchData();
    toast({ title: "WhatsApp aberto!", description: "Clique em 'Enviar' na janela do WhatsApp para confirmar o envio." });
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      await supabase.from("aniversario_config" as any)
        .update({
          ativo: configForm.ativo,
          desconto_percentual: configForm.desconto_percentual,
          validade_horas: configForm.validade_horas,
          mensagem_whatsapp: configForm.mensagem_whatsapp,
          envio_automatico: configForm.envio_automatico,
        } as any)
        .eq("id", config.id);
      await fetchData();
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderClienteTable = (lista: Cliente[], titulo: string, showActions: boolean) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {showActions ? <Cake className="h-5 w-5 text-primary" /> : <PartyPopper className="h-5 w-5 text-primary" />}
          {titulo} ({lista.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum aniversariante encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data Nasc.</TableHead>
                {showActions && <TableHead>Cupom</TableHead>}
                {showActions && <TableHead>WhatsApp</TableHead>}
                {showActions && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => {
                const cupom = getCupomForCliente(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome_completo}</TableCell>
                    <TableCell>{c.telefone}</TableCell>
                    <TableCell>{formatDate(c.data_nascimento)}</TableCell>
                    {showActions && (
                      <TableCell>
                        {cupom ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Gift className="h-3 w-3" /> {cupom.codigo}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não gerado</span>
                        )}
                      </TableCell>
                    )}
                    {showActions && (
                      <TableCell>
                        {cupom?.whatsapp_enviado ? (
                          <span className="text-xs text-primary">✓ Enviado</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pendente</span>
                        )}
                      </TableCell>
                    )}
                    {showActions && (
                      <TableCell className="space-x-1">
                        {cupom && c.telefone && (
                          <Button size="sm" variant="outline" onClick={() => handleEnviarWhatsApp(c)}>
                            <Send className="h-3 w-3 mr-1" /> {cupom.whatsapp_enviado ? "Reenviar" : "Enviar"}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {showActions && lista.length > 0 && (
          <div className="mt-4">
            <Button onClick={handleGerarCupons} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
              Gerar Cupons e Enviar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderClienteTable(aniversariantesHoje, "Aniversariantes de Hoje", true)}
      {renderClienteTable(proximos7Dias, "Próximos 7 Dias", false)}

      {/* Config Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Configurações de Aniversário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Sistema ativo</Label>
            <Switch checked={configForm.ativo} onCheckedChange={(v) => setConfigForm((p) => ({ ...p, ativo: v }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={configForm.desconto_percentual}
                onChange={(e) => setConfigForm((p) => ({ ...p, desconto_percentual: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Validade (horas)</Label>
              <Input
                type="number"
                min={1}
                value={configForm.validade_horas}
                onChange={(e) => setConfigForm((p) => ({ ...p, validade_horas: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Mensagem WhatsApp</Label>
            <Textarea
              rows={6}
              value={configForm.mensagem_whatsapp}
              onChange={(e) => setConfigForm((p) => ({ ...p, mensagem_whatsapp: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: {"{nome}"}, {"{codigo}"}, {"{desconto}"}, {"{validade}"}, {"{link_loja}"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Envio automático via WhatsApp</Label>
            <Switch
              checked={configForm.envio_automatico}
              onCheckedChange={(v) => setConfigForm((p) => ({ ...p, envio_automatico: v }))}
            />
          </div>

          <Button onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAniversariantes;
