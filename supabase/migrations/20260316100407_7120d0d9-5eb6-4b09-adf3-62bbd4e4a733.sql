
-- Add opened_at tracking column to admin_emails
ALTER TABLE public.admin_emails ADD COLUMN IF NOT EXISTS opened_at timestamp with time zone DEFAULT NULL;

-- Add resend_id column to track the Resend email ID for tracking
ALTER TABLE public.admin_emails ADD COLUMN IF NOT EXISTS resend_id text DEFAULT NULL;

-- Allow all support staff to view all admin emails (they already have admin view, but let's ensure support_agent role)
-- The existing "Admins can view all admin emails" policy uses is_admin() which includes support_agent, so we're good.
