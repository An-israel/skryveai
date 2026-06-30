-- Backfill: every user who signed up as a talent (the default role) but never
-- completed onboarding has no talent_profiles row, so they were invisible in the
-- Collab directory. Create a minimal row for them so they show up and can be
-- messaged. Idempotent (only fills gaps); safe to replay.
DO $$
BEGIN
  INSERT INTO public.talent_profiles (user_id, full_name)
  SELECT u.id,
         COALESCE(p.full_name, NULLIF(split_part(u.email, '@', 1), ''), 'Talent')
  FROM auth.users u
  LEFT JOIN public.profiles        p  ON p.user_id  = u.id
  LEFT JOIN public.talent_profiles tp ON tp.user_id = u.id
  LEFT JOIN public.client_profiles cp ON cp.user_id = u.id
  WHERE tp.id IS NULL
    AND cp.id IS NULL
    AND COALESCE(u.raw_user_meta_data->>'role', 'talent') <> 'client';
EXCEPTION WHEN OTHERS THEN
  -- never let a backfill break a db push
  RAISE NOTICE 'talent_profiles backfill skipped: %', SQLERRM;
END $$;
