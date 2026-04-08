CREATE TABLE IF NOT EXISTS store_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time NOT NULL DEFAULT '18:00',
  close_time time NOT NULL DEFAULT '23:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (day_of_week)
);

ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_hours" ON store_hours FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read store_hours" ON store_hours FOR SELECT TO public
  USING (true);

INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, true, '17:00', '00:00'),
  (1, true, '18:00', '23:00'),
  (2, true, '18:00', '23:00'),
  (3, true, '18:00', '23:00'),
  (4, true, '18:00', '23:00'),
  (5, true, '18:00', '23:00'),
  (6, true, '17:00', '00:00')
ON CONFLICT (day_of_week) DO NOTHING;

CREATE TABLE IF NOT EXISTS special_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  is_open boolean NOT NULL DEFAULT false,
  open_time time DEFAULT NULL,
  close_time time DEFAULT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage special_dates" ON special_dates FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read special_dates" ON special_dates FOR SELECT TO public
  USING (true);

CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  is_open boolean NOT NULL DEFAULT false,
  open_time time DEFAULT NULL,
  close_time time DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage holidays" ON holidays FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read holidays" ON holidays FOR SELECT TO public
  USING (true);

CREATE TABLE IF NOT EXISTS store_pause (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  start_time timestamptz DEFAULT NULL,
  end_time timestamptz DEFAULT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_pause ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_pause" ON store_pause FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read store_pause" ON store_pause FOR SELECT TO public
  USING (true);

INSERT INTO store_pause (is_active) VALUES (false);

CREATE TABLE IF NOT EXISTS store_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  force_status boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_override" ON store_override FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read store_override" ON store_override FOR SELECT TO public
  USING (true);

INSERT INTO store_override (is_active, force_status) VALUES (false, false);