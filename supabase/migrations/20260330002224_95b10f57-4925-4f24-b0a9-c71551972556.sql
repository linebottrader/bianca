-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_created ON public.pedidos(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_active_visible ON public.menu_items(is_active, visivel);
CREATE INDEX IF NOT EXISTS idx_option_items_group_id ON public.option_items(group_id);
CREATE INDEX IF NOT EXISTS idx_product_option_groups_product ON public.product_option_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_groups_group ON public.product_option_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido_id ON public.pagamentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_menu_section_products_section ON public.menu_section_products(section_id);
