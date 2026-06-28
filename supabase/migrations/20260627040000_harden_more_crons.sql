-- ============================================================================
-- Harden the remaining GUC-dependent cron jobs
-- ============================================================================
-- send-digest and event-reminders were scheduled to call their edge functions
-- via current_setting('app.supabase_url') / current_setting('app.service_role_key').
-- Those database settings are not configured on the new project, so the calls
-- would raise and never run. Both functions are now verify_jwt=false, so the
-- cron can invoke them with no auth header and a hardcoded project URL.
-- ============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('send-digest');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('event-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Daily job digest at 07:08.
SELECT cron.schedule(
  'send-digest',
  '8 7 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/send-digest',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $cron$
);

-- Hourly event reminders at :05.
SELECT cron.schedule(
  'event-reminders',
  '5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/event-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $cron$
);
