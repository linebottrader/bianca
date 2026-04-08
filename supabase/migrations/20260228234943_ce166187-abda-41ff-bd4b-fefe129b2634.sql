
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Store config table (single row)
CREATE TABLE public.store_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Loja',
  slogan TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  whatsapp_message TEXT DEFAULT 'Olá',
  rating NUMERIC(2,1) DEFAULT 5.0,
  minimum_order NUMERIC(10,2) DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  status_message TEXT DEFAULT 'Fechado',
  schedule_weekdays TEXT DEFAULT '18:00 - 23:00',
  schedule_weekends TEXT DEFAULT '17:00 - 00:00',
  delivery_fee NUMERIC(10,2) DEFAULT 5.00,
  delivery_free_above NUMERIC(10,2) DEFAULT 50.00,
  delivery_estimated_time TEXT DEFAULT '30-50 min',
  hero_image_url TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read store config" ON public.store_config
  FOR SELECT USING (true);
CREATE POLICY "Admins can update store config" ON public.store_config
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert store config" ON public.store_config
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10,2),
  image_url TEXT DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  badges TEXT[] DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active menu items" ON public.menu_items
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu items" ON public.menu_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Menu options (groups like "Escolha o sabor")
CREATE TABLE public.menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  max_select INT DEFAULT 1,
  sort_order INT DEFAULT 0
);
ALTER TABLE public.menu_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read menu options" ON public.menu_options
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu options" ON public.menu_options
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Option items (individual choices)
CREATE TABLE public.option_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_option_id UUID REFERENCES public.menu_options(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  sort_order INT DEFAULT 0
);
ALTER TABLE public.option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read option items" ON public.option_items
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage option items" ON public.option_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_store_config_updated_at
  BEFORE UPDATE ON public.store_config FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('store-images', 'store-images', true);

CREATE POLICY "Anyone can view store images" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-images');

CREATE POLICY "Admins can upload store images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete store images" ON storage.objects
  FOR DELETE USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));
