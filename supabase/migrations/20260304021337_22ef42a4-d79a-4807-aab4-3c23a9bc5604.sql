
ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_address boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_instagram boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_facebook boolean DEFAULT true;
