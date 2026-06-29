SELECT cron.schedule(
  'scrape-jobs',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/scrape-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-digest',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

DO $$ BEGIN
  ALTER TABLE aggregated_jobs ADD CONSTRAINT aggregated_jobs_external_id_platform_key UNIQUE (external_id, platform);
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN others THEN NULL;
END $$;

ALTER TABLE aggregated_jobs ADD COLUMN IF NOT EXISTS skill_tags text[] DEFAULT '{}';
ALTER TABLE aggregated_jobs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE aggregated_jobs ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE aggregated_jobs ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE aggregated_jobs ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE aggregated_jobs ADD COLUMN IF NOT EXISTS posted_at timestamptz DEFAULT now();
