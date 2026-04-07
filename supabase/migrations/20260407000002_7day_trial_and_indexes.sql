-- ─── 1. Update trial period from 3 days to 7 days ────────────────────────────

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

  trial_days := 7;  -- 7-day free trial

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

-- ─── 2. Performance indexes for 2,000+ active users ──────────────────────────
-- Each block checks if the table exists before creating the index so this
-- migration is safe to run regardless of which tables are present.

DO $$ BEGIN
  -- profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
  END IF;

  -- subscriptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends
      ON public.subscriptions(trial_ends_at) WHERE status = 'trial';
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
      ON public.subscriptions(user_id, status);
  END IF;

  -- campaigns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='campaigns') THEN
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_created
      ON public.campaigns(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_status
      ON public.campaigns(user_id, status, created_at DESC);
  END IF;

  -- emails
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='emails') THEN
    CREATE INDEX IF NOT EXISTS idx_emails_campaign_created
      ON public.emails(campaign_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_emails_user_created
      ON public.emails(user_id, created_at DESC);
  END IF;

  -- activity_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_log') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_created
      ON public.activity_log(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_log_action
      ON public.activity_log(action, created_at DESC);
  END IF;

  -- tool_usage
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tool_usage') THEN
    CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool
      ON public.tool_usage(user_id, tool_name, created_at DESC);
  END IF;

  -- chat tables (should exist after previous migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_conversations') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id
      ON public.chat_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_status_time
      ON public.chat_conversations(status, last_message_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_time
      ON public.chat_messages(conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_admin
      ON public.chat_messages(conversation_id, read_by_admin) WHERE read_by_admin = false;
  END IF;
END $$;
