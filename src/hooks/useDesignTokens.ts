import { useStoreConfig } from "@/hooks/useStoreData";

export type DesignTokens = {
  // Cores Gerais
  design_bg_body: string;
  design_bg_container: string;
  design_color_primary: string;
  design_color_secondary: string;
  design_color_text_main: string;
  design_color_text_light: string;
  // Header
  design_header_bg: string;
  design_header_text: string;
  design_header_badge_bg: string;
  design_header_badge_text: string;
  // Banner
  design_banner_overlay: string;
  design_banner_button_bg: string;
  design_banner_button_text: string;
  design_banner_title_color: string;
  // Categorias
  design_category_bg: string;
  design_category_text: string;
  design_category_active_bg: string;
  design_category_active_text: string;
  design_category_border_radius: string;
  design_category_text_size: string;
  // Produtos
  design_card_bg: string;
  design_card_title_color: string;
  design_card_title_size: string;
  design_card_description_color: string;
  design_card_description_size: string;
  design_price_color: string;
  design_price_size: string;
  design_badge_bg: string;
  design_badge_text: string;
  // Botões
  design_button_primary_bg: string;
  design_button_primary_text: string;
  design_button_secondary_bg: string;
  design_button_secondary_text: string;
  design_button_radius: string;
  // Carrinho
  design_cart_bg: string;
  design_cart_title_color: string;
  design_cart_border_color: string;
  // Tipografia
  design_font_family: string;
  design_title_size: string;
  design_text_size: string;
  // Bordas & Sombras
  design_card_radius: string;
  design_card_shadow: string;
  design_container_width: string;
  // Imagens
  design_bg_image_url: string;
  design_alt_logo_url: string;
  // Product image settings
  design_product_img_width: string;
  design_product_img_height: string;
  design_product_img_ratio_lock: string;
  design_product_img_shape: string;
  design_product_img_hover_zoom: string;
};

export const DEFAULT_DESIGN: DesignTokens = {
  design_bg_body: "#f5f0eb",
  design_bg_container: "#ffffff",
  design_color_primary: "#f07c00",
  design_color_secondary: "#2e2e2e",
  design_color_text_main: "#2a2118",
  design_color_text_light: "#8a7e73",
  design_header_bg: "#2e2e2e",
  design_header_text: "#fafafa",
  design_header_badge_bg: "#f07c00",
  design_header_badge_text: "#ffffff",
  design_banner_overlay: "rgba(46,46,46,0.5)",
  design_banner_button_bg: "#f07c00",
  design_banner_button_text: "#ffffff",
  design_banner_title_color: "#ffffff",
  design_category_bg: "#ebe7e2",
  design_category_text: "#8a7e73",
  design_category_active_bg: "#2e2e2e",
  design_category_active_text: "#fafafa",
  design_category_border_radius: "0.5rem",
  design_category_text_size: "0.875rem",
  design_card_bg: "#ffffff",
  design_card_title_color: "#2a2118",
  design_card_title_size: "1rem",
  design_card_description_color: "#8a7e73",
  design_card_description_size: "0.875rem",
  design_price_color: "#f07c00",
  design_price_size: "1rem",
  design_badge_bg: "#e84c3d",
  design_badge_text: "#ffffff",
  design_button_primary_bg: "#f07c00",
  design_button_primary_text: "#ffffff",
  design_button_secondary_bg: "#2e2e2e",
  design_button_secondary_text: "#fafafa",
  design_button_radius: "0.75rem",
  design_cart_bg: "#ffffff",
  design_cart_title_color: "#2a2118",
  design_cart_border_color: "#e5e0db",
  design_font_family: "Open Sans",
  design_title_size: "1.25rem",
  design_text_size: "0.875rem",
  design_card_radius: "0.75rem",
  design_card_shadow: "0 1px 3px rgba(0,0,0,0.08)",
  design_container_width: "1280px",
  design_bg_image_url: "",
  design_alt_logo_url: "",
  design_product_img_width: "90px",
  design_product_img_height: "90px",
  design_product_img_ratio_lock: "true",
  design_product_img_shape: "quadrado",
  design_product_img_hover_zoom: "false",
};

export const DESIGN_KEYS = Object.keys(DEFAULT_DESIGN) as (keyof DesignTokens)[];

