-- Nightly Sonder run: at 02:00 UTC the agent sources, scores and pre-fills
-- applications for every active user, so they wake up to a reviewed queue.
-- Reads the project URL + service key from Vault (see signup_profiles_cover_cron).
DO $$
BEGIN
  PERFORM cron.schedule('sonder-agent', '0 2 * * *', $cmd$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sonder-agent',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
  $cmd$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sonder cron schedule skipped: %', SQLERRM;
END $$;
