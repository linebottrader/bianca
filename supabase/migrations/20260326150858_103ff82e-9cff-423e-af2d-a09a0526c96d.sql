ALTER TABLE store_config 
ADD COLUMN IF NOT EXISTS design_card_title_size text DEFAULT '1rem',
ADD COLUMN IF NOT EXISTS design_card_description_size text DEFAULT '0.875rem',
ADD COLUMN IF NOT EXISTS design_price_size text DEFAULT '1rem',
ADD COLUMN IF NOT EXISTS design_category_text_size text DEFAULT '0.875rem';