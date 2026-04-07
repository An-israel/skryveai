
-- ─── Chat Tables ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'open',
  unread_by_admin integer NOT NULL DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  message text NOT NULL,
  read_by_admin boolean DEFAULT false,
  read_by_user boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_conversations policies
DROP POLICY IF EXISTS "Users can view own conversation" ON public.chat_conversations;
CREATE POLICY "Users can view own conversation"
  ON public.chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversation" ON public.chat_conversations;
CREATE POLICY "Users can create own conversation"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation" ON public.chat_conversations;
CREATE POLICY "Users can update own conversation"
  ON public.chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can view all conversations"
  ON public.chat_conversations FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can update all conversations"
  ON public.chat_conversations FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- chat_messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can mark messages read" ON public.chat_messages;
CREATE POLICY "Users can mark messages read"
  ON public.chat_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can send messages" ON public.chat_messages;
CREATE POLICY "Admins can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all messages" ON public.chat_messages;
CREATE POLICY "Admins can update all messages"
  ON public.chat_messages FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ─── Enable Realtime ─────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ─── Update trial period to 7 days ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  
  IF signup_order_value <= 30 THEN
    campaign_limit_value := 10;
  ELSE
    campaign_limit_value := 3;
  END IF;
  
  trial_end := NOW() + (trial_days || ' days')::INTERVAL;
  
  referral_code_value := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  
  referrer_user_id := NULL;
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT p.user_id INTO referrer_user_id
    FROM public.profiles p
    WHERE p.referral_code = UPPER(NEW.raw_user_meta_data->>'referral_code');
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name, email, phone, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    referral_code_value,
    referrer_user_id
  )
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
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Your Name'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Performance Indexes for 2000+ users ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_emails_campaign_id ON public.emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(status);
CREATE INDEX IF NOT EXISTS idx_businesses_campaign_id ON public.businesses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON public.businesses(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON public.email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON public.tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON public.tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pitches_business_id ON public.pitches(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(conversation_id, read_by_admin) WHERE read_by_admin = false;
CREATE INDEX IF NOT EXISTS idx_autopilot_configs_user_id ON public.autopilot_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_contacted_businesses_user ON public.contacted_businesses(user_id, domain);
