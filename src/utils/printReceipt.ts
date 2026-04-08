import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PedidoData = {
  numero_pedido: string;
  created_at: string;
  cliente?: { nome_completo: string; telefone: string } | null;
  tipo_entrega: string;
  endereco_entrega: string | null;
  itens: any;
  valor_frete: number | null;
  valor_total: number;
  forma_pagamento: string;
  status_pagamento: string;
};

type StoreInfo = {
  name: string;
  whatsapp?: string;
  address?: string;
};

type PrintFontOptions = {
  fontSize?: string;
  bold?: boolean;
  obsFontSize?: string;
  obsColor?: string;
};

function getStyles(paperWidth: string, fontOptions?: PrintFontOptions) {
  const maxWidth = paperWidth === "58mm" ? "58mm" : "80mm";
  const baseFontSize = fontOptions?.fontSize || (paperWidth === "58mm" ? "11px" : "12px");
  const baseSizeNum = parseInt(baseFontSize) || 12;
  const fontWeight = fontOptions?.bold ? "bold" : "normal";
  const totalFontSize = Math.max(baseSizeNum + 2, 14);
  const obsFontSize = fontOptions?.obsFontSize || `${Math.max(baseSizeNum - 1, 10)}px`;
  const obsColor = fontOptions?.obsColor || "#000";
  const headerFontSize = Math.max(baseSizeNum + 4, 16);

  return `
    @page { margin: 0; size: ${maxWidth} auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: ${baseFontSize};
      font-weight: ${fontWeight};
      width: ${maxWidth};
      max-width: ${maxWidth};
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #fff;
      padding: 4px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separator { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; }
    .item-name { flex: 1; margin-right: 4px; }
    .item-price { white-space: nowrap; }
    .total-row { font-size: ${totalFontSize}px; font-weight: bold; }
    .obs { font-style: italic; font-size: ${obsFontSize}; padding-left: 8px; color: ${obsColor}; }
    .section-title { font-weight: bold; margin-top: 4px; font-size: ${baseSizeNum + 1}px; }
    .header-title { font-size: ${headerFontSize}px; font-weight: bold; }
    p { margin: 1px 0; }
  `;
}

function buildReceiptHTML(pedido: PedidoData, store: StoreInfo, paperWidth: string, fontOptions?: PrintFontOptions): string {
  const date = new Date(pedido.created_at);
  const dataStr = format(date, "dd/MM/yyyy", { locale: ptBR });
  const horaStr = format(date, "HH:mm", { locale: ptBR });

  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

  const subtotal = itens.reduce((sum: number, item: any) => sum + (item.valor || 0), 0);

  let itensHTML = itens
    .map((item: any) => {
      let html = `
        <div class="row">
          <span class="item-name">${item.quantidade || 1}x ${item.nome || "Item"}</span>
          <span class="item-price">R$ ${(item.valor || 0).toFixed(2)}</span>
        </div>`;
      if (item.opcoes?.length) {
        html += `<p class="obs">  → ${item.opcoes.join(", ")}</p>`;
      }
      if (item.observacao) {
        html += `<p class="obs">  Obs: ${item.observacao}</p>`;
      }
      return html;
    })
    .join("");

  const freteValue = pedido.valor_frete || 0;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${getStyles(paperWidth, fontOptions)}</style></head><body>
  <div class="center header-title">${store.name || "Estabelecimento"}</div>
  ${store.whatsapp ? `<p class="center">${store.whatsapp}</p>` : ""}
  ${store.address ? `<p class="center" style="font-size:10px;">${store.address}</p>` : ""}

  <div class="separator"></div>

  <p class="center header-title">PEDIDO Nº ${pedido.numero_pedido}</p>
  <p class="center">Data: ${dataStr} &nbsp; Hora: ${horaStr}</p>

  <div class="separator"></div>

  <p class="section-title">CLIENTE</p>
  <p>${pedido.cliente?.nome_completo || "Não informado"}</p>
  <p>Tel: ${pedido.cliente?.telefone || "---"}</p>

  <div class="separator"></div>

  <p class="section-title">TIPO: ${pedido.tipo_entrega === "delivery" ? "🛵 DELIVERY" : "🏪 RETIRADA"}</p>
  ${pedido.endereco_entrega ? `<p>${pedido.endereco_entrega}</p>` : ""}

  <div class="separator"></div>

  <p class="section-title">ITENS DO PEDIDO</p>
  ${itensHTML}

  <div class="separator"></div>

  <div class="row"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2)}</span></div>
  ${freteValue > 0 ? `<div class="row"><span>Taxa de entrega</span><span>R$ ${freteValue.toFixed(2)}</span></div>` : ""}
  <div class="separator"></div>
  <div class="row total-row"><span>TOTAL</span><span>R$ ${pedido.valor_total.toFixed(2)}</span></div>

  <div class="separator"></div>

  <p class="section-title">PAGAMENTO</p>
  <p>${pedido.forma_pagamento === "mercado_pago" ? "Mercado Pago" : pedido.forma_pagamento === "pix_manual" ? "PIX Manual" : pedido.forma_pagamento === "cartao_whatsapp" ? "Cartão via WhatsApp" : pedido.forma_pagamento}</p>
  <p>Status: ${pedido.status_pagamento}</p>

  <div class="separator"></div>

  <p class="center" style="margin-top:8px;">Obrigado pela preferência! 🎉</p>
  <p class="center" style="font-size:10px; margin-top:4px;">---</p>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    };
  </script>
</body></html>`;
}

export function printPedido(pedido: PedidoData, store: StoreInfo, paperWidth = "80mm", fontOptions?: PrintFontOptions) {
  const html = buildReceiptHTML(pedido, store, paperWidth, fontOptions);
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export function printTestPage(paperWidth = "80mm", fontOptions?: PrintFontOptions) {
  const now = new Date();
  const testHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${getStyles(paperWidth, fontOptions)}</style></head><body>
  <p class="center bold" style="font-size:16px;">TESTE DE IMPRESSÃO</p>
  <div class="separator"></div>
  <p class="center">Sistema de Pedidos</p>
  <p class="center">Impressora configurada com sucesso ✅</p>
  <div class="separator"></div>
  <p class="center">${format(now, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
  <p class="center" style="margin-top:8px;">---</p>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    };
  </script>
</body></html>`;

  const w = window.open("", "_blank", "width=400,height=400");
  if (w) {
    w.document.write(testHTML);
    w.document.close();
  }
}
