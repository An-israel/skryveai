
-- Staff reports table for weekly reporting
CREATE TABLE public.staff_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'weekly',
  report_period TEXT NOT NULL,
  role TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  highlights TEXT,
  blockers TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_reports ENABLE ROW LEVEL SECURITY;

-- Staff can view their own reports
CREATE POLICY "Staff can view own reports"
  ON public.staff_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Staff can create their own reports
CREATE POLICY "Staff can create own reports"
  ON public.staff_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Staff can update their own reports
CREATE POLICY "Staff can update own reports"
  ON public.staff_reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.staff_reports FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin email log for tracking emails sent to users from admin panel
CREATE TABLE public.admin_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_by UUID NOT NULL,
  to_email TEXT NOT NULL,
  to_user_id UUID,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Support agents can view their own sent emails
CREATE POLICY "Staff can view own sent emails"
  ON public.admin_emails FOR SELECT
  USING (auth.uid() = sent_by);

-- Support agents can create email records
CREATE POLICY "Staff can create email records"
  ON public.admin_emails FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

-- Super admins can view all admin emails
CREATE POLICY "Admins can view all admin emails"
  ON public.admin_emails FOR SELECT
  USING (is_admin(auth.uid()));
