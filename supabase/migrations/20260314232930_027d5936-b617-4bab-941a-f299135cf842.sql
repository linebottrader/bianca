ALTER TABLE configuracoes_impressao 
ADD COLUMN IF NOT EXISTS fonte_tamanho text NOT NULL DEFAULT '12px',
ADD COLUMN IF NOT EXISTS fonte_negrito boolean NOT NULL DEFAULT false;