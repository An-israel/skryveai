
-- Update referral commission rate default from 0.20 to 0.40
ALTER TABLE public.referrals ALTER COLUMN commission_rate SET DEFAULT 0.40;

-- Update existing pending referrals to 40%
UPDATE public.referrals SET commission_rate = 0.40 WHERE status = 'pending';

-- Add last_active_at to profiles for activity tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Index for fast inactive user queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles (last_active_at);
