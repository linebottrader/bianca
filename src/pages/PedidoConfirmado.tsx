import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Home, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PedidoConfirmado = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const numeroPedido = searchParams.get("pedido") || "";
  const [pedido, setPedido] = useState<any>(null);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!numeroPedido) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [pedidoRes, storeRes] = await Promise.all([
        supabase.functions.invoke("mp-check-status", {
          body: { numero_pedido: numeroPedido },
        }),
        supabase.from("store_config").select("name, whatsapp, delivery_estimated_time").limit(1).single(),
      ]);

      if (pedidoRes.data) setPedido(pedidoRes.data);
      if (storeRes.data) setStoreConfig(storeRes.data);
      setLoading(false);
    };

    fetchData();
  }, [numeroPedido]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const buildWhatsappUrl = () => {
    if (!storeConfig?.whatsapp || !pedido) return null;
    const itens = (pedido.itens as any[]) || [];
    const itemsText = itens
      .map((i: any) =>
        `${i.quantidade}x ${i.nome}${i.opcoes?.length ? ` (${i.opcoes.join(", ")})` : ""} - R$ ${Number(i.valor).toFixed(2)}`
      )
      .join("\n");

    let msg = `✅ *PEDIDO CONFIRMADO: #${pedido.numero_pedido}*\n\n`;
    msg += `*ENTREGA:* ${pedido.tipo_entrega === "ENTREGA" ? pedido.endereco_entrega : "RETIRADA BALCÃO"}\n\n`;
    msg += `*ITENS:*\n${itemsText}\n\n`;
    if (pedido.valor_frete) msg += `*FRETE:* R$ ${Number(pedido.valor_frete).toFixed(2)}\n`;
    msg += `*TOTAL:* R$ ${Number(pedido.valor_total).toFixed(2)}\n`;
    msg += `*PAGAMENTO:* Mercado Pago (Aprovado)`;

    return `https://api.whatsapp.com/send?phone=${storeConfig.whatsapp}&text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const whatsappUrl = buildWhatsappUrl();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-card rounded-xl p-8 shadow-lg">
        <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
        <h1 className="text-2xl font-bold text-foreground">Pedido Confirmado!</h1>
        <p className="text-lg font-semibold text-primary">Pedido #{numeroPedido}</p>
        <p className="text-muted-foreground">
          Seu pagamento foi aprovado e o pedido já está sendo preparado.
        </p>

        {pedido && (
          <div className="text-left space-y-3 bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground text-sm">Resumo do Pedido</h3>
            <div className="space-y-1">
              {(pedido.itens as any[] || []).map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantidade}x {item.nome}
                  </span>
                  <span className="font-medium">{formatCurrency(item.valor)}</span>
                </div>
              ))}
            </div>
            {pedido.valor_frete > 0 && (
              <div className="flex justify-between text-sm border-t pt-1">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-medium">{formatCurrency(pedido.valor_frete)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(pedido.valor_total)}</span>
            </div>
          </div>
        )}

        {storeConfig?.delivery_estimated_time && (
          <p className="text-sm text-muted-foreground">
            ⏱️ Tempo estimado: <strong>{storeConfig.delivery_estimated_time}</strong>
          </p>
        )}

        <div className="space-y-3 pt-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 bg-green-600 hover:bg-green-700"
            >
              <MessageSquare className="h-4 w-4" />
              Enviar Pedido via WhatsApp
            </a>
          )}
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PedidoConfirmado;
