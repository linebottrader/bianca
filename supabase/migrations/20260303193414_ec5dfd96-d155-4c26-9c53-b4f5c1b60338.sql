
CREATE TABLE public.configuracao_frete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endereco_loja text NOT NULL DEFAULT '',
  api_provider text NOT NULL DEFAULT 'mapbox',
  api_key text NOT NULL DEFAULT '',
  valor_base numeric NOT NULL DEFAULT 5.00,
  valor_por_km numeric NOT NULL DEFAULT 1.50,
  ativo boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.configuracao_frete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage frete config" ON public.configuracao_frete
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read frete config" ON public.configuracao_frete
  FOR SELECT TO anon, authenticated
  USING (true);

-- Add freight columns to pedidos
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS distancia_km numeric,
  ADD COLUMN IF NOT EXISTS valor_frete numeric,
  ADD COLUMN IF NOT EXISTS api_provider_utilizado text;
