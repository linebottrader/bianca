
-- Add design customization columns to store_config
ALTER TABLE public.store_config
  -- CORES GERAIS
  ADD COLUMN IF NOT EXISTS design_bg_body text DEFAULT '#f5f0eb',
  ADD COLUMN IF NOT EXISTS design_bg_container text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_color_primary text DEFAULT '#f07c00',
  ADD COLUMN IF NOT EXISTS design_color_secondary text DEFAULT '#2e2e2e',
  ADD COLUMN IF NOT EXISTS design_color_text_main text DEFAULT '#2a2118',
  ADD COLUMN IF NOT EXISTS design_color_text_light text DEFAULT '#8a7e73',
  -- HEADER
  ADD COLUMN IF NOT EXISTS design_header_bg text DEFAULT '#2e2e2e',
  ADD COLUMN IF NOT EXISTS design_header_text text DEFAULT '#fafafa',
  ADD COLUMN IF NOT EXISTS design_header_badge_bg text DEFAULT '#f07c00',
  ADD COLUMN IF NOT EXISTS design_header_badge_text text DEFAULT '#ffffff',
  -- BANNER
  ADD COLUMN IF NOT EXISTS design_banner_overlay text DEFAULT 'rgba(46,46,46,0.5)',
  ADD COLUMN IF NOT EXISTS design_banner_button_bg text DEFAULT '#f07c00',
  ADD COLUMN IF NOT EXISTS design_banner_button_text text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_banner_title_color text DEFAULT '#ffffff',
  -- CATEGORIAS
  ADD COLUMN IF NOT EXISTS design_category_bg text DEFAULT '#ebe7e2',
  ADD COLUMN IF NOT EXISTS design_category_text text DEFAULT '#8a7e73',
  ADD COLUMN IF NOT EXISTS design_category_active_bg text DEFAULT '#2e2e2e',
  ADD COLUMN IF NOT EXISTS design_category_active_text text DEFAULT '#fafafa',
  ADD COLUMN IF NOT EXISTS design_category_border_radius text DEFAULT '0.5rem',
  -- PRODUTOS
  ADD COLUMN IF NOT EXISTS design_card_bg text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_card_title_color text DEFAULT '#2a2118',
  ADD COLUMN IF NOT EXISTS design_card_description_color text DEFAULT '#8a7e73',
  ADD COLUMN IF NOT EXISTS design_price_color text DEFAULT '#f07c00',
  ADD COLUMN IF NOT EXISTS design_badge_bg text DEFAULT '#e84c3d',
  ADD COLUMN IF NOT EXISTS design_badge_text text DEFAULT '#ffffff',
  -- BOTÕES
  ADD COLUMN IF NOT EXISTS design_button_primary_bg text DEFAULT '#f07c00',
  ADD COLUMN IF NOT EXISTS design_button_primary_text text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_button_secondary_bg text DEFAULT '#2e2e2e',
  ADD COLUMN IF NOT EXISTS design_button_secondary_text text DEFAULT '#fafafa',
  ADD COLUMN IF NOT EXISTS design_button_radius text DEFAULT '0.75rem',
  -- CARRINHO
  ADD COLUMN IF NOT EXISTS design_cart_bg text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS design_cart_title_color text DEFAULT '#2a2118',
  ADD COLUMN IF NOT EXISTS design_cart_border_color text DEFAULT '#e5e0db',
  -- TIPOGRAFIA
  ADD COLUMN IF NOT EXISTS design_font_family text DEFAULT 'Open Sans',
  ADD COLUMN IF NOT EXISTS design_title_size text DEFAULT '1.25rem',
  ADD COLUMN IF NOT EXISTS design_text_size text DEFAULT '0.875rem',
  -- BORDAS & SOMBRAS
  ADD COLUMN IF NOT EXISTS design_card_radius text DEFAULT '0.75rem',
  ADD COLUMN IF NOT EXISTS design_card_shadow text DEFAULT '0 1px 3px rgba(0,0,0,0.08)',
  ADD COLUMN IF NOT EXISTS design_container_width text DEFAULT '1280px',
  -- IMAGENS EXTRAS
  ADD COLUMN IF NOT EXISTS design_bg_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS design_alt_logo_url text DEFAULT '';
