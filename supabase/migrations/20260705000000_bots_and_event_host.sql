-- Agents/bots must not look like normal users, and events need host info.

-- ── 1. Bot flag on talent_profiles ──────────────────────────────────────────
-- System agents (Daily Jobs, Sonder) get is_bot = true so they can be hidden
-- from the talent directory, Collab, feed, and user search.
ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

UPDATE public.talent_profiles
  SET is_bot = true
  WHERE user_id = 'da11f0b5-0000-4000-8000-000000000001';  -- Daily Jobs bot

-- ── 2. Event host fields ────────────────────────────────────────────────────
-- The poster can say whether they are the host, and name an external host.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_host   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS host_name text;
