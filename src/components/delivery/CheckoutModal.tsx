import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useCustomer } from "@/contexts/CustomerAuthContext";
import { useStoreConfig } from "@/hooks/useStoreData";
import { supabase } from "@/integrations/supabase/client";
import { X, Loader2, Ticket, Sparkles, ShoppingBag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import CustomerAuthModal from "./CustomerAuthModal";
import WhatsAppFallbackModal from "./WhatsAppFallbackModal";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { resolvePromotions, type PromotionResult } from "@/utils/promotionEngine";
import { useAnalytics } from "@/hooks/useAnalytics";

type PixConfig = {
  qr_code_url: string;
  nome_recebedor: string;
  chave_pix: string;
};

type FreteResult = {
  distanciaKm: number;
  valorFrete: number;
  apiProvider: string;
};

type CupomAplicado = {
  id: string;
  codigo: string;
  tipo_desconto: string;
  valor_desconto: number;
  nome_promocao: string;
};

type Props = { onClose: () => void };

const CheckoutModal = ({ onClose }: Props) => {
  const { items, totalPrice, clearCart } = useCart();
  const { cliente, user } = useCustomer();
  const { data: config } = useStoreConfig();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  // Track order_started on mount
  useEffect(() => {
    trackEvent("order_started", { cart_total: totalPrice, item_count: items.length });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [tipoEntrega, setTipoEntrega] = useState("");
  const [enderecoEntrega, setEnderecoEntrega] = useState({ rua: "", numero: "", complemento: "", bairro: "" });
  const [formaPagamento, setFormaPagamento] = useState("");
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [whatsappFallbackUrl, setWhatsappFallbackUrl] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  // Freight state
  const [freteResult, setFreteResult] = useState<FreteResult | null>(null);
  const [freteLoading, setFreteLoading] = useState(false);
  const [freteError, setFreteError] = useState<string | null>(null);
  const [freteEnabled, setFreteEnabled] = useState(false);

  // Coupon state
  const [cupomInput, setCupomInput] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(null);
  const [cupomLoading, setCupomLoading] = useState(false);
  const [showCupomField, setShowCupomField] = useState(false);

  // Promo config & extras
  const [promoConfig, setPromoConfig] = useState<any>(null);
  const [surpriseCoupon, setSurpriseCoupon] = useState<{ codigo: string; valor: number } | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // === PROMOTION ENGINE ===
  const promoResult: PromotionResult = useMemo(() => {
    return resolvePromotions({
      subtotal: totalPrice,
      promoConfig,
      validatedCoupon: cupomAplicado
        ? { tipo_desconto: cupomAplicado.tipo_desconto, valor_desconto: cupomAplicado.valor_desconto, codigo: cupomAplicado.codigo, nome_promocao: cupomAplicado.nome_promocao }
        : null,
    });
  }, [totalPrice, promoConfig, cupomAplicado]);

  const rawDeliveryFee = freteEnabled && freteResult
    ? freteResult.valorFrete
    : (totalPrice >= (config?.delivery_free_above ?? 50) ? 0 : (config?.delivery_fee ?? 5));
  const deliveryFee = promoResult.isFreteGratis ? 0 : rawDeliveryFee;
  const grandTotal = Math.max(0, totalPrice - promoResult.finalDiscount + (tipoEntrega === "ENTREGA" ? deliveryFee : 0));

  useEffect(() => {
    supabase.from("configuracao_pix").select("*").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setPixConfig(data as unknown as PixConfig); });
    (supabase.rpc as any)("is_frete_enabled")
      .then(({ data }: any) => setFreteEnabled(!!data));
    supabase.from("promocoes_config").select("*").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setPromoConfig(data); });
  }, []);

  // Surprise coupon
  useEffect(() => {
    if (!promoConfig?.cupom_surpresa?.ativo) return;
    const cs = promoConfig.cupom_surpresa;
    if (totalPrice >= (cs.valor_minimo_pedido || 0)) {
      setSurpriseCoupon({ codigo: cs.cupom_codigo || "AGORA5", valor: cs.valor_desconto || 5 });
    }
  }, [promoConfig, totalPrice]);

  // Product recommendations
  useEffect(() => {
    if (items.length === 0) return;
    const cartItemNames = items.map(i => i.menuItem.name);
    supabase.from("menu_items").select("id, name, price, image_url")
      .eq("disponivel", true).eq("visivel", true).limit(5)
      .then(({ data }) => {
        if (data) setRecommendations(data.filter((r: any) => !cartItemNames.includes(r.name)).slice(0, 3));
      });
  }, [items]);

  useEffect(() => {
    if (tipoEntrega !== "ENTREGA") { setFreteResult(null); setFreteError(null); }
  }, [tipoEntrega]);

  const calcularFrete = useCallback(async () => {
    const { rua, numero, bairro } = enderecoEntrega;
    if (!rua || !numero || !bairro) {
      toast({ title: "Preencha o endereço completo para calcular o frete", variant: "destructive" });
      return;
    }
    const enderecoCompleto = `${rua}, ${numero} - ${bairro}`;
    setFreteLoading(true); setFreteError(null); setFreteResult(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/calcular-frete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endereco_cliente: enderecoCompleto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao calcular frete");
      setFreteResult(data as FreteResult);
    } catch (err: any) {
      setFreteError(err.message || "Não foi possível calcular o frete.");
      toast({ title: "Erro no cálculo de frete", description: err.message, variant: "destructive" });
    } finally { setFreteLoading(false); }
  }, [enderecoEntrega, toast]);

  // Coupon validation
  const aplicarCupom = async () => {
    const code = cupomInput.trim().toUpperCase();
    if (!code) return;
    setCupomLoading(true);
    try {
      // First check birthday coupons
      if (code.startsWith("ANIVER") && cliente) {
        const { data: bCupom } = await supabase
          .from("cupons_aniversario" as any)
          .select("*")
          .eq("codigo", code)
          .eq("cliente_id", cliente.id)
          .eq("usado", false)
          .maybeSingle();
        if (bCupom) {
          const bc = bCupom as any;
          if (new Date(bc.validade) > new Date()) {
            setCupomAplicado({
              id: bc.id,
              codigo: bc.codigo,
              tipo_desconto: "percentual",
              valor_desconto: bc.desconto,
              nome_promocao: "Aniversário",
            });
            toast({ title: `Cupom de aniversário ${bc.codigo} aplicado!` });
            return;
          } else {
            toast({ title: "Cupom de aniversário expirado", variant: "destructive" });
            return;
          }
        }
      }

      const { data: cupom, error } = await supabase.from("cupons").select("*").eq("codigo", code).eq("status", true).maybeSingle();
      if (error) throw error;
      if (!cupom) { toast({ title: "Cupom não encontrado ou inativo", variant: "destructive" }); return; }

      const now = new Date();
      if (cupom.data_inicio && new Date(cupom.data_inicio) > now) { toast({ title: "Cupom ainda não está válido", variant: "destructive" }); return; }
      if (cupom.data_fim && new Date(cupom.data_fim) < now) { toast({ title: "Cupom expirado", variant: "destructive" }); return; }
      if (cupom.valor_minimo_pedido && totalPrice < cupom.valor_minimo_pedido) {
        toast({ title: `Pedido mínimo: R$ ${cupom.valor_minimo_pedido.toFixed(2)}`, variant: "destructive" }); return;
      }
      if (cupom.limite_total_uso > 0 && cupom.usos_atuais >= cupom.limite_total_uso) {
        toast({ title: "Cupom esgotado", variant: "destructive" }); return;
      }
      if (cliente) {
        const { count } = await supabase.from("cupons_usados").select("id", { count: "exact", head: true })
          .eq("cupom_id", cupom.id).eq("cliente_id", cliente.id);
        if ((count || 0) >= cupom.limite_por_cliente) {
          toast({ title: "Você já usou este cupom o máximo de vezes permitido", variant: "destructive" }); return;
        }
      }

      setCupomAplicado({
        id: cupom.id, codigo: cupom.codigo, tipo_desconto: cupom.tipo_desconto,
        valor_desconto: cupom.valor_desconto, nome_promocao: cupom.nome_promocao,
      });
      toast({ title: `Cupom ${cupom.codigo} aplicado!` });
    } catch (err: any) {
      toast({ title: "Erro ao validar cupom", description: err.message, variant: "destructive" });
    } finally { setCupomLoading(false); }
  };

  const removerCupom = () => { setCupomAplicado(null); setCupomInput(""); };

  const generateOrderNumber = async (): Promise<string> => {
    for (let i = 0; i < 10; i++) {
      const num = String(Date.now()).slice(-4) + String(Math.floor(Math.random() * 9000) + 1000);
      const short = num.slice(-4 - Math.floor(Math.random() * 3));
      const candidate = short.length >= 4 ? short : num.slice(-4);
      const { data } = await supabase.from("pedidos").select("id").eq("numero_pedido", candidate).maybeSingle();
      if (!data) return candidate;
    }
    return String(Date.now()).slice(-8);
  };

  const handleFinalize = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Store status check
      const { data: freshConfig } = await supabase.from("store_config")
        .select("is_open, status_message, schedule_weekdays, schedule_weekends").limit(1).single();

      if (freshConfig) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const scheduleStr = isWeekend ? freshConfig.schedule_weekends : freshConfig.schedule_weekdays;
        let withinSchedule = true;
        if (scheduleStr) {
          const parts = scheduleStr.split("-").map((s: string) => s.trim());
          if (parts.length === 2) {
            const [oH, oM] = parts[0].split(":").map(Number);
            const [cH, cM] = parts[1].split(":").map(Number);
            const currentMin = now.getHours() * 60 + now.getMinutes();
            const openMin = oH * 60 + oM;
            let closeMin = cH * 60 + cM;
            if (closeMin === 0) closeMin = 1440;
            if (closeMin <= openMin) withinSchedule = currentMin >= openMin || currentMin < closeMin;
            else withinSchedule = currentMin >= openMin && currentMin < closeMin;
          }
        }
        if (!freshConfig.is_open || !withinSchedule) {
          toast({ title: "Loja fechada", description: freshConfig.status_message || "A loja não está aceitando pedidos no momento.", variant: "destructive" });
          setSubmitting(false); return;
        }
      }

      if (!user || !cliente) { setShowAuth(true); setSubmitting(false); return; }
      if (items.length === 0) { toast({ title: "Carrinho vazio", variant: "destructive" }); setSubmitting(false); return; }
      if (!tipoEntrega) { toast({ title: "Selecione o tipo de entrega", variant: "destructive" }); setSubmitting(false); return; }
      if (tipoEntrega === "ENTREGA" && (!enderecoEntrega.rua || !enderecoEntrega.numero || !enderecoEntrega.bairro)) {
        toast({ title: "Preencha o endereço de entrega completo", variant: "destructive" }); setSubmitting(false); return;
      }
      if (tipoEntrega === "ENTREGA" && freteEnabled && !freteResult) {
        toast({ title: "Calcule o frete antes de finalizar", variant: "destructive" }); setSubmitting(false); return;
      }
      if (!formaPagamento) { toast({ title: "Selecione a forma de pagamento", variant: "destructive" }); setSubmitting(false); return; }
      if (formaPagamento === "pix_manual" && !pixConfig?.chave_pix) {
        toast({ title: "Pagamento PIX indisponível", variant: "destructive" }); setSubmitting(false); return;
      }

      // === SERVER-SIDE re-validation via promotion engine ===
      // Re-fetch promo config for fresh data
      const { data: freshPromoConfig } = await supabase.from("promocoes_config").select("*").limit(1).maybeSingle();

      let validatedCupom: CupomAplicado | null = null;
      if (cupomAplicado) {
        // Check if it's a birthday coupon (nome_promocao === "Aniversário")
        if (cupomAplicado.nome_promocao === "Aniversário") {
          const { data: bCupomDB } = await supabase
            .from("cupons_aniversario" as any)
            .select("*")
            .eq("id", cupomAplicado.id)
            .eq("usado", false)
            .maybeSingle();
          if (!bCupomDB) { toast({ title: "Cupom de aniversário inválido ou já usado", variant: "destructive" }); setSubmitting(false); return; }
          const bc = bCupomDB as any;
          if (new Date(bc.validade) < new Date()) { toast({ title: "Cupom de aniversário expirado", variant: "destructive" }); setSubmitting(false); return; }
          validatedCupom = { id: bc.id, codigo: bc.codigo, tipo_desconto: "percentual", valor_desconto: bc.desconto, nome_promocao: "Aniversário" };
        } else {
          const { data: cupomDB } = await supabase.from("cupons").select("*").eq("id", cupomAplicado.id).eq("status", true).maybeSingle();
          if (!cupomDB) { toast({ title: "Cupom inválido", variant: "destructive" }); setSubmitting(false); return; }
          const now = new Date();
          if (cupomDB.data_fim && new Date(cupomDB.data_fim) < now) { toast({ title: "Cupom expirado", variant: "destructive" }); setSubmitting(false); return; }
          if (cupomDB.limite_total_uso > 0 && cupomDB.usos_atuais >= cupomDB.limite_total_uso) { toast({ title: "Cupom esgotado", variant: "destructive" }); setSubmitting(false); return; }
          validatedCupom = { id: cupomDB.id, codigo: cupomDB.codigo, tipo_desconto: cupomDB.tipo_desconto, valor_desconto: cupomDB.valor_desconto, nome_promocao: cupomDB.nome_promocao };
        }
      }

      // Run engine with fresh data
      const serverResult = resolvePromotions({
        subtotal: totalPrice,
        promoConfig: freshPromoConfig,
        validatedCoupon: validatedCupom
          ? { tipo_desconto: validatedCupom.tipo_desconto, valor_desconto: validatedCupom.valor_desconto, codigo: validatedCupom.codigo, nome_promocao: validatedCupom.nome_promocao }
          : null,
      });

      const finalDiscount = serverResult.finalDiscount;
      const finalIsFreteGratis = serverResult.isFreteGratis || (validatedCupom?.tipo_desconto === "frete_gratis");
      const finalDeliveryFee = finalIsFreteGratis ? 0 : (tipoEntrega === "ENTREGA" ? rawDeliveryFee : 0);
      const finalTotal = Math.max(0, totalPrice - finalDiscount + finalDeliveryFee);

      const numeroPedido = await generateOrderNumber();
      const complemento = enderecoEntrega.complemento?.trim() || null;
      const enderecoFull = tipoEntrega === "ENTREGA"
        ? `${enderecoEntrega.rua}, ${enderecoEntrega.numero}${complemento ? `\n${complemento}` : ""}\n${enderecoEntrega.bairro}`
        : null;

      const pedidoItens = items.map((i) => ({
        nome: i.menuItem.name, quantidade: i.quantity,
        opcoes: i.selectedOptions.map((o) => o.name),
        observacao: i.notes || "", valor: i.totalPrice,
      }));

      const isMercadoPago = formaPagamento === "mercado_pago";

      const insertData: any = {
        numero_pedido: numeroPedido, cliente_id: cliente.id,
        tipo_entrega: tipoEntrega === "ENTREGA" ? "ENTREGA" : "RETIRADA BALCÃO",
        endereco_entrega: enderecoFull, forma_pagamento: formaPagamento,
        itens: pedidoItens, valor_total: finalTotal,
        desconto: finalDiscount,
        tipo_promocao_aplicada: serverResult.tipoPromocaoAplicada,
        cupom_utilizado: validatedCupom?.codigo || null,
        status: isMercadoPago ? "aguardando_pagamento" : "pendente",
        status_pagamento: isMercadoPago ? "pendente" : "pendente",
        idempotency_key: idempotencyKeyRef.current,
      };

      if (complemento) insertData.complemento = complemento;
      if (tipoEntrega === "ENTREGA" && freteResult) {
        insertData.distancia_km = freteResult.distanciaKm;
        insertData.valor_frete = finalDeliveryFee;
        insertData.api_provider_utilizado = freteResult.apiProvider;
      }

      let pedidoId: string;
      const { data: pedidoData, error } = await supabase.from("pedidos").insert(insertData).select("id").single();

      if (error) {
        if (error.code === "23505" && error.message?.includes("idempotency_key")) {
          const { data: existing } = await supabase.from("pedidos").select("id, numero_pedido")
            .eq("idempotency_key", idempotencyKeyRef.current).single();
          if (!existing) throw error;
          pedidoId = existing.id;
        } else throw error;
      } else {
        pedidoId = pedidoData.id;
      }

      // Record coupon usage & increment counter
      if (validatedCupom) {
        // Check if it's a birthday coupon
        const isBirthdayCoupon = validatedCupom.nome_promocao === "Aniversário" && validatedCupom.codigo.startsWith("ANIVER");
        if (isBirthdayCoupon) {
          await supabase.from("cupons_aniversario" as any)
            .update({ usado: true } as any)
            .eq("id", validatedCupom.id);
        } else {
          await Promise.all([
            supabase.from("cupons_usados").insert({
              cupom_id: validatedCupom.id, cliente_id: cliente.id,
              pedido_id: pedidoId, valor_desconto: finalDiscount,
            }),
            supabase.rpc("increment_cupom_uso" as any, { cupom_id_param: validatedCupom.id } as any),
          ]);
        }
      }

      if (isMercadoPago) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/mp-create-preference`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedido_id: pedidoId }),
        });
        const mpData = await res.json();
        if (!res.ok) throw new Error(mpData.error || "Erro ao criar pagamento");
        localStorage.setItem("pedido_codigo", numeroPedido);
        trackEvent("order_completed", { order_id: pedidoId, total: finalTotal, payment: "mercado_pago" });
        clearCart(); onClose();
        toast({ title: `Pedido #${numeroPedido} criado! Redirecionando para pagamento...` });
        window.location.href = mpData.init_point;
        return;
      }

      // WhatsApp flow
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const itemsText = items.map((i) =>
        `${i.quantity}x ${i.menuItem.name}${i.selectedOptions.length > 0 ? ` (${i.selectedOptions.map((o) => o.name).join(", ")})` : ""}${i.notes ? ` - Obs: ${i.notes}` : ""} - R$ ${i.totalPrice.toFixed(2)}`
      ).join("\n");

      let msg = `*NOVO PEDIDO: ${numeroPedido}*\n\n`;
      msg += `*CLIENTE:* ${cliente.nome_completo}\n*TELEFONE:* ${cliente.telefone}\n\n`;
      msg += `*ENTREGA:*\n${tipoEntrega === "ENTREGA" ? enderecoFull : "RETIRADA BALCÃO"}\n\n`;
      msg += `*ITENS DO PEDIDO:*\n${itemsText}\n\n`;
      if (finalDiscount > 0) msg += `*DESCONTO:* -R$ ${finalDiscount.toFixed(2)}${validatedCupom ? ` (${validatedCupom.codigo})` : serverResult.appliedPromo ? ` (${serverResult.appliedPromo.label})` : ""}\n`;
      if (tipoEntrega === "ENTREGA" && freteResult) msg += `*FRETE:* R$ ${finalDeliveryFee.toFixed(2)} (${freteResult.distanciaKm.toFixed(1)} km)\n`;
      msg += `*VALOR TOTAL:* R$ ${finalTotal.toFixed(2)}\n\n`;
      const formatarPagamento = (tipo: string) => ({ mercado_pago: "Mercado Pago (PIX / Cartão)", pix_manual: "PIX Manual", cartao_whatsapp: "Cartão via WhatsApp" }[tipo] || tipo);
      msg += `*PAGAMENTO:* ${formatarPagamento(formaPagamento)}\n`;
      if (formaPagamento === "pix_manual" && pixConfig) msg += `Chave PIX: ${pixConfig.chave_pix}\nNome do recebedor: ${pixConfig.nome_recebedor}\n`;
      msg += `\n*HORÁRIO:* ${dateStr}`;

      const whatsapp = config?.whatsapp || "5521976003669";
      const url = getWhatsAppUrl(whatsapp, msg);
      localStorage.setItem("pedido_codigo", numeroPedido);
      trackEvent("order_completed", { order_id: pedidoId, total: finalTotal, payment: formaPagamento });
      clearCart();
      toast({ title: `Pedido #${numeroPedido} enviado!` });
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) setWhatsappFallbackUrl(url); else onClose();
    } catch (err: any) {
      toast({ title: "Erro ao finalizar pedido", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          <h2 className="font-display text-2xl tracking-wider mb-4">Finalizar Pedido</h2>

          {!user || !cliente ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">Você precisa estar logado para finalizar o pedido.</p>
              <Button onClick={() => setShowAuth(true)}>Entrar / Cadastrar</Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Customer info */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p><span className="font-semibold">Cliente:</span> {cliente.nome_completo}</p>
                <p><span className="font-semibold">Telefone:</span> {cliente.telefone}</p>
              </div>

              {/* Surprise coupon banner */}
              {surpriseCoupon && !cupomAplicado && (
                <div className="rounded-lg bg-accent/20 border border-accent p-3 text-sm flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">🎉 Cupom surpresa liberado!</p>
                    <p>Use <span className="font-mono font-bold">{surpriseCoupon.codigo}</span> e ganhe R$ {surpriseCoupon.valor.toFixed(2)} de desconto.</p>
                  </div>
                </div>
              )}

              {/* Delivery type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de entrega *</Label>
                <RadioGroup value={tipoEntrega} onValueChange={setTipoEntrega}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RETIRADA BALCÃO" id="retirada" />
                    <Label htmlFor="retirada">Retirada no balcão</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ENTREGA" id="entrega" />
                    <Label htmlFor="entrega">Entrega</Label>
                  </div>
                </RadioGroup>
                {tipoEntrega === "ENTREGA" && (
                  <div className="space-y-2 mt-2 pl-6">
                    <Input placeholder="Rua *" value={enderecoEntrega.rua} onChange={(e) => setEnderecoEntrega((p) => ({ ...p, rua: e.target.value }))} required />
                    <Input placeholder="Número *" value={enderecoEntrega.numero} onChange={(e) => setEnderecoEntrega((p) => ({ ...p, numero: e.target.value }))} required />
                    <Input placeholder="Apto, bloco, casa dos fundos, referência..." value={enderecoEntrega.complemento} onChange={(e) => setEnderecoEntrega((p) => ({ ...p, complemento: e.target.value }))} />
                    <Input placeholder="Bairro *" value={enderecoEntrega.bairro} onChange={(e) => setEnderecoEntrega((p) => ({ ...p, bairro: e.target.value }))} required />
                    {freteEnabled && (
                      <div className="space-y-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={calcularFrete}
                          disabled={freteLoading || !enderecoEntrega.rua || !enderecoEntrega.numero || !enderecoEntrega.bairro} className="w-full">
                          {freteLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando frete...</> : "Calcular Frete"}
                        </Button>
                        {freteResult && (
                          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                            <p><span className="font-semibold">Distância:</span> {freteResult.distanciaKm.toFixed(1)} km</p>
                            <p><span className="font-semibold">Frete:</span> {promoResult.isFreteGratis ? <span className="text-green-600 font-bold">Grátis!</span> : `R$ ${freteResult.valorFrete.toFixed(2)}`}</p>
                          </div>
                        )}
                        {freteError && <p className="text-xs text-destructive">{freteError}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Coupon section */}
              <div className="space-y-2">
                {!showCupomField && !cupomAplicado ? (
                  <button onClick={() => setShowCupomField(true)} className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Ticket className="h-4 w-4" /> Tem cupom de desconto?
                  </button>
                ) : cupomAplicado ? (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">✅ {cupomAplicado.codigo}</p>
                      <p className="text-xs text-muted-foreground">{cupomAplicado.nome_promocao}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removerCupom} className="text-destructive">Remover</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="Código do cupom" value={cupomInput} onChange={(e) => setCupomInput(e.target.value.toUpperCase())} className="flex-1" />
                    <Button size="sm" onClick={aplicarCupom} disabled={cupomLoading || !cupomInput.trim()}>
                      {cupomLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Applied promotion label */}
              {promoResult.appliedPromo && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm">
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    ✅ Promoção aplicada: {promoResult.appliedPromo.label}
                  </p>
                </div>
              )}

              {/* Rejected promos info */}
              {promoResult.rejectedPromos.length > 0 && (
                <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Outra(s) promoção(ões) disponível(is), mas não acumulável(is): {promoResult.rejectedPromos.map(p => p.label).join(", ")}.</p>
                </div>
              )}

              {/* Payment method */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Forma de pagamento *</Label>
                <RadioGroup value={formaPagamento} onValueChange={setFormaPagamento}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mercado_pago" id="mercadopago" />
                    <Label htmlFor="mercadopago">💳 Mercado Pago (PIX ou Cartão)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix_manual" id="pix" disabled={!pixConfig?.chave_pix} />
                    <Label htmlFor="pix" className={!pixConfig?.chave_pix ? "opacity-50" : ""}>PIX Manual {!pixConfig?.chave_pix && "(indisponível)"}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cartao_whatsapp" id="cartao" />
                    <Label htmlFor="cartao">Cartão (via WhatsApp)</Label>
                  </div>
                </RadioGroup>

                {formaPagamento === "mercado_pago" && (
                  <div className="mt-3 rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">Você será redirecionado para o Mercado Pago para realizar o pagamento com segurança via PIX ou cartão de crédito.</p>
                  </div>
                )}
                {formaPagamento === "pix_manual" && pixConfig && (
                  <div className="mt-3 rounded-lg border border-border p-4 space-y-3">
                    {pixConfig.qr_code_url && <div className="flex justify-center"><img src={pixConfig.qr_code_url} alt="QR Code PIX" className="h-40 w-40 rounded-lg object-contain" /></div>}
                    <div className="text-sm space-y-1">
                      <p><span className="font-semibold">Nome:</span> {pixConfig.nome_recebedor}</p>
                      <p><span className="font-semibold">Chave PIX:</span> {pixConfig.chave_pix}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">EFETUE O PAGAMENTO E DEPOIS CLIQUE EM FINALIZAR PARA ENVIAR O COMPROVANTE VIA WHATSAPP.</p>
                  </div>
                )}
                {formaPagamento === "cartao_whatsapp" && (
                  <div className="mt-3 rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">CLIQUE EM FINALIZAR PARA RECEBER O LINK DE PAGAMENTO POR CARTÃO VIA WHATSAPP.</p>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1"><ShoppingBag className="h-4 w-4" /> Quem comprou isso também levou:</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recommendations.map((r) => (
                      <div key={r.id} className="min-w-[120px] rounded-lg border border-border bg-card p-2 text-center text-xs shrink-0">
                        {r.image_url && <img src={r.image_url} alt={r.name} className="h-16 w-full object-cover rounded mb-1" />}
                        <p className="font-semibold truncate">{r.name}</p>
                        <p className="text-primary font-bold">R$ {r.price?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">R$ {totalPrice.toFixed(2)}</span>
                </div>
                {promoResult.finalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{promoResult.appliedPromo?.label || "Desconto"}</span>
                    <span>-R$ {promoResult.finalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {promoResult.isFreteGratis && tipoEntrega === "ENTREGA" && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Frete grátis</span>
                    <span>-R$ {rawDeliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {tipoEntrega === "ENTREGA" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entrega {freteEnabled && freteResult ? `(${freteResult.distanciaKm.toFixed(1)} km)` : ""}</span>
                    <span className="font-semibold">{deliveryFee === 0 ? <span className="text-green-600">Grátis</span> : `R$ ${deliveryFee.toFixed(2)}`}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">R$ {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleFinalize}
                disabled={submitting || (tipoEntrega === "ENTREGA" && freteEnabled && !freteResult)}
                className="w-full bg-success text-success-foreground hover:opacity-90 py-3">
                {submitting ? "Finalizando..." : formaPagamento === "mercado_pago" ? "Pagar com Mercado Pago" : "Finalizar Pedido"}
              </Button>
            </div>
          )}
        </div>
      </div>
      {showAuth && <CustomerAuthModal onClose={() => setShowAuth(false)} />}
      {whatsappFallbackUrl && <WhatsAppFallbackModal url={whatsappFallbackUrl} onClose={() => { setWhatsappFallbackUrl(null); onClose(); }} />}
    </>
  );
};

export default CheckoutModal;
