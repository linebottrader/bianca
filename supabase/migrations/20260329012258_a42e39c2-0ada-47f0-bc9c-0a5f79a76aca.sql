
-- Premium sections table
CREATE TABLE public.menu_sections_premium (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'carousel',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  auto_scroll boolean NOT NULL DEFAULT false,
  speed integer NOT NULL DEFAULT 3000,
  product_image_size text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.menu_sections_premium ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage premium sections" ON public.menu_sections_premium FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read premium sections" ON public.menu_sections_premium FOR SELECT USING (true);

-- Junction table
CREATE TABLE public.menu_section_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.menu_sections_premium(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_id, product_id)
);

ALTER TABLE public.menu_section_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage section products" ON public.menu_section_products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read section products" ON public.menu_section_products FOR SELECT USING (true);
