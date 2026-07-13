-- EMERGENCY AI-cost lockdown for Sonder (the autonomous, Opus-heavy applier).
-- The autopilot cron was running "for all active users" 8x/day — the most likely
-- driver of the sudden Anthropic token spike. Stop it, and turn autopilot OFF for
-- everyone except the owner so it can never mass-run unattended again.

-- 1) Unschedule the autonomous autopilot cron entirely.
DO $$
BEGIN
  PERFORM cron.unschedule('autopilot-run-every-2h');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'autopilot-run-every-2h cron not present — nothing to unschedule';
END $$;

-- 2) Deactivate every user's autopilot preference except the owner's, so even if
--    a cron is re-enabled later, only the owner account runs.
DO $$
BEGIN
  UPDATE public.sonder_preferences
     SET active = false, updated_at = now()
   WHERE user_id NOT IN (
     SELECT id FROM auth.users WHERE lower(email) = 'aniekaneazy@gmail.com'
   );
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'sonder_preferences table not present — skipping';
END $$;
