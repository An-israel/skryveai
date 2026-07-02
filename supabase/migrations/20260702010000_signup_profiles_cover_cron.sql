-- 1) Cover photo support on talent profiles.
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- 2) Every new signup gets a role profile immediately, so talents appear in
--    Collab (and clients are trackable) even before they finish onboarding.
CREATE OR REPLACE FUNCTION public.handle_new_user_role_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'talent') = 'client' THEN
    INSERT INTO public.client_profiles (user_id, company_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NULLIF(split_part(NEW.email, '@', 1), ''), 'Client'))
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.talent_profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NULLIF(split_part(NEW.email, '@', 1), ''), 'Talent'))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block a signup
END $$;

CREATE OR REPLACE TRIGGER on_auth_user_created_role_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role_profile();

-- 3) Re-run the backfill for anyone who signed up since the first backfill
--    (talents), and backfill client-role users into client_profiles too.
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

  INSERT INTO public.client_profiles (user_id, company_name)
  SELECT u.id,
         COALESCE(p.full_name, NULLIF(split_part(u.email, '@', 1), ''), 'Client')
  FROM auth.users u
  LEFT JOIN public.profiles        p  ON p.user_id  = u.id
  LEFT JOIN public.client_profiles cp ON cp.user_id = u.id
  WHERE cp.id IS NULL
    AND u.raw_user_meta_data->>'role' = 'client';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'role profile backfill skipped: %', SQLERRM;
END $$;

-- 4) Cron jobs read the project URL + service key from Supabase Vault instead
--    of database parameters (ALTER DATABASE ... SET is not permitted on hosted
--    Supabase). Populate the two secrets once in the SQL editor:
--      select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--      select vault.create_secret('<service-role-key>', 'service_role_key');
DO $$
BEGIN
  PERFORM cron.schedule('scrape-jobs', '0 */6 * * *', $cmd$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/scrape-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
  $cmd$);

  PERFORM cron.schedule('send-digest', '0 7 * * *', $cmd$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
  $cmd$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron reschedule skipped: %', SQLERRM;
END $$;
