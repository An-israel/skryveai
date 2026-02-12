
-- Allow admins to view all campaigns
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all businesses
CREATE POLICY "Admins can view all businesses"
ON public.businesses
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all emails
CREATE POLICY "Admins can view all emails"
ON public.emails
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all pitches
CREATE POLICY "Admins can view all pitches"
ON public.pitches
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all email queue items
CREATE POLICY "Admins can view all email queue"
ON public.email_queue
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all email followups
CREATE POLICY "Admins can view all email followups"
ON public.email_followups
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all website analyses
CREATE POLICY "Admins can view all website analyses"
ON public.website_analyses
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all user settings
CREATE POLICY "Admins can view all user settings"
ON public.user_settings
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all gmail tokens (metadata only, for debugging)
CREATE POLICY "Admins can view all gmail tokens"
ON public.gmail_tokens
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all smtp credentials
CREATE POLICY "Admins can view all smtp credentials"
ON public.smtp_credentials
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all teams
CREATE POLICY "Admins can view all teams"
ON public.teams
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all team members
CREATE POLICY "Admins can view all team members"
ON public.team_members
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all team profiles
CREATE POLICY "Admins can view all team profiles"
ON public.team_profiles
FOR SELECT
USING (is_admin(auth.uid()));
