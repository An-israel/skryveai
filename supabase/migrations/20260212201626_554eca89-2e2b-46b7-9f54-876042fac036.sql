
-- Update handle_new_user to store phone from metadata
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
  
  trial_days := 3;
  
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