// CSS variable mapping
const TOKEN_TO_CSS: Record<string, string> = {
  design_bg_body: "--d-bg-body",
  design_bg_container: "--d-bg-container",
  design_color_primary: "--d-color-primary",
  design_color_secondary: "--d-color-secondary",
  design_color_text_main: "--d-color-text-main",
  design_color_text_light: "--d-color-text-light",
  design_header_bg: "--d-header-bg",
  design_header_text: "--d-header-text",
  design_header_badge_bg: "--d-header-badge-bg",
  design_header_badge_text: "--d-header-badge-text",
  design_banner_overlay: "--d-banner-overlay",
  design_banner_button_bg: "--d-banner-button-bg",
  design_banner_button_text: "--d-banner-button-text",
  design_banner_title_color: "--d-banner-title-color",
  design_category_bg: "--d-category-bg",
  design_category_text: "--d-category-text",
  design_category_active_bg: "--d-category-active-bg",
  design_category_active_text: "--d-category-active-text",
  design_category_border_radius: "--d-category-radius",
  design_category_text_size: "--d-category-text-size",
  design_card_bg: "--d-card-bg",
  design_card_title_color: "--d-card-title-color",
  design_card_title_size: "--d-card-title-size",
  design_card_description_color: "--d-card-desc-color",
  design_card_description_size: "--d-card-desc-size",
  design_price_color: "--d-price-color",
  design_price_size: "--d-price-size",
  design_badge_bg: "--d-badge-bg",
  design_badge_text: "--d-badge-text",
  design_button_primary_bg: "--d-btn-primary-bg",
  design_button_primary_text: "--d-btn-primary-text",
  design_button_secondary_bg: "--d-btn-secondary-bg",
  design_button_secondary_text: "--d-btn-secondary-text",
  design_button_radius: "--d-btn-radius",
  design_cart_bg: "--d-cart-bg",
  design_cart_title_color: "--d-cart-title-color",
  design_cart_border_color: "--d-cart-border-color",
  design_font_family: "--d-font-family",
  design_title_size: "--d-title-size",
  design_text_size: "--d-text-size",
  design_card_radius: "--d-card-radius",
  design_card_shadow: "--d-card-shadow",
  design_container_width: "--d-container-width",
  design_product_img_width: "--d-product-img-width",
  design_product_img_height: "--d-product-img-height",
  design_product_img_hover_zoom: "--d-product-img-hover-zoom",
};

export function applyDesignTokens(config: Record<string, any>) {
  const root = document.documentElement;
  for (const key of DESIGN_KEYS) {
    const cssVar = TOKEN_TO_CSS[key];
    if (!cssVar) continue;
    const value = config[key] || DEFAULT_DESIGN[key];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }
  // Background image
  const bgImage = config.design_bg_image_url || "";
  if (bgImage) {
    root.style.setProperty("--d-bg-image", `url(${bgImage})`);
  } else {
    root.style.setProperty("--d-bg-image", "none");
  }
  // Product image border-radius based on shape
  const shape = config.design_product_img_shape || "quadrado";
  const radiusMap: Record<string, string> = { quadrado: "8px", retangular: "6px", circular: "50%" };
  root.style.setProperty("--d-product-img-radius", radiusMap[shape] || "8px");
}

export function useDesignTokens() {
  const { data: config } = useStoreConfig();
  
  const tokens: DesignTokens = { ...DEFAULT_DESIGN };
  if (config) {
    for (const key of DESIGN_KEYS) {
      const val = (config as any)[key];
      if (val) (tokens as any)[key] = val;
    }
  }
  
  return tokens;
}

