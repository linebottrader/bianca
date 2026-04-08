
CREATE TABLE public.configuracoes_impressao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_impressora text NOT NULL DEFAULT '80mm',
  largura_papel text NOT NULL DEFAULT '80mm',
  metodo_impressao text NOT NULL DEFAULT 'navegador',
  nome_impressora text NOT NULL DEFAULT '',
  impressao_automatica boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.configuracoes_impressao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage printer config" ON public.configuracoes_impressao FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read printer config" ON public.configuracoes_impressao FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.configuracoes_impressao (tipo_impressora, largura_papel, metodo_impressao, nome_impressora, impressao_automatica, ativo)
VALUES ('80mm', '80mm', 'navegador', '', false, false);
