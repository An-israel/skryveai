-- Two real gaps found while building the "grant a user Pro/Business for N
-- days" admin feature:
--
-- 1. get_user_plan() only ever checked status = 'active' — never
--    current_period_end. A paid subscription that lapses without renewal
--    never actually loses paid access; nothing anywhere flips it back to
--    free. Fixed to treat a lapsed period as not-paid in real time (no cron
--    needed — this is checked on every read).
-- 2. cancel_own_subscription() (added in 20260819010000) sets
--    cancel_at_period_end, but no migration ever added that column — the
--    original CREATE TABLE (20260203092008) doesn't have it, and the later
--    `CREATE TABLE IF NOT EXISTS` that listed it (20260529000012) was a
--    silent no-op since the table already existed. The function has likely
--    been failing at runtime since it was written.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS granted_note text;

CREATE OR REPLACE FUNCTION public.get_user_plan(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT CASE
    WHEN public.has_role(_uid, 'super_admin') THEN 'owner'
    WHEN p IS NOT NULL AND p <> '' AND p <> 'free' THEN p
    ELSE 'free'
  END
  FROM (
    SELECT (
      SELECT plan::text FROM public.subscriptions
        WHERE user_id = _uid AND status = 'active'
          AND (current_period_end IS NULL OR current_period_end > now())
        ORDER BY updated_at DESC NULLS LAST LIMIT 1
    ) AS p
  ) s;
$fn$;

-- Admin-only: give a user temporary Pro or Business access for N days,
-- separate from a real Paystack payment (granted_by records who comped it).
-- Overwrites any existing subscription row for that user — an admin grant is
-- meant to be the current word on that account's access, not stacked with
-- whatever was there before.
CREATE OR REPLACE FUNCTION public.admin_grant_plan(
  _user_id uuid, _plan text, _days integer, _note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); period_end timestamptz;
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _plan NOT IN ('pro', 'business') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_plan');
  END IF;
  IF _days IS NULL OR _days <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_days');
  END IF;

  period_end := now() + (_days || ' days')::interval;

  INSERT INTO public.subscriptions (
    user_id, plan, status, current_period_start, current_period_end,
    granted_by, granted_note, cancel_at_period_end
  ) VALUES (
    _user_id, _plan, 'active', now(), period_end, me, _note, false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = _plan, status = 'active', current_period_start = now(),
    current_period_end = period_end, granted_by = me, granted_note = _note,
    cancel_at_period_end = false, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'plan', _plan, 'expires_at', period_end);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.admin_grant_plan(uuid, text, integer, text) TO authenticated;

-- Admin-only: revoke a granted or paid plan immediately, back to free.
CREATE OR REPLACE FUNCTION public.admin_revoke_plan(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.subscriptions
     SET plan = 'free', status = 'canceled', current_period_end = now(), updated_at = now()
   WHERE user_id = _user_id;
  RETURN jsonb_build_object('ok', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.admin_revoke_plan(uuid) TO authenticated;
