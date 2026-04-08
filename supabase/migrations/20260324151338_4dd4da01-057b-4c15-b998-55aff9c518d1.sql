-- Analytics events table
CREATE TABLE analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  cliente_id uuid,
  metadata jsonb DEFAULT '{}',
  device_type text DEFAULT 'desktop',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read events" ON analytics_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;

-- Product recommendations table
CREATE TABLE product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  recommended_product_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  priority integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, recommended_product_id)
);

ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read recs" ON product_recommendations FOR SELECT USING (true);
CREATE POLICY "Admins manage recs" ON product_recommendations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE product_recommendations;

-- GA4 measurement ID column
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS ga4_measurement_id text DEFAULT '';