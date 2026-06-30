-- Billing plan model fix.
-- The Skryve product uses plan = 'free' | 'pro' | 'business', but subscriptions.plan
-- was created earlier as the legacy enum subscription_plan ('monthly','yearly','lifetime')
-- and the newer text definition was shadowed by CREATE TABLE IF NOT EXISTS. As a result
-- the Billing upgrade flow could never persist 'pro'/'business' (enum rejects them), so
-- paid upgrades silently failed and per-plan rate limits never lifted.
--
-- Convert the column to text, default 'free', and normalise legacy values. Idempotent:
-- only runs when the column is still the enum type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'subscriptions'
      AND column_name  = 'plan'
      AND udt_name     = 'subscription_plan'
  ) THEN
    ALTER TABLE public.subscriptions ALTER COLUMN plan DROP DEFAULT;
    ALTER TABLE public.subscriptions ALTER COLUMN plan TYPE text USING plan::text;
    ALTER TABLE public.subscriptions ALTER COLUMN plan SET DEFAULT 'free';

    -- Legacy individual plans map to the free tier (no one has a valid Skryve
    -- paid subscription yet, since the upgrade path was broken).
    UPDATE public.subscriptions
      SET plan = 'free'
      WHERE plan IN ('monthly', 'yearly', 'lifetime');
  END IF;
END $$;
