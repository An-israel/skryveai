-- ─── Multi-Campaign AutoPilot Support ─────────────────────────────────────────
-- Allow up to 5 autopilot campaigns per user (previously only 1 via UNIQUE user_id)

-- 1. Add campaign name column
ALTER TABLE public.autopilot_configs
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Campaign 1';

-- 2. Drop the old UNIQUE constraint on user_id so multiple campaigns are allowed
ALTER TABLE public.autopilot_configs
  DROP CONSTRAINT IF EXISTS autopilot_configs_user_id_key;

-- 3. Add an index on user_id (for performance, since we lost the unique index)
CREATE INDEX IF NOT EXISTS idx_autopilot_configs_user_id ON public.autopilot_configs(user_id);

-- 4. Add a trigger to enforce max 5 campaigns per user
CREATE OR REPLACE FUNCTION public.check_autopilot_campaign_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.autopilot_configs WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 AutoPilot campaigns allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_autopilot_limit ON public.autopilot_configs;
CREATE TRIGGER enforce_autopilot_limit
  BEFORE INSERT ON public.autopilot_configs
  FOR EACH ROW EXECUTE FUNCTION public.check_autopilot_campaign_limit();

-- 5. Update autopilot_sessions to reference config id (for multi-campaign tracking)
ALTER TABLE public.autopilot_sessions
  ADD COLUMN IF NOT EXISTS config_id uuid REFERENCES public.autopilot_configs(id) ON DELETE CASCADE;

-- 6. Update autopilot_activity to reference config id
ALTER TABLE public.autopilot_activity
  ADD COLUMN IF NOT EXISTS config_id uuid REFERENCES public.autopilot_configs(id) ON DELETE CASCADE;
