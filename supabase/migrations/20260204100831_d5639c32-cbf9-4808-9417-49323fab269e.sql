-- Add credits column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_credit timestamp with time zone;

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, completed, paid
  commission_rate numeric NOT NULL DEFAULT 0.20, -- 20% default
  commission_amount integer DEFAULT 0,
  commission_currency text DEFAULT 'NGN',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  paid_at timestamp with time zone,
  UNIQUE(referred_id)
);

-- Create referral_codes table for users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Add campaign limit to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS campaign_limit integer;

-- Add staff role to user_roles enum (if not exists)
-- First check and add to enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'staff' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() IS NOT NULL AND (referrer_id = auth.uid() OR referred_id = auth.uid()));

CREATE POLICY "Admins can view all referrals"
ON public.referrals FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update referrals"
ON public.referrals FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update handle_new_user function to include credits and campaign limits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  signup_order_value INTEGER;
  trial_days INTEGER;
  trial_end TIMESTAMP WITH TIME ZONE;
  campaign_limit_value INTEGER;
  referral_code_value TEXT;
  referrer_user_id UUID;
BEGIN
  -- Get signup order for trial duration
  SELECT COALESCE(MAX(signup_order), 0) + 1 INTO signup_order_value FROM public.trial_tracking;
  INSERT INTO public.trial_tracking (signup_order) VALUES (signup_order_value);
  
  -- All users get 3 days trial now
  trial_days := 3;
  
  -- First 30 users get 10 campaigns, others get 3
  IF signup_order_value <= 30 THEN
    campaign_limit_value := 10;
  ELSE
    campaign_limit_value := 3;
  END IF;
  
  trial_end := NOW() + (trial_days || ' days')::INTERVAL;
  
  -- Generate unique referral code
  referral_code_value := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  
  -- Check if user was referred
  referrer_user_id := NULL;
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT p.user_id INTO referrer_user_id
    FROM public.profiles p
    WHERE p.referral_code = UPPER(NEW.raw_user_meta_data->>'referral_code');
  END IF;
  
  -- Create profile with referral code
  INSERT INTO public.profiles (user_id, full_name, email, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    referral_code_value,
    referrer_user_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    referral_code = COALESCE(profiles.referral_code, referral_code_value);
  
  -- Create referral record if referred
  IF referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
    VALUES (referrer_user_id, NEW.id, UPPER(NEW.raw_user_meta_data->>'referral_code'), 'pending')
    ON CONFLICT (referred_id) DO NOTHING;
  END IF;
  
  -- Create subscription with trial, credits, and campaign limit
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at, credits, campaign_limit, last_daily_credit)
  VALUES (NEW.id, 'trial', trial_end, 5, campaign_limit_value, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default user settings
  INSERT INTO public.user_settings (user_id, sender_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Your Name'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create function to add daily credits
CREATE OR REPLACE FUNCTION public.add_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.subscriptions
  SET 
    credits = credits + 5,
    last_daily_credit = NOW()
  WHERE last_daily_credit IS NULL 
    OR last_daily_credit < NOW() - INTERVAL '24 hours';
END;
$function$;