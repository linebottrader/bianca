
-- Tabela clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_completo text NOT NULL,
  telefone text NOT NULL UNIQUE,
  data_nascimento date NOT NULL,
  endereco text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cliente" ON public.clientes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cliente" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cliente" ON public.clientes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage clientes" ON public.clientes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can check phone existence" ON public.clientes FOR SELECT USING (true);

-- Tabela pedidos
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text NOT NULL UNIQUE,
  cliente_id uuid REFERENCES public.clientes(id) NOT NULL,
  tipo_entrega text NOT NULL CHECK (tipo_entrega IN ('ENTREGA', 'RETIRADA BALCÃO')),
  endereco_entrega text,
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('PIX', 'CARTÃO')),
  itens jsonb NOT NULL,
  valor_total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pedidos" ON public.pedidos FOR SELECT TO authenticated USING (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own pedidos" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage pedidos" ON public.pedidos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela configuracao_pix
CREATE TABLE public.configuracao_pix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_url text NOT NULL DEFAULT '',
  nome_recebedor text NOT NULL DEFAULT '',
  chave_pix text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.configuracao_pix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pix config" ON public.configuracao_pix FOR SELECT USING (true);
CREATE POLICY "Admins can manage pix config" ON public.configuracao_pix FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
