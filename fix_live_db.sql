-- ══════════════════════════════════════════════════════════════════
-- Run this in: supabase.com/dashboard/project/dgyuafltlpruhdlgwiew/sql/new
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Ensure is_admin helper exists ─────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','content_editor','support_agent')
  )
$$;

-- ── 2. Create chat tables (safe if already exist) ─────────────────
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  last_message_at timestamptz DEFAULT now(),
  unread_by_admin integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user','admin','system')),
  message text NOT NULL,
  read_by_admin boolean DEFAULT false,
  read_by_user boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── 3. Add any missing columns (safe if already exist) ────────────
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS unread_by_admin integer DEFAULT 0;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_by_admin boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_by_user boolean DEFAULT true;

-- ── 4. Enable RLS ─────────────────────────────────────────────────
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ── 5. chat_conversations policies (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Users can view own conversation" ON public.chat_conversations;
CREATE POLICY "Users can view own conversation" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversation" ON public.chat_conversations;
CREATE POLICY "Users can create own conversation" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation" ON public.chat_conversations;
CREATE POLICY "Users can update own conversation" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can view all conversations" ON public.chat_conversations FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can update all conversations" ON public.chat_conversations FOR UPDATE USING (public.is_admin(auth.uid()));

-- ── 6. chat_messages policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can mark messages read" ON public.chat_messages;
CREATE POLICY "Users can mark messages read" ON public.chat_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
CREATE POLICY "Admins can view all messages" ON public.chat_messages FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can send messages" ON public.chat_messages;
CREATE POLICY "Admins can send messages" ON public.chat_messages FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update messages" ON public.chat_messages;
CREATE POLICY "Admins can update messages" ON public.chat_messages FOR UPDATE USING (public.is_admin(auth.uid()));

-- ── 7. Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON public.chat_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_unread ON public.chat_messages(conversation_id, read_by_admin) WHERE read_by_admin = false;

-- ── 8. Enable Realtime ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='chat_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- ── 9. Update trial period to 7 days ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  signup_order_value INTEGER;
  trial_days INTEGER;
  trial_end TIMESTAMP WITH TIME ZONE;
  campaign_limit_value INTEGER;
  referral_code_value TEXT;
  referrer_user_id UUID;
BEGIN
  SELECT COALESCE(MAX(signup_order), 0) + 1 INTO signup_order_value FROM public.trial_tracking;
  INSERT INTO public.trial_tracking (signup_order) VALUES (signup_order_value);
  trial_days := 7;
  IF signup_order_value <= 30 THEN campaign_limit_value := 10;
  ELSE campaign_limit_value := 3;
  END IF;
  trial_end := NOW() + (trial_days || ' days')::INTERVAL;
  referral_code_value := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  referrer_user_id := NULL;
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT p.user_id INTO referrer_user_id FROM public.profiles p
    WHERE p.referral_code = UPPER(NEW.raw_user_meta_data->>'referral_code');
  END IF;
  INSERT INTO public.profiles (user_id, full_name, email, phone, referral_code, referred_by)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','User'), NEW.email,
    NEW.raw_user_meta_data->>'phone', referral_code_value, referrer_user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    referral_code = COALESCE(profiles.referral_code, referral_code_value),
    phone = COALESCE(profiles.phone, NEW.raw_user_meta_data->>'phone');
  IF referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
    VALUES (referrer_user_id, NEW.id, UPPER(NEW.raw_user_meta_data->>'referral_code'), 'pending')
    ON CONFLICT (referred_id) DO NOTHING;
  END IF;
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at, credits, campaign_limit, last_daily_credit)
  VALUES (NEW.id, 'trial', trial_end, 5, campaign_limit_value, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_settings (user_id, sender_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','Your Name'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ── 10. Performance indexes ───────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
    CREATE INDEX IF NOT EXISTS idx_subs_user_status ON public.subscriptions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_subs_trial ON public.subscriptions(trial_ends_at) WHERE status='trial';
  END IF;
END $$;

-- ── 11. AutoPilot multi-campaign support ─────────────────────────
-- Adds 'name' column, removes UNIQUE user_id constraint, adds 5-campaign limit trigger

ALTER TABLE public.autopilot_configs
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Campaign 1';

ALTER TABLE public.autopilot_configs
  DROP CONSTRAINT IF EXISTS autopilot_configs_user_id_key;

CREATE INDEX IF NOT EXISTS idx_autopilot_configs_user_id ON public.autopilot_configs(user_id);

CREATE OR REPLACE FUNCTION public.check_autopilot_campaign_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.autopilot_configs WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 AutoPilot campaigns allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_autopilot_limit ON public.autopilot_configs;
CREATE TRIGGER enforce_autopilot_limit
  BEFORE INSERT ON public.autopilot_configs
  FOR EACH ROW EXECUTE FUNCTION public.check_autopilot_campaign_limit();

ALTER TABLE public.autopilot_sessions
  ADD COLUMN IF NOT EXISTS config_id uuid REFERENCES public.autopilot_configs(id) ON DELETE CASCADE;

ALTER TABLE public.autopilot_activity
  ADD COLUMN IF NOT EXISTS config_id uuid REFERENCES public.autopilot_configs(id) ON DELETE CASCADE;
