-- Persisted active role so a single account can act as talent OR client and
-- switch between them. NULL = not yet chosen (fall back to whichever profile exists).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_role public.skryve_user_role;
