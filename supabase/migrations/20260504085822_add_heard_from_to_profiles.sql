-- Add heard_from column to profiles to track how users discovered SkryveAI
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS heard_from TEXT;
