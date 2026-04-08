// ============================================================
// 🍔 CARDÁPIO - EDITE AQUI PARA ADICIONAR/REMOVER ITENS
// ============================================================

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  badges?: ("promo" | "new" | "best")[];
  options?: MenuOption[];
};

export type MenuOption = {
  id: string;
  title: string;
  required: boolean;
  maxSelect: number;
  items: OptionItem[];
};

export type OptionItem = {
  id: string;
  name: string;
  price: number;
};

export const categories = [
  { id: "combos", name: "NOSSOS COMBOS" },
  { id: "artesanal", name: "ARTESANAL" },
  { id: "tradicional", name: "TRADICIONAL" },
  { id: "porcoes", name: "PORÇÕES" },
  { id: "bebidas", name: "BEBIDAS" },
  { id: "acai", name: "AÇAÍ" },
];

export const menuItems: MenuItem[] = [];
