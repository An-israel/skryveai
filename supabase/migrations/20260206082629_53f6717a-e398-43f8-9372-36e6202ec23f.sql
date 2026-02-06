-- Add warmup fields to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS warmup_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS warmup_start_volume integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS warmup_daily_increase integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS warmup_started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emails_sent_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_send_date date DEFAULT NULL;