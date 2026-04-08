ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS disponivel boolean NOT NULL DEFAULT true;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;