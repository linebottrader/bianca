-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- store_config
DROP POLICY IF EXISTS "Anyone can read store config" ON public.store_config;
DROP POLICY IF EXISTS "Admins can update store config" ON public.store_config;
DROP POLICY IF EXISTS "Admins can insert store config" ON public.store_config;

CREATE POLICY "Anyone can read store config" ON public.store_config FOR SELECT USING (true);
CREATE POLICY "Admins can update store config" ON public.store_config FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert store config" ON public.store_config FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- categories
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- menu_items
DROP POLICY IF EXISTS "Anyone can read active menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;

CREATE POLICY "Anyone can read active menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu items" ON public.menu_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- menu_options
DROP POLICY IF EXISTS "Anyone can read menu options" ON public.menu_options;
DROP POLICY IF EXISTS "Admins can manage menu options" ON public.menu_options;

CREATE POLICY "Anyone can read menu options" ON public.menu_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage menu options" ON public.menu_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- option_items
DROP POLICY IF EXISTS "Anyone can read option items" ON public.option_items;
DROP POLICY IF EXISTS "Admins can manage option items" ON public.option_items;

CREATE POLICY "Anyone can read option items" ON public.option_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage option items" ON public.option_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- clientes
DROP POLICY IF EXISTS "Anyone can check phone existence" ON public.clientes;
DROP POLICY IF EXISTS "Users can read own cliente" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert own cliente" ON public.clientes;
DROP POLICY IF EXISTS "Users can update own cliente" ON public.clientes;
DROP POLICY IF EXISTS "Admins can manage clientes" ON public.clientes;

CREATE POLICY "Anyone can check phone existence" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Users can insert own cliente" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cliente" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage clientes" ON public.clientes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- pedidos
DROP POLICY IF EXISTS "Users can read own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can insert own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admins can manage pedidos" ON public.pedidos;

CREATE POLICY "Users can read own pedidos" ON public.pedidos FOR SELECT USING (
  cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own pedidos" ON public.pedidos FOR INSERT WITH CHECK (
  cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage pedidos" ON public.pedidos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- itens_pedido
DROP POLICY IF EXISTS "Users can read own order items" ON public.itens_pedido;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.itens_pedido;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.itens_pedido;

CREATE POLICY "Users can read own order items" ON public.itens_pedido FOR SELECT USING (
  pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid())
);
CREATE POLICY "Users can insert own order items" ON public.itens_pedido FOR INSERT WITH CHECK (
  pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all order items" ON public.itens_pedido FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- pagamentos
DROP POLICY IF EXISTS "Users can read own payments" ON public.pagamentos;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.pagamentos;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.pagamentos;

CREATE POLICY "Users can read own payments" ON public.pagamentos FOR SELECT USING (
  pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid())
);
CREATE POLICY "Users can insert own payments" ON public.pagamentos FOR INSERT WITH CHECK (
  pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all payments" ON public.pagamentos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- configuracao_pix
DROP POLICY IF EXISTS "Anyone can read pix config" ON public.configuracao_pix;
DROP POLICY IF EXISTS "Admins can manage pix config" ON public.configuracao_pix;

CREATE POLICY "Anyone can read pix config" ON public.configuracao_pix FOR SELECT USING (true);
CREATE POLICY "Admins can manage pix config" ON public.configuracao_pix FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- configuracao_frete
DROP POLICY IF EXISTS "Anyone can read frete config" ON public.configuracao_frete;
DROP POLICY IF EXISTS "Admins can manage frete config" ON public.configuracao_frete;

CREATE POLICY "Anyone can read frete config" ON public.configuracao_frete FOR SELECT USING (true);
CREATE POLICY "Admins can manage frete config" ON public.configuracao_frete FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- configuracoes_impressao
DROP POLICY IF EXISTS "Anyone can read printer config" ON public.configuracoes_impressao;
DROP POLICY IF EXISTS "Admins can manage printer config" ON public.configuracoes_impressao;

CREATE POLICY "Anyone can read printer config" ON public.configuracoes_impressao FOR SELECT USING (true);
CREATE POLICY "Admins can manage printer config" ON public.configuracoes_impressao FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- entregadores
DROP POLICY IF EXISTS "Anyone can read entregadores" ON public.entregadores;
DROP POLICY IF EXISTS "Admins can manage entregadores" ON public.entregadores;

CREATE POLICY "Anyone can read entregadores" ON public.entregadores FOR SELECT USING (true);
CREATE POLICY "Admins can manage entregadores" ON public.entregadores FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- enderecos_cliente
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.enderecos_cliente;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.enderecos_cliente;

CREATE POLICY "Users can manage own addresses" ON public.enderecos_cliente FOR ALL 
  USING (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()))
  WITH CHECK (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all addresses" ON public.enderecos_cliente FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));