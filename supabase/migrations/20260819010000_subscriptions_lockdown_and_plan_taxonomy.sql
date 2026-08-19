-- Two related billing fixes:
--
-- 1. subscriptions RLS currently lets any signed-in user INSERT/UPDATE their own
--    row with no restriction on which values ("Users can insert their own
--    subscription", "Super admins can update subscriptions", "sub_own" — the
--    latter two effectively grant self-service writes since `auth.uid() =
--    user_id` alone satisfies them). That means a paid plan + unlimited AI
--    credits can be self-granted from the browser console with zero payment,
--    independent of any application bug. Replace all of it with: read-only for
--    the owner, full access for admins (service role already bypasses RLS, so
--    edge functions are unaffected), and a narrow SECURITY DEFINER RPC for the
--    one legitimate self-service write (cancel-at-period-end).
--
-- 2. get_user_plan() only recognised the literal values 'pro'/'business' as
--    paid. verify-payment (fixed alongside this migration) now writes one of
--    the real plan tiers — free|basic|pro|unlimited|business|team_basic|
--    team_pro — matching what use-entitlements.ts and BrowseTalent.tsx already
--    check for. Treat any non-free value as paid, which — combined with
--    tool_plan_limits having no rows for anything but 'free' — makes every
--    paid tier unlimited for AI tool usage by the existing "no row = unlimited"
--    convention, matching the Pricing page's own copy.

-- ── 1. Lock down subscriptions writes ───────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "sub_own" ON public.subscriptions;

DO $$ BEGIN
  CREATE POLICY "Admins can write subscriptions" ON public.subscriptions FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ("Users can view their own subscription" / "Admins can view all subscriptions"
-- SELECT policies are untouched — reads stay as they were.)

CREATE OR REPLACE FUNCTION public.cancel_own_subscription()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.subscriptions
    SET cancel_at_period_end = true, updated_at = now()
    WHERE user_id = auth.uid();
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.cancel_own_subscription() TO authenticated;

-- ── 2. Recognise every paid tier, not just literal 'pro'/'business' ─────────
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
        ORDER BY updated_at DESC NULLS LAST LIMIT 1
    ) AS p
  ) s;
$fn$;
