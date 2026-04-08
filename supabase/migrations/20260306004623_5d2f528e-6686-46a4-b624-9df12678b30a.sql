
-- 1) Tabela enderecos_cliente
CREATE TABLE public.enderecos_cliente (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  rua text NOT NULL DEFAULT '',
  numero text NOT NULL DEFAULT '',
  complemento text DEFAULT '',
  bairro text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  referencia text DEFAULT '',
  cep text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enderecos_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
  ON public.enderecos_cliente FOR ALL
  USING (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()))
  WITH CHECK (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all addresses"
  ON public.enderecos_cliente FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_enderecos_cliente_id ON public.enderecos_cliente(cliente_id);

-- 2) Tabela itens_pedido
CREATE TABLE public.itens_pedido (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own order items"
  ON public.itens_pedido FOR SELECT
  USING (pedido_id IN (
    SELECT p.id FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own order items"
  ON public.itens_pedido FOR INSERT
  WITH CHECK (pedido_id IN (
    SELECT p.id FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all order items"
  ON public.itens_pedido FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX idx_itens_pedido_produto ON public.itens_pedido(produto_id);

-- 3) Tabela pagamentos
CREATE TABLE public.pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  metodo text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pendente',
  valor numeric NOT NULL DEFAULT 0,
  mercado_pago_payment_id text DEFAULT '',
  data_pagamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON public.pagamentos FOR SELECT
  USING (pedido_id IN (
    SELECT p.id FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own payments"
  ON public.pagamentos FOR INSERT
  WITH CHECK (pedido_id IN (
    SELECT p.id FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all payments"
  ON public.pagamentos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pagamentos_pedido ON public.pagamentos(pedido_id);

-- 4) Tabela entregadores
CREATE TABLE public.entregadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'disponivel',
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage entregadores"
  ON public.entregadores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read entregadores"
  ON public.entregadores FOR SELECT
  USING (true);

-- 5) Adicionar coluna endereco_id na tabela pedidos (opcional, referência ao endereço)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS endereco_id uuid REFERENCES public.enderecos_cliente(id) ON DELETE SET NULL;

-- 6) Adicionar colunas extras que faltam em pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS observacoes text DEFAULT '';
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS mercado_pago_id text DEFAULT '';

-- 7) Adicionar colunas extras em clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cpf text DEFAULT '';

-- 8) Habilitar realtime nas novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_pedido;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregadores;
