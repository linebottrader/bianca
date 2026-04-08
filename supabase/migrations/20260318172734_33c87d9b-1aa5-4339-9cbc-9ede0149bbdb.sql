
-- Step 1: Create option_groups table
CREATE TABLE public.option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  obrigatorio boolean NOT NULL DEFAULT false,
  min_selecao integer NOT NULL DEFAULT 0,
  max_selecao integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Create product_option_groups junction table
CREATE TABLE public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  UNIQUE(product_id, group_id)
);

-- Step 3: Add new columns to option_items
ALTER TABLE public.option_items
  ADD COLUMN group_id uuid REFERENCES public.option_groups(id) ON DELETE CASCADE,
  ADD COLUMN descricao text NOT NULL DEFAULT '',
  ADD COLUMN imagem_url text NOT NULL DEFAULT '',
  ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- Step 4: Migrate existing data from menu_options -> option_groups
INSERT INTO public.option_groups (id, nome, obrigatorio, min_selecao, max_selecao)
SELECT
  id,
  title,
  COALESCE(required, false),
  CASE WHEN COALESCE(required, false) THEN 1 ELSE 0 END,
  COALESCE(max_select, 1)
FROM public.menu_options;

-- Step 5: Create product_option_groups from menu_options (menu_item_id -> product_id, id -> group_id)
INSERT INTO public.product_option_groups (product_id, group_id, ordem)
SELECT menu_item_id, id, COALESCE(sort_order, 0)
FROM public.menu_options;

-- Step 6: Set group_id on option_items from menu_option_id
UPDATE public.option_items SET group_id = menu_option_id;

-- Step 7: Make group_id NOT NULL now that data is migrated
ALTER TABLE public.option_items ALTER COLUMN group_id SET NOT NULL;

-- Step 8: RLS on option_groups
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read option_groups"
  ON public.option_groups FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage option_groups"
  ON public.option_groups FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 9: RLS on product_option_groups
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product_option_groups"
  ON public.product_option_groups FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage product_option_groups"
  ON public.product_option_groups FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
