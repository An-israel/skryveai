-- Super admins (the platform owner/team) should never see AI-tool usage caps —
-- they're not a subscriber, they're the operator. Extend get_user_plan() with an
-- 'owner' tier that has no rows in tool_plan_limits, which the existing "no row
-- for (plan, tool) == unlimited" convention already treats as unlimited. This
-- flows through automatically to get_limits_status() and consume_tool_credit(),
-- since both already call get_user_plan().

CREATE OR REPLACE FUNCTION public.get_user_plan(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT CASE
    WHEN public.has_role(_uid, 'super_admin') THEN 'owner'
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
