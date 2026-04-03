-- Fix: Add SECURITY DEFINER + exception handling so signup trigger never blocks user creation
CREATE OR REPLACE FUNCTION initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, status, plan, trial_ends_at)
  VALUES (NEW.id, 'trial', 'free', NOW() + INTERVAL '3 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credits (user_id, total_credits, used_credits)
  VALUES (NEW.id, 10, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.email_settings (user_id, provider, from_name, from_email)
  VALUES (NEW.id, 'resend', NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Never block signup even if something goes wrong
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
