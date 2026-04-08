
-- Fix 1: Remove public SELECT on configuracao_frete (exposes Mapbox API key)
DROP POLICY IF EXISTS "Anyone can read frete config" ON public.configuracao_frete;

-- Fix 2: Add SELECT policy so customers can read their own profile
CREATE POLICY "Users can read own cliente"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
