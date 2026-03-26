
CREATE TABLE public.admin_email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email_id UUID NOT NULL REFERENCES public.admin_emails(id) ON DELETE CASCADE,
  logged_by UUID NOT NULL,
  reply_content TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_email_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin email replies"
  ON public.admin_email_replies FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin email replies"
  ON public.admin_email_replies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin email replies"
  ON public.admin_email_replies FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_admin(auth.uid()));
