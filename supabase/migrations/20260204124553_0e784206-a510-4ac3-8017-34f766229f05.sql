-- Add Calendly URL to user settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS calendly_url text;