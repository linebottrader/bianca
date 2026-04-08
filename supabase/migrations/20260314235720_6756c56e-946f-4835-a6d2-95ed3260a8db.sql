ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS design_category_text_size text,
  ADD COLUMN IF NOT EXISTS design_card_title_size text,
  ADD COLUMN IF NOT EXISTS design_card_description_size text,
  ADD COLUMN IF NOT EXISTS design_price_size text;