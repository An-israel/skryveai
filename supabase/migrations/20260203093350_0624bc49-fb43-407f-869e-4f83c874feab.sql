-- Enable pg_cron and pg_net extensions for scheduled functions.
-- On Supabase these are pre-provisioned (often in a different schema), so the
-- statements are wrapped to never abort a from-scratch db push.
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Grant usage to postgres role
DO $$ BEGIN GRANT USAGE ON SCHEMA cron TO postgres; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres; EXCEPTION WHEN OTHERS THEN NULL; END $$;
