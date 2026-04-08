
-- Add missing columns to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS estacao_preparo text DEFAULT 'Cozinha';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tempo_preparo integer DEFAULT 10;

-- Add missing columns to pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS espera_iniciada_em timestamptz;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS pedido_concluido_em timestamptz;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS preparo_finalizado_em timestamptz;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS preparo_iniciado_em timestamptz;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tempo_espera numeric;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tempo_preparo numeric;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tempo_total numeric;

-- Add missing columns to option_items
ALTER TABLE public.option_items ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.option_items ADD COLUMN IF NOT EXISTS descricao text DEFAULT '';
ALTER TABLE public.option_items ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.option_groups(id) ON DELETE SET NULL;
ALTER TABLE public.option_items ADD COLUMN IF NOT EXISTS imagem_url text DEFAULT '';

-- Add missing column to configuracoes_impressao
ALTER TABLE public.configuracoes_impressao ADD COLUMN IF NOT EXISTS som_novo_pedido_ativo boolean DEFAULT true;
