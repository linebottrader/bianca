ALTER TABLE configuracoes_impressao 
ADD COLUMN IF NOT EXISTS fonte_obs_tamanho text NOT NULL DEFAULT '11px',
ADD COLUMN IF NOT EXISTS fonte_obs_cor text NOT NULL DEFAULT '#000000';