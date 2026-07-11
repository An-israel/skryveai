-- Limits UI support (Build Spec Part 1, Prompt 3): a read-only status endpoint so
-- the frontend can show remaining AI credits anywhere without consuming one.
-- Mirrors the enforcement window used by _shared/usage-limits.ts (calendar month).

CREATE OR REPLACE FUNCTION public.get_limits_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me     uuid := auth.uid();
  v_plan text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_plan := public.get_user_plan(me);

  RETURN jsonb_build_object(
    'plan', v_plan,
    'period', 'month',
    'resets_at', (date_trunc('month', now()) + interval '1 month'),
    'tools', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'tool', t.tool,
        'limit', lim.monthly_limit,          -- NULL => unlimited
        'used', COALESCE(u.used, 0),
        'remaining', CASE
          WHEN lim.monthly_limit IS NULL THEN NULL
          ELSE GREATEST(0, lim.monthly_limit - COALESCE(u.used, 0))
        END,
        'unlimited', lim.monthly_limit IS NULL
      ) ORDER BY t.tool)
      FROM (SELECT DISTINCT tool FROM public.tool_plan_limits) t
      LEFT JOIN public.tool_plan_limits lim
        ON lim.tool = t.tool AND lim.plan = v_plan
      LEFT JOIN (
        SELECT tool, count(*)::int AS used
        FROM public.tool_usage_events
        WHERE user_id = me AND blocked = false
          AND created_at >= date_trunc('month', now())
        GROUP BY tool
      ) u ON u.tool = t.tool
    ), '[]'::jsonb)
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_limits_status() TO authenticated;
