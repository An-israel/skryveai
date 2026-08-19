-- process-daily-credits, process-trial-reminders, process-confirmation-reminders,
-- and notify-admin-failed-emails all had verify_jwt=false (public) but, unlike
-- scrape-jobs/send-digest/event-reminders/sonder-agent, none of them actually
-- had a pg_cron schedule anywhere in the tracked migrations — they were public
-- with no legitimate caller at all. Now that each function checks for an admin
-- token OR rate-limits anonymous calls (see authorizeAdminOrCron in
-- _shared/cron-auth.ts), give them the real schedules their logic implies.

DO $$ BEGIN PERFORM cron.unschedule('process-daily-credits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('process-trial-reminders'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('process-confirmation-reminders'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('notify-admin-failed-emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('process-daily-credits', '10 0 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/process-daily-credits',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('process-trial-reminders', '20 0 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/process-trial-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);

-- Targets a 2-24h-since-signup window, so needs to run more than daily to
-- catch everyone promptly.
SELECT cron.schedule('process-confirmation-reminders', '0 */6 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/process-confirmation-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('notify-admin-failed-emails', '0 */6 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/notify-admin-failed-emails',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);
