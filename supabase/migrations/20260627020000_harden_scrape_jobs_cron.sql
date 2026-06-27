-- ============================================================================
-- Harden the job-scraper cron
-- ============================================================================
-- The original schedule called the edge function with
--   current_setting('app.supabase_url') / current_setting('app.service_role_key')
-- If those database settings were never configured, current_setting() raises and
-- the scheduled scrape silently never ran — leaving the feed empty.
--
-- scrape-jobs is now verify_jwt=false, so the cron can invoke it with no auth
-- header, and the project URL is hardcoded (the project ref is not secret). This
-- removes the dependency on those GUCs entirely.
-- ============================================================================

-- Drop any existing scrape-jobs schedule (old GUC-based definition, if present).
DO $$
BEGIN
  PERFORM cron.unschedule('scrape-jobs');
EXCEPTION WHEN OTHERS THEN
  NULL; -- no existing job to remove
END $$;

-- Re-schedule every 4 hours so the 24h feed stays well populated.
SELECT cron.schedule(
  'scrape-jobs',
  '0 */4 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://dgyuafltlpruhdlgwiew.supabase.co/functions/v1/scrape-jobs',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $cron$
);
