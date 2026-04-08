
-- Create option_groups table
CREATE TABLE public.option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  descricao text DEFAULT '',
  obrigatorio boolean NOT NULL DEFAULT false,
  min_selecao integer NOT NULL DEFAULT 0,
  max_selecao integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage option_groups" ON public.option_groups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read option_groups" ON public.option_groups FOR SELECT USING (true);

-- Create product_option_groups table
CREATE TABLE public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product_option_groups" ON public.product_option_groups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read product_option_groups" ON public.product_option_groups FOR SELECT USING (true);

-- Create password_reset_tokens table
CREATE TABLE public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (edge functions use service role key)
