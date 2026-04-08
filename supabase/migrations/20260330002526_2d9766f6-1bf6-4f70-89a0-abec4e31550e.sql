-- Materialized view for dashboard stats (ultra-fast reads)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_stats AS
SELECT
  COUNT(*) AS total_pedidos,
  COALESCE(SUM(valor_total), 0) AS faturamento_total,
  COALESCE(AVG(valor_total), 0) AS ticket_medio,
  COUNT(*) FILTER (WHERE status = 'concluido') AS pedidos_concluidos,
  COUNT(*) FILTER (WHERE status = 'cancelado') AS pedidos_cancelados,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS pedidos_hoje,
  COALESCE(SUM(valor_total) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS faturamento_hoje,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS pedidos_7d,
  COALESCE(SUM(valor_total) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0) AS faturamento_7d
FROM public.pedidos;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_single ON public.dashboard_stats ((1));

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats;
END;
$$;
