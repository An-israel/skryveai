
-- 1. Create site_pages table for page toggle management
CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL UNIQUE,
  name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for route checks)
CREATE POLICY "Anyone can read site pages" ON public.site_pages FOR SELECT USING (true);

-- Only super admins can manage
CREATE POLICY "Super admins can manage site pages" ON public.site_pages FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed all website pages
INSERT INTO public.site_pages (route, name) VALUES
  ('/', 'Landing Page'),
  ('/login', 'Login'),
  ('/signup', 'Sign Up'),
  ('/pricing', 'Pricing'),
  ('/about', 'About'),
  ('/careers', 'Careers'),
  ('/contact', 'Contact'),
  ('/privacy-policy', 'Privacy Policy'),
  ('/terms', 'Terms of Service'),
  ('/dashboard', 'Dashboard'),
  ('/campaigns/new', 'New Campaign'),
  ('/analytics', 'Analytics'),
  ('/settings', 'Settings'),
  ('/referrals', 'Referrals'),
  ('/team', 'Team Management'),
  ('/forgot-password', 'Forgot Password'),
  ('/reset-password', 'Reset Password');

-- 2. Fix staff_reports RLS - only super_admin can view all reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.staff_reports;
CREATE POLICY "Super admins can view all reports" ON public.staff_reports FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Add confirmation_reminder_sent to profiles for tracking reminder emails
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS confirmation_reminder_sent boolean DEFAULT false;
