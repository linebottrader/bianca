-- Add timestamp columns for KDS timer tracking
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS preparo_iniciado_em timestamptz,
  ADD COLUMN IF NOT EXISTS preparo_finalizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS espera_iniciada_em timestamptz,
  ADD COLUMN IF NOT EXISTS pedido_concluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS tempo_preparo integer,
  ADD COLUMN IF NOT EXISTS tempo_espera integer,
  ADD COLUMN IF NOT EXISTS tempo_total integer;