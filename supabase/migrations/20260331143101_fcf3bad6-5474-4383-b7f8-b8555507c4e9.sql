-- Revoke public API access to materialized view (security fix)
REVOKE ALL ON public.dashboard_stats FROM anon, authenticated;
-- Only allow access via the RPC function
GRANT SELECT ON public.dashboard_stats TO authenticated;
