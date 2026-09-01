-- Domain migration: skryveai.com → skryve.app. The bot accounts seeded in
-- 20260703000000_engagement_features.sql and 20260706000000_sonder_agent.sql
-- were inserted with @skryveai.com placeholder emails (fixed UUIDs, never
-- used for real login) — update them in place rather than editing the
-- historical migration files, which wouldn't touch rows already provisioned
-- in a live database.
UPDATE auth.users SET email = 'dailyjobs@skryve.app'
  WHERE id = 'da11f0b5-0000-4000-8000-000000000001' AND email = 'dailyjobs@skryveai.com';

UPDATE auth.users SET email = 'sonder@skryve.app'
  WHERE id = '50fde12b-0000-4000-8000-000000000002' AND email = 'sonder@skryveai.com';
