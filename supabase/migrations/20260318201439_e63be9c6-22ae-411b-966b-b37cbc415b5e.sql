
-- Add promotion tracking columns to pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_promocao_aplicada text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cupom_utilizado text DEFAULT NULL;

-- Add priority rules column to promocoes_config
ALTER TABLE public.promocoes_config
  ADD COLUMN IF NOT EXISTS regras_prioridade jsonb NOT NULL DEFAULT '{
    "desconto_maximo_percentual": 40,
    "permite_acumular": false,
    "prioridades": {
      "cupom": 1,
      "relampago": 2,
      "dia_semana": 3,
      "happy_hour": 4,
      "progressivo": 5,
      "frete_gratis": 6
    }
  }'::jsonb;
