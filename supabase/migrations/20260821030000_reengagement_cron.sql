-- send-reengagement is fully built (own comment: "Intended to run once
-- daily via pg_cron") but nothing schedules it — verified via repo-wide
-- search of every migration. It's conservative by design (in-app
-- notification only, no email; only fires when there's a real, dated
-- reason — 3+ new matching jobs; deduped to once per 7 days), so unlike
-- send-daily-encouragement this doesn't carry a mass-marketing-email risk
-- worth pausing on. Uses the same Vault-secret pattern as the sonder-agent
-- cron since the function itself requires a real service-role bearer token
-- (config.toml has no verify_jwt=false entry for it, so the gateway also
-- requires a valid JWT — the service role key satisfies both).
DO $$
BEGIN
  PERFORM cron.schedule('send-reengagement', '0 9 * * *', $cmd$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-reengagement',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
  $cmd$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'send-reengagement cron schedule skipped: %', SQLERRM;
END $$;
