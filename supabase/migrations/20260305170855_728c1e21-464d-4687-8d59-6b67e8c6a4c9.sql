
-- Add status_pagamento column to pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS status_pagamento text NOT NULL DEFAULT 'pendente';

-- Add updated_at column to pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Enable realtime for pedidos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
