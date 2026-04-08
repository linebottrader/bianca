// ============================================================
// 🔧 CONFIGURAÇÃO DA LOJA - EDITE AQUI PARA PERSONALIZAR
// ============================================================

export const storeConfig = {
  // Informações básicas
  name: "Toque de Amor",
  slogan: "Olá, seja bem vindo a Toque de Amor!!",
  whatsapp: "5521976003669",
  whatsappMessage: "Oi",
  rating: 5.0,
  minimumOrder: 9.0,

  // Status da loja
  isOpen: false,
  statusMessage: "Fechado temp.",

  // Horário de funcionamento (para exibição)
  schedule: {
    weekdays: "18:00 - 23:00",
    weekends: "17:00 - 00:00",
  },

  // Taxas de entrega
  delivery: {
    fee: 5.0,
    freeAbove: 50.0,
    estimatedTime: "30-50 min",
  },
};
