
CREATE OR REPLACE FUNCTION public.increment_cupom_uso(cupom_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE cupons SET usos_atuais = usos_atuais + 1 WHERE id = cupom_id_param;
END;
$$;
