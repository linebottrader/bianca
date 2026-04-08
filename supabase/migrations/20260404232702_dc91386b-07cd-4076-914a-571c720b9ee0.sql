
-- Remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can read entregadores" ON public.entregadores;

-- Admins already have ALL access, add SELECT for manager and kds roles
CREATE POLICY "Managers can read entregadores"
  ON public.entregadores
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "KDS users can read entregadores"
  ON public.entregadores
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'kds'::app_role));
