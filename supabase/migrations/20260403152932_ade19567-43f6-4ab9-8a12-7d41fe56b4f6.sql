-- Replace permissive INSERT policy with one that prevents spoofing
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;

-- Anon users can insert but cannot set user_id or cliente_id
CREATE POLICY "Anon can insert anonymous events"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND cliente_id IS NULL);

-- Authenticated users must match their own user_id
CREATE POLICY "Auth users can insert own events"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());