ALTER TABLE configuracoes_impressao
  ADD COLUMN IF NOT EXISTS som_novo_pedido_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS som_novo_pedido_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS som_repetir boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS som_volume integer NOT NULL DEFAULT 80;