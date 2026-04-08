
-- Function to get auth email by phone number (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_telefone text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM clientes c
  JOIN auth.users u ON u.id = c.user_id
  WHERE c.telefone = p_telefone
  LIMIT 1;
$$;

-- Function to find cliente by phone (for auth flow)
CREATE OR REPLACE FUNCTION public.find_cliente_by_phone(p_telefone text)
RETURNS SETOF clientes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM clientes WHERE telefone = p_telefone LIMIT 1;
$$;
