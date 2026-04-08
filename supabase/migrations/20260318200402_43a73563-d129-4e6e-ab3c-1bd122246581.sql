
-- Table: cupons
CREATE TABLE public.cupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_promocao text NOT NULL DEFAULT '',
  codigo text NOT NULL UNIQUE,
  tipo_desconto text NOT NULL DEFAULT 'percentual',
  valor_desconto numeric NOT NULL DEFAULT 0,
  valor_minimo_pedido numeric NOT NULL DEFAULT 0,
  limite_total_uso integer NOT NULL DEFAULT 0,
  limite_por_cliente integer NOT NULL DEFAULT 1,
  usos_atuais integer NOT NULL DEFAULT 0,
  data_inicio timestamptz,
  data_fim timestamptz,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cupons" ON public.cupons
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read cupons" ON public.cupons
  FOR SELECT TO public
  USING (true);

-- Table: cupons_usados
CREATE TABLE public.cupons_usados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id uuid NOT NULL REFERENCES public.cupons(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  pedido_id uuid,
  valor_desconto numeric NOT NULL DEFAULT 0,
  data_uso timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cupons_usados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cupons_usados" ON public.cupons_usados
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own cupons_usados" ON public.cupons_usados
  FOR INSERT TO public
  WITH CHECK (cliente_id IN (SELECT c.id FROM clientes c WHERE c.user_id = auth.uid()));

CREATE POLICY "Users can read own cupons_usados" ON public.cupons_usados
  FOR SELECT TO public
  USING (cliente_id IN (SELECT c.id FROM clientes c WHERE c.user_id = auth.uid()));

-- Table: promocoes_config (single-row config)
CREATE TABLE public.promocoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primeira_compra jsonb NOT NULL DEFAULT '{"ativo": false, "cupom_codigo": "", "desconto": 10, "tipo": "percentual", "validade_dias": 30}'::jsonb,
  recuperacao_inativos jsonb NOT NULL DEFAULT '{"ativo": false, "dias_sem_compra": 15, "cupom_codigo": "", "desconto": 10, "tipo": "percentual", "validade_dias": 7}'::jsonb,
  frete_gratis_auto jsonb NOT NULL DEFAULT '{"ativo": false, "valor_minimo": 50}'::jsonb,
  desconto_progressivo jsonb NOT NULL DEFAULT '{"ativo": false, "faixas": [{"valor_minimo": 30, "desconto": 5}, {"valor_minimo": 60, "desconto": 10}, {"valor_minimo": 100, "desconto": 15}]}'::jsonb,
  happy_hour jsonb NOT NULL DEFAULT '{"ativo": false, "hora_inicio": "14:00", "hora_fim": "17:00", "desconto": 10, "tipo": "percentual"}'::jsonb,
  promo_dia_semana jsonb NOT NULL DEFAULT '{"ativo": false, "dia": 3, "categoria_id": null, "desconto": 20, "tipo": "percentual"}'::jsonb,
  promo_relampago jsonb NOT NULL DEFAULT '{"ativo": false, "duracao_minutos": 30, "desconto": 20, "tipo": "percentual", "categoria_id": null, "inicio": null}'::jsonb,
  banner_promo jsonb NOT NULL DEFAULT '{"ativo": false, "texto": "", "cupom_codigo": ""}'::jsonb,
  cupom_surpresa jsonb NOT NULL DEFAULT '{"ativo": false, "valor_desconto": 5, "valor_minimo_pedido": 30, "cupom_codigo": "AGORA5"}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.promocoes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promocoes_config" ON public.promocoes_config
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read promocoes_config" ON public.promocoes_config
  FOR SELECT TO public
  USING (true);

-- Insert default row
INSERT INTO public.promocoes_config (id) VALUES (gen_random_uuid());
