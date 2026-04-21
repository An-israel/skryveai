
CREATE TABLE IF NOT EXISTS public.welcome_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welcome_email_log_user ON public.welcome_email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_welcome_email_log_email ON public.welcome_email_log(email);
CREATE INDEX IF NOT EXISTS idx_welcome_email_log_status ON public.welcome_email_log(status);
CREATE INDEX IF NOT EXISTS idx_welcome_email_log_created ON public.welcome_email_log(created_at DESC);

ALTER TABLE public.welcome_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view welcome email log"
  ON public.welcome_email_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own welcome email log"
  ON public.welcome_email_log FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE TRIGGER update_welcome_email_log_updated_at
  BEFORE UPDATE ON public.welcome_email_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
