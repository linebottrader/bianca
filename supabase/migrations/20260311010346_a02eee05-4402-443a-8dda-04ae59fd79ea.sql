-- 1. Drop old constraint
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_forma_pagamento_check;

-- 2. Update existing data to new values
UPDATE public.pedidos SET forma_pagamento = 'mercado_pago' WHERE forma_pagamento IN ('MERCADO_PAGO', 'Mercado Pago');
UPDATE public.pedidos SET forma_pagamento = 'pix_manual' WHERE forma_pagamento IN ('PIX', 'pix');
UPDATE public.pedidos SET forma_pagamento = 'cartao_whatsapp' WHERE forma_pagamento IN ('CARTÃO', 'cartao', 'Cartão');

-- 3. Add new constraint
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_forma_pagamento_check CHECK (forma_pagamento IN ('mercado_pago', 'pix_manual', 'cartao_whatsapp'));