
-- RLS: KDS users can SELECT pedidos
CREATE POLICY "KDS users can select pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'kds'));

-- RLS: KDS users can UPDATE pedidos (change status)
CREATE POLICY "KDS users can update pedidos"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'kds'))
WITH CHECK (public.has_role(auth.uid(), 'kds'));

-- RLS: KDS users can SELECT clientes
CREATE POLICY "KDS users can select clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'kds'));
