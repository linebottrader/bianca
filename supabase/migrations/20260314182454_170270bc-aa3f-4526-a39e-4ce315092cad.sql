
-- Add 'manager' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Table: maintenance_mode (single row)
CREATE TABLE public.maintenance_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  message text DEFAULT 'Sistema em manutenção. Voltaremos em breve.',
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage maintenance_mode" ON public.maintenance_mode FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read maintenance_mode" ON public.maintenance_mode FOR SELECT TO public
  USING (true);

-- Insert default row
INSERT INTO public.maintenance_mode (is_active) VALUES (false);

-- Table: system_audit_logs
CREATE TABLE public.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text DEFAULT '',
  action text NOT NULL,
  description text DEFAULT '',
  ip_address text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit_logs" ON public.system_audit_logs FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table: system_self_healing_logs
CREATE TABLE public.system_self_healing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type text NOT NULL,
  description text DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  resolution text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.system_self_healing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage self_healing_logs" ON public.system_self_healing_logs FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
