
-- autopilot_configs
CREATE TABLE IF NOT EXISTS public.autopilot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_active boolean DEFAULT false,
  expertise jsonb DEFAULT '{}',
  target_businesses jsonb DEFAULT '{}',
  locations jsonb DEFAULT '[]',
  daily_quota jsonb DEFAULT '{}',
  email_style jsonb DEFAULT '{}',
  compliance jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.autopilot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own autopilot config"
  ON public.autopilot_configs FOR ALL
  USING (auth.uid() = user_id);

-- autopilot_sessions
CREATE TABLE IF NOT EXISTS public.autopilot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date text NOT NULL,
  emails_sent integer DEFAULT 0,
  emails_failed integer DEFAULT 0,
  emails_skipped integer DEFAULT 0,
  status text DEFAULT 'idle',
  current_location text,
  current_activity text,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.autopilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.autopilot_sessions FOR ALL
  USING (auth.uid() = user_id);

-- autopilot_activity
CREATE TABLE IF NOT EXISTS public.autopilot_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.autopilot_sessions(id),
  business_name text,
  business_location text,
  contact_email text,
  email_subject text,
  email_body text,
  status text DEFAULT 'sent',
  opened boolean DEFAULT false,
  clicked boolean DEFAULT false,
  replied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.autopilot_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity"
  ON public.autopilot_activity FOR ALL
  USING (auth.uid() = user_id);

-- contacted_businesses
CREATE TABLE IF NOT EXISTS public.contacted_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL,
  contacted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, domain)
);

ALTER TABLE public.contacted_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage contacted businesses"
  ON public.contacted_businesses FOR ALL
  USING (auth.uid() = user_id);

-- tool_usage tracking
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_name text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tool usage"
  ON public.tool_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tool usage"
  ON public.tool_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tool usage"
  ON public.tool_usage FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_autopilot_sessions_user_date ON public.autopilot_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_autopilot_activity_user_created ON public.autopilot_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacted_businesses_user_domain ON public.contacted_businesses(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON public.tool_usage(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user ON public.tool_usage(user_id, created_at DESC);

-- updated_at triggers
CREATE TRIGGER autopilot_configs_updated_at
  BEFORE UPDATE ON public.autopilot_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER autopilot_sessions_updated_at
  BEFORE UPDATE ON public.autopilot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
