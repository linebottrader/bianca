
-- Fix ALL RLS policies to be PERMISSIVE instead of RESTRICTIVE

-- store_config
DROP POLICY IF EXISTS "Anyone can read store config" ON public.store_config;
CREATE POLICY "Anyone can read store config" ON public.store_config FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can update store config" ON public.store_config;
CREATE POLICY "Admins can update store config" ON public.store_config FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert store config" ON public.store_config;
CREATE POLICY "Admins can insert store config" ON public.store_config FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- categories
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- menu_items
DROP POLICY IF EXISTS "Anyone can read active menu items" ON public.menu_items;
CREATE POLICY "Anyone can read active menu items" ON public.menu_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage menu items" ON public.menu_items FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- menu_options
DROP POLICY IF EXISTS "Anyone can read menu options" ON public.menu_options;
CREATE POLICY "Anyone can read menu options" ON public.menu_options FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage menu options" ON public.menu_options;
CREATE POLICY "Admins can manage menu options" ON public.menu_options FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- option_items
DROP POLICY IF EXISTS "Anyone can read option items" ON public.option_items;
CREATE POLICY "Anyone can read option items" ON public.option_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage option items" ON public.option_items;
CREATE POLICY "Admins can manage option items" ON public.option_items FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- clientes
DROP POLICY IF EXISTS "Anyone can check phone existence" ON public.clientes;
CREATE POLICY "Anyone can check phone existence" ON public.clientes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can insert own cliente" ON public.clientes;
CREATE POLICY "Users can insert own cliente" ON public.clientes FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cliente" ON public.clientes;
CREATE POLICY "Users can update own cliente" ON public.clientes FOR UPDATE TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage clientes" ON public.clientes;
CREATE POLICY "Admins can manage clientes" ON public.clientes FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- pedidos
DROP POLICY IF EXISTS "Users can read own pedidos" ON public.pedidos;
CREATE POLICY "Users can read own pedidos" ON public.pedidos FOR SELECT TO public USING (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own pedidos" ON public.pedidos;
CREATE POLICY "Users can insert own pedidos" ON public.pedidos FOR INSERT TO public WITH CHECK (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage pedidos" ON public.pedidos;
CREATE POLICY "Admins can manage pedidos" ON public.pedidos FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- itens_pedido
DROP POLICY IF EXISTS "Users can read own order items" ON public.itens_pedido;
CREATE POLICY "Users can read own order items" ON public.itens_pedido FOR SELECT TO public USING (pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own order items" ON public.itens_pedido;
CREATE POLICY "Users can insert own order items" ON public.itens_pedido FOR INSERT TO public WITH CHECK (pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all order items" ON public.itens_pedido;
CREATE POLICY "Admins can manage all order items" ON public.itens_pedido FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- pagamentos
DROP POLICY IF EXISTS "Users can read own payments" ON public.pagamentos;
CREATE POLICY "Users can read own payments" ON public.pagamentos FOR SELECT TO public USING (pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own payments" ON public.pagamentos;
CREATE POLICY "Users can insert own payments" ON public.pagamentos FOR INSERT TO public WITH CHECK (pedido_id IN (SELECT p.id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.pagamentos;
CREATE POLICY "Admins can manage all payments" ON public.pagamentos FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- configuracao_frete
DROP POLICY IF EXISTS "Anyone can read frete config" ON public.configuracao_frete;
CREATE POLICY "Anyone can read frete config" ON public.configuracao_frete FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage frete config" ON public.configuracao_frete;
CREATE POLICY "Admins can manage frete config" ON public.configuracao_frete FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- configuracao_pix
DROP POLICY IF EXISTS "Anyone can read pix config" ON public.configuracao_pix;
CREATE POLICY "Anyone can read pix config" ON public.configuracao_pix FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage pix config" ON public.configuracao_pix;
CREATE POLICY "Admins can manage pix config" ON public.configuracao_pix FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- configuracoes_impressao
DROP POLICY IF EXISTS "Anyone can read printer config" ON public.configuracoes_impressao;
CREATE POLICY "Anyone can read printer config" ON public.configuracoes_impressao FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage printer config" ON public.configuracoes_impressao;
CREATE POLICY "Admins can manage printer config" ON public.configuracoes_impressao FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- entregadores
DROP POLICY IF EXISTS "Anyone can read entregadores" ON public.entregadores;
CREATE POLICY "Anyone can read entregadores" ON public.entregadores FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage entregadores" ON public.entregadores;
CREATE POLICY "Admins can manage entregadores" ON public.entregadores FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- enderecos_cliente
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.enderecos_cliente;
CREATE POLICY "Users can manage own addresses" ON public.enderecos_cliente FOR ALL TO public USING (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())) WITH CHECK (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.enderecos_cliente;
CREATE POLICY "Admins can manage all addresses" ON public.enderecos_cliente FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
