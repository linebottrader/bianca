ALTER TABLE store_config ADD COLUMN IF NOT EXISTS design_product_img_width text DEFAULT '90px';
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS design_product_img_height text DEFAULT '90px';
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS design_product_img_ratio_lock text DEFAULT 'true';
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS design_product_img_shape text DEFAULT 'quadrado';
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS design_product_img_hover_zoom text DEFAULT 'false';