-- Replace public SELECT with authenticated-only SELECT on configuracao_pix
DROP POLICY IF EXISTS "Anyone can read pix config" ON public.configuracao_pix;

CREATE POLICY "Authenticated users can read pix config"
  ON public.configuracao_pix
  FOR SELECT
  TO authenticated
  USING (true);