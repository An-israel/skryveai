-- Restore Sonder's overnight autonomous run — disabled entirely by
-- 20260712010000/20260714000000 after an AI-cost spike — now with real spend
-- controls instead of just "off":
--   - once daily (was 8x/day), not 8x/day
--   - calls sonder-agent directly (the working, existing function) rather than
--     the missing /autopilot-run endpoint the old trigger function posted to
--   - sonder-agent itself now enforces a global daily cover-letter budget and
--     re-checks Business-plan/owner eligibility server-side (see that file)
-- trigger_autopilot_run() stays neutralised (nothing calls it anymore) —
-- this schedules straight to the function the same way scrape-jobs/
-- send-digest/event-reminders already do.

DO $$
BEGIN
  PERFORM cron.unschedule('autopilot-run-every-2h');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sonder-nightly-run');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 01:00 UTC daily — applications ready well before morning for the product's
-- primary timezone (WAT, UTC+1).
SELECT cron.schedule(
  'sonder-nightly-run',
  '0 1 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/sonder-agent',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $cron$
);
