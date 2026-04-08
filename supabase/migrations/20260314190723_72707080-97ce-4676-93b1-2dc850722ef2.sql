
-- Tempo de preparo e estação por produto
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tempo_preparo integer NOT NULL DEFAULT 10;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS estacao_preparo text NOT NULL DEFAULT 'Cozinha';

-- Configurações da cozinha
CREATE TABLE IF NOT EXISTS public.kds_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mostrar_aguardando_entregador boolean NOT NULL DEFAULT false,
  modo_estacao text NOT NULL DEFAULT 'unica',
  estacoes text[] NOT NULL DEFAULT '{Cozinha,Lanches,Bebidas,Sobremesas}',
  tempo_alerta_minutos integer NOT NULL DEFAULT 20,
  som_novo_pedido boolean NOT NULL DEFAULT true,
  voz_novo_pedido boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.kds_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage kds_config" ON public.kds_config FOR ALL TO public USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read kds_config" ON public.kds_config FOR SELECT TO public USING (true);

INSERT INTO public.kds_config (id) VALUES (gen_random_uuid());
