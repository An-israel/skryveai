-- Tool usage tracking + per-plan rate limits (#8)
-- Every AI tool action is logged; free-tier usage is hard-capped per calendar month.

-- ── Usage events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tool_usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool        text NOT NULL,                 -- e.g. cv_builder, ats_checker, proposals
  plan        text NOT NULL DEFAULT 'free',  -- plan at time of use
  blocked     boolean NOT NULL DEFAULT false, -- true = attempt rejected for hitting the cap
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool_time
  ON public.tool_usage_events(user_id, tool, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_time
  ON public.tool_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool
  ON public.tool_usage_events(tool);

-- ── Per-plan limits (admin-configurable) ─────────────────────────────────────
-- A row caps (plan, tool) to monthly_limit actions per calendar month.
-- No row for a (plan, tool) pair == unlimited.
CREATE TABLE IF NOT EXISTS public.tool_plan_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan          text NOT NULL,
  tool          text NOT NULL,
  monthly_limit integer,                      -- NULL == unlimited
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan, tool)
);

-- Seed sensible free-tier caps. Pro/Business have no rows => unlimited.
INSERT INTO public.tool_plan_limits (plan, tool, monthly_limit) VALUES
  ('free', 'cv_builder',     3),
  ('free', 'ats_checker',    5),
  ('free', 'proposals',      5),
  ('free', 'applications',  10),
  ('free', 'learning_coach', 30),
  ('free', 'linkedin',       3)
ON CONFLICT (plan, tool) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.tool_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_plan_limits  ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage; admins can read everything.
DROP POLICY IF EXISTS tue_select_own ON public.tool_usage_events;
CREATE POLICY tue_select_own ON public.tool_usage_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Inserts happen via the service role (edge functions) which bypasses RLS;
-- still allow a user to log their own event defensively.
DROP POLICY IF EXISTS tue_insert_own ON public.tool_usage_events;
CREATE POLICY tue_insert_own ON public.tool_usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Limits: readable by any authenticated user; only admins may change them.
DROP POLICY IF EXISTS tpl_select_all ON public.tool_plan_limits;
CREATE POLICY tpl_select_all ON public.tool_plan_limits FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS tpl_admin_write ON public.tool_plan_limits;
CREATE POLICY tpl_admin_write ON public.tool_plan_limits FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── Helper: resolve a user's current Skryve plan ('free'|'pro'|'business') ──
-- The subscriptions.plan column is a legacy enum (monthly/yearly/lifetime) in
-- some environments, so we normalise via text: only an explicit 'pro'/'business'
-- counts as paid; everything else (legacy values, trial, or no row) is 'free'.
CREATE OR REPLACE FUNCTION public.get_user_plan(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT CASE
    WHEN p IN ('pro', 'business') THEN p
    ELSE 'free'
  END
  FROM (
    SELECT (
      SELECT plan::text FROM public.subscriptions
        WHERE user_id = _uid AND status = 'active'
        ORDER BY updated_at DESC NULLS LAST LIMIT 1
    ) AS p
  ) s;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated, service_role;

-- ── Authoritative check + log, scoped to the caller (auth.uid) ──────────────
-- Returns the decision so the client can react immediately. Edge functions use
-- the service-role path (see _shared/usage-limits.ts) for hard enforcement.
CREATE OR REPLACE FUNCTION public.consume_tool_credit(_tool text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me      uuid := auth.uid();
  v_plan  text;
  v_limit integer;
  v_used  integer;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_plan := public.get_user_plan(me);

  SELECT monthly_limit INTO v_limit
    FROM public.tool_plan_limits
    WHERE plan = v_plan AND tool = _tool;

  SELECT count(*) INTO v_used
    FROM public.tool_usage_events
    WHERE user_id = me
      AND tool = _tool
      AND blocked = false
      AND created_at >= date_trunc('month', now());

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    INSERT INTO public.tool_usage_events (user_id, tool, plan, blocked)
      VALUES (me, _tool, v_plan, true);
    RETURN jsonb_build_object(
      'allowed', false, 'plan', v_plan, 'tool', _tool,
      'limit', v_limit, 'used', v_used, 'remaining', 0
    );
  END IF;

  INSERT INTO public.tool_usage_events (user_id, tool, plan, blocked)
    VALUES (me, _tool, v_plan, false);

  RETURN jsonb_build_object(
    'allowed', true, 'plan', v_plan, 'tool', _tool,
    'limit', v_limit, 'used', v_used + 1,
    'remaining', CASE WHEN v_limit IS NULL THEN NULL ELSE v_limit - v_used - 1 END
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.consume_tool_credit(text) TO authenticated;
