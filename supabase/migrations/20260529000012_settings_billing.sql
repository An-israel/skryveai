-- Notification preferences (add to talent_profiles)
ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS notif_email_jobs       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_apps        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_messages    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_offers      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_projects    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_events      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_learning    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_marketing   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_push_enabled      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_visibility      text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS who_can_message         text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS show_earnings           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS username               text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_deleted              boolean NOT NULL DEFAULT false;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan            text NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'business'
  status          text NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'past_due'
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  paystack_ref    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Billing history
CREATE TABLE IF NOT EXISTS public.billing_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        text NOT NULL,
  amount      numeric(10,2) NOT NULL,
  currency    text NOT NULL DEFAULT 'NGN',
  status      text NOT NULL DEFAULT 'paid',  -- 'paid' | 'failed' | 'refunded'
  paystack_ref text,
  invoice_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "sub_own" ON public.subscriptions   FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "bill_own" ON public.billing_history FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_user ON public.billing_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_conv_talent ON public.marketplace_conversations(talent_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_conv_client ON public.marketplace_conversations(client_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_msg_conv ON public.marketplace_messages(conversation_id, sent_at ASC);
