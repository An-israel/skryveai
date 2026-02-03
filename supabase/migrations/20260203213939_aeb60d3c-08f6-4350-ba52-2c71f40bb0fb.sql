-- Create table to track signup IP addresses
CREATE TABLE public.signup_ips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;

-- Only super admins can view signup IPs (for auditing)
CREATE POLICY "Super admins can view signup IPs"
  ON public.signup_ips
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for fast IP lookups
CREATE INDEX idx_signup_ips_ip_address ON public.signup_ips(ip_address);

-- Add ip_address column to profiles for reference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_ip text;