-- send-daily-encouragement and send-push-notifications were fully built,
-- properly authed (see the authorizeAdminOrCron additions in the same PR),
-- but never scheduled. Both have verify_jwt=false, so — like
-- process-daily-credits and friends — pg_cron can call them with no
-- Authorization header at all; authorizeAdminOrCron treats that as the
-- legitimate anonymous/cron path (rate-limited, which a once-a-day call
-- never approaches).

DO $$ BEGIN PERFORM cron.unschedule('send-daily-encouragement'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('send-push-notifications-morning'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('send-push-notifications-evening'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('send-daily-encouragement', '0 8 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/send-daily-encouragement',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);

-- The function itself picks morning vs evening copy from the current UTC
-- hour (5-9 UTC = morning, per its own comment "7 AM WAT = 6 AM UTC" /
-- "5 PM WAT = 4 PM UTC"), so two calls a day land one of each.
SELECT cron.schedule('send-push-notifications-morning', '0 6 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/send-push-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('send-push-notifications-evening', '0 16 * * *', $cron$
  SELECT net.http_post(
    url := 'https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1/send-push-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$cron$);
