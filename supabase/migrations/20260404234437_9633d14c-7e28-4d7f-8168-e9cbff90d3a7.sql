
-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  nome_cliente text NOT NULL DEFAULT '',
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text NOT NULL DEFAULT '',
  resposta_loja text,
  aprovado boolean NOT NULL DEFAULT false,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  respondido_em timestamp with time zone,
  CONSTRAINT reviews_pedido_unique UNIQUE (pedido_id)
);

-- Add foreign keys
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD CONSTRAINT reviews_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews (public menu display)
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews
  FOR SELECT
  TO public
  USING (aprovado = true);

-- Authenticated users can read their own reviews (even unapproved)
CREATE POLICY "Users can read own reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (cliente_id IN (SELECT c.id FROM clientes c WHERE c.user_id = auth.uid()));

-- Authenticated users can insert reviews for their own orders
CREATE POLICY "Users can insert own reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    cliente_id IN (SELECT c.id FROM clientes c WHERE c.user_id = auth.uid())
    AND pedido_id IN (
      SELECT p.id FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE c.user_id = auth.uid() AND p.status = 'concluido'
    )
  );

-- Admins have full access
CREATE POLICY "Admins can manage reviews"
  ON public.reviews
  FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Create index for performance
CREATE INDEX reviews_cliente_id_idx ON public.reviews(cliente_id);
CREATE INDEX reviews_aprovado_idx ON public.reviews(aprovado) WHERE aprovado = true;
