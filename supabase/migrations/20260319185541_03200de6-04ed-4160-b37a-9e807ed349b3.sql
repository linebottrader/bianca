
-- RLS: manager can SELECT pedidos
CREATE POLICY "Managers can select pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- RLS: manager can UPDATE pedidos
CREATE POLICY "Managers can update pedidos"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

-- RLS: manager can SELECT clientes
CREATE POLICY "Managers can select clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- RLS: manager can SELECT configuracoes_impressao (already has public read, but explicit for manager)
-- skipping since Anyone can read printer config already exists

-- RLS: manager can SELECT store_config (already has public read)
-- skipping since Anyone can read store config already exists
