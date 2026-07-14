-- Stop ALL background Sonder activity for EVERY user, completely.
-- Background runs come from: the autopilot cron -> trigger_autopilot_run() ->
-- POST /autopilot-run -> processes users whose sonder_preferences.active = true.
-- We cut all three layers so nothing can run unattended.

-- 1) Unschedule the autopilot cron.
DO $$
BEGIN
  PERFORM cron.unschedule('autopilot-run-every-2h');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'autopilot-run-every-2h cron not present — nothing to unschedule';
END $$;

-- 2) Deactivate autopilot for EVERY user (including the owner). Manual "Run now"
--    on the Sonder page still works for eligible users; only background runs stop.
DO $$
BEGIN
  UPDATE public.sonder_preferences SET active = false, updated_at = now()
   WHERE active = true;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'sonder_preferences table not present — skipping';
END $$;

-- 3) Neutralise the cron trigger function itself, so even if a cron is
--    re-scheduled later, it can never POST to /autopilot-run. To re-enable
--    background runs in future, restore this function from 20260510224121.
CREATE OR REPLACE FUNCTION public.trigger_autopilot_run()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE 'trigger_autopilot_run is disabled — background Sonder is off';
  RETURN;
END;
$$;
