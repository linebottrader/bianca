ALTER TABLE public.pedidos ADD COLUMN idempotency_key text;

CREATE UNIQUE INDEX idx_pedidos_idempotency_key ON public.pedidos(idempotency_key) WHERE idempotency_key IS NOT NULL;