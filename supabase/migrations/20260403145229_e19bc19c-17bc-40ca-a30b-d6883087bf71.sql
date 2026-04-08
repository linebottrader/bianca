
-- Drop the insecure public SELECT policy on clientes
DROP POLICY IF EXISTS "Anyone can check phone existence" ON public.clientes;

-- Add explicit deny-all policy on password_reset_tokens
CREATE POLICY "No direct client access to reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