// Presets
export type ThemePreset = {
  name: string;
  emoji: string;
  tokens: Partial<DesignTokens>;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Laranja (Atual)",
    emoji: "🟠",
    tokens: { ...DEFAULT_DESIGN },
  },
  {
    name: "Preto Premium",
    emoji: "⚫",
    tokens: {
      design_bg_body: "#1a1a1a",
      design_bg_container: "#242424",
      design_color_primary: "#d4af37",
      design_color_secondary: "#111111",
      design_color_text_main: "#f0f0f0",
      design_color_text_light: "#999999",
      design_header_bg: "#111111",
      design_header_text: "#f0f0f0",
      design_header_badge_bg: "#d4af37",
      design_header_badge_text: "#111111",
      design_banner_overlay: "rgba(0,0,0,0.6)",
      design_banner_button_bg: "#d4af37",
      design_banner_button_text: "#111111",
      design_banner_title_color: "#ffffff",
      design_category_bg: "#2a2a2a",
      design_category_text: "#999999",
      design_category_active_bg: "#d4af37",
      design_category_active_text: "#111111",
      design_card_bg: "#242424",
      design_card_title_color: "#f0f0f0",
      design_card_description_color: "#999999",
      design_price_color: "#d4af37",
      design_badge_bg: "#d4af37",
      design_badge_text: "#111111",
      design_button_primary_bg: "#d4af37",
      design_button_primary_text: "#111111",
      design_button_secondary_bg: "#333333",
      design_button_secondary_text: "#f0f0f0",
      design_cart_bg: "#242424",
      design_cart_title_color: "#f0f0f0",
      design_cart_border_color: "#333333",
    },
  },
  {
    name: "Minimal Branco",
    emoji: "⚪",
    tokens: {
      design_bg_body: "#ffffff",
      design_bg_container: "#fafafa",
      design_color_primary: "#222222",
      design_color_secondary: "#f5f5f5",
      design_color_text_main: "#111111",
      design_color_text_light: "#888888",
      design_header_bg: "#ffffff",
      design_header_text: "#111111",
      design_header_badge_bg: "#111111",
      design_header_badge_text: "#ffffff",
      design_banner_overlay: "rgba(255,255,255,0.3)",
      design_banner_button_bg: "#111111",
      design_banner_button_text: "#ffffff",
      design_banner_title_color: "#111111",
      design_category_bg: "#f0f0f0",
      design_category_text: "#666666",
      design_category_active_bg: "#111111",
      design_category_active_text: "#ffffff",
      design_card_bg: "#ffffff",
      design_card_title_color: "#111111",
      design_card_description_color: "#888888",
      design_price_color: "#111111",
      design_badge_bg: "#111111",
      design_badge_text: "#ffffff",
      design_button_primary_bg: "#111111",
      design_button_primary_text: "#ffffff",
      design_button_secondary_bg: "#f0f0f0",
      design_button_secondary_text: "#111111",
      design_cart_bg: "#ffffff",
      design_cart_title_color: "#111111",
      design_cart_border_color: "#e5e5e5",
    },
  },
  {
    name: "Verde Natural",
    emoji: "🟢",
    tokens: {
      design_bg_body: "#f0f4ee",
      design_bg_container: "#ffffff",
      design_color_primary: "#2d8a4e",
      design_color_secondary: "#1a3c28",
      design_color_text_main: "#1a3c28",
      design_color_text_light: "#6b8f7a",
      design_header_bg: "#1a3c28",
      design_header_text: "#f0f4ee",
      design_header_badge_bg: "#2d8a4e",
      design_header_badge_text: "#ffffff",
      design_banner_overlay: "rgba(26,60,40,0.5)",
      design_banner_button_bg: "#2d8a4e",
      design_banner_button_text: "#ffffff",
      design_banner_title_color: "#ffffff",
      design_category_bg: "#e0ead8",
      design_category_text: "#6b8f7a",
      design_category_active_bg: "#2d8a4e",
      design_category_active_text: "#ffffff",
      design_card_bg: "#ffffff",
      design_card_title_color: "#1a3c28",
      design_card_description_color: "#6b8f7a",
      design_price_color: "#2d8a4e",
      design_badge_bg: "#2d8a4e",
      design_badge_text: "#ffffff",
      design_button_primary_bg: "#2d8a4e",
      design_button_primary_text: "#ffffff",
      design_button_secondary_bg: "#1a3c28",
      design_button_secondary_text: "#f0f4ee",
      design_cart_bg: "#ffffff",
      design_cart_title_color: "#1a3c28",
      design_cart_border_color: "#d4dece",
    },
  },
  {
    name: "Vermelho iFood",
    emoji: "🔴",
    tokens: {
      design_bg_body: "#f5f5f5",
      design_bg_container: "#ffffff",
      design_color_primary: "#ea1d2c",
      design_color_secondary: "#3e3e3e",
      design_color_text_main: "#3e3e3e",
      design_color_text_light: "#a6a6a6",
      design_header_bg: "#ea1d2c",
      design_header_text: "#ffffff",
      design_header_badge_bg: "#ffffff",
      design_header_badge_text: "#ea1d2c",
      design_banner_overlay: "rgba(234,29,44,0.4)",
      design_banner_button_bg: "#ea1d2c",
      design_banner_button_text: "#ffffff",
      design_banner_title_color: "#ffffff",
      design_category_bg: "#f0f0f0",
      design_category_text: "#a6a6a6",
      design_category_active_bg: "#ea1d2c",
      design_category_active_text: "#ffffff",
      design_card_bg: "#ffffff",
      design_card_title_color: "#3e3e3e",
      design_card_description_color: "#a6a6a6",
      design_price_color: "#ea1d2c",
      design_badge_bg: "#ea1d2c",
      design_badge_text: "#ffffff",
      design_button_primary_bg: "#ea1d2c",
      design_button_primary_text: "#ffffff",
      design_button_secondary_bg: "#3e3e3e",
      design_button_secondary_text: "#ffffff",
      design_cart_bg: "#ffffff",
      design_cart_title_color: "#3e3e3e",
      design_cart_border_color: "#e5e5e5",
    },
  },
];
