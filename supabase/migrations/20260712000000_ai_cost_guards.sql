-- AI cost guards: give the newly-gated improve-description tool a free-tier cap.
-- (linkedin already has a limit row; the global per-user AI ceiling is enforced
-- in _shared/usage-limits.ts and needs no schema — it reuses rate_limit_events.)
INSERT INTO public.tool_plan_limits (plan, tool, monthly_limit) VALUES
  ('free', 'improve_description', 15)
ON CONFLICT (plan, tool) DO NOTHING;
