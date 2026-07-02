-- Engagement features: profile-view alerts, chat attachments, Daily Jobs bot.

-- ── 0. Settings bugfix: job_preferences.budget_currency missing ──────────────
-- Settings → Job Preferences saves budget_currency, which was never added to
-- the table ("Could not find the 'budget_currency' column" on save).
ALTER TABLE public.job_preferences
  ADD COLUMN IF NOT EXISTS budget_currency text NOT NULL DEFAULT 'USD';

-- ── 1. Profile views (one notification per viewer per day) ───────────────────
CREATE TABLE IF NOT EXISTS public.profile_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_on       date NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, talent_user_id, viewed_on)
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pv_select_own ON public.profile_views;
CREATE POLICY pv_select_own ON public.profile_views FOR SELECT
  USING (auth.uid() = talent_user_id OR auth.uid() = viewer_id);

-- Records a view; returns true only the FIRST time this viewer views this
-- talent today (callers notify on true). Also bumps the profile counter.
CREATE OR REPLACE FUNCTION public.record_profile_view(_talent_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me uuid := auth.uid();
  inserted boolean := false;
BEGIN
  IF me IS NULL OR _talent_user IS NULL OR me = _talent_user THEN
    RETURN false;
  END IF;
  INSERT INTO public.profile_views (viewer_id, talent_user_id)
    VALUES (me, _talent_user)
    ON CONFLICT (viewer_id, talent_user_id, viewed_on) DO NOTHING;
  inserted := FOUND;
  IF inserted THEN
    UPDATE public.talent_profiles
      SET profile_views = COALESCE(profile_views, 0) + 1
      WHERE user_id = _talent_user;
  END IF;
  RETURN inserted;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid) TO authenticated;

-- ── 2. Chat attachments ──────────────────────────────────────────────────────
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS attachment_url  text,
  ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.marketplace_messages
  ADD COLUMN IF NOT EXISTS attachment_name text;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS chat_attach_public_read ON storage.objects;
CREATE POLICY chat_attach_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');
DROP POLICY IF EXISTS chat_attach_auth_insert ON storage.objects;
CREATE POLICY chat_attach_auth_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS chat_attach_owner_delete ON storage.objects;
CREATE POLICY chat_attach_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

-- ── 3. Daily Jobs bot ────────────────────────────────────────────────────────
-- System account that DMs each talent their matched jobs every morning.
-- Guarded: environments where the migration role can't write auth.users
-- (e.g. local harness) skip it without failing the push.
DO $$
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  VALUES (
    'da11f0b5-0000-4000-8000-000000000001',
    'dailyjobs@skryveai.com',
    jsonb_build_object('full_name', 'Daily Jobs', 'role', 'talent'),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.talent_profiles (user_id, full_name, onboarding_completed)
  VALUES ('da11f0b5-0000-4000-8000-000000000001', 'Daily Jobs', true)
  ON CONFLICT (user_id) DO UPDATE SET full_name = 'Daily Jobs';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Daily Jobs bot setup skipped: %', SQLERRM;
END $$;

-- Service-role helper the digest function uses to deliver the DM.
CREATE OR REPLACE FUNCTION public.system_send_dm(_from uuid, _to uuid, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  lo uuid := LEAST(_from, _to);
  hi uuid := GREATEST(_from, _to);
  conv uuid;
BEGIN
  SELECT id INTO conv FROM public.direct_conversations WHERE user_a = lo AND user_b = hi;
  IF conv IS NULL THEN
    INSERT INTO public.direct_conversations (user_a, user_b) VALUES (lo, hi) RETURNING id INTO conv;
  END IF;
  INSERT INTO public.direct_messages (conversation_id, sender_id, body) VALUES (conv, _from, _body);
  UPDATE public.direct_conversations SET last_message_at = now() WHERE id = conv;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.system_send_dm(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_send_dm(uuid, uuid, text) TO service_role;
