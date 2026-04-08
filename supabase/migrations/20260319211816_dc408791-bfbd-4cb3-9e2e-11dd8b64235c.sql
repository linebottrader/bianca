
CREATE TABLE public.cupons_aniversario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  desconto numeric NOT NULL DEFAULT 10,
  validade timestamptz NOT NULL,
  usado boolean NOT NULL DEFAULT false,
  whatsapp_enviado boolean NOT NULL DEFAULT false,
  ano integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, ano)
);

ALTER TABLE public.cupons_aniversario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage birthday coupons" ON public.cupons_aniversario FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own birthday coupons" ON public.cupons_aniversario FOR SELECT TO public USING (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));

CREATE TABLE public.aniversario_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT true,
  desconto_percentual numeric NOT NULL DEFAULT 10,
  validade_horas integer NOT NULL DEFAULT 24,
  mensagem_whatsapp text NOT NULL DEFAULT '🎉 Parabéns, {nome}! Hoje é seu aniversário 🎂
Preparamos um presente pra você:
🎁 Cupom: {codigo}
💸 Desconto: {desconto}%
⏰ Válido por {validade}h
Aproveite agora: {link_loja}',
  envio_automatico boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.aniversario_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage birthday config" ON public.aniversario_config FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone read birthday config" ON public.aniversario_config FOR SELECT TO public USING (true);

INSERT INTO public.aniversario_config DEFAULT VALUES;
