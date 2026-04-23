
-- Module-level fallback URL when a lesson resource is missing
ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS content_url text;

-- Per-learner reminder preferences for inactivity-based nudges
ALTER TABLE public.user_learning
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_inactivity_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- Sanity: clamp inactivity threshold between 1 and 30 days
DO $$ BEGIN
  ALTER TABLE public.user_learning
    ADD CONSTRAINT user_learning_reminder_inactivity_days_chk
    CHECK (reminder_inactivity_days BETWEEN 1 AND 30);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
