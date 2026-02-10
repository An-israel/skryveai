
-- Table to track follow-up sequences for opened emails
CREATE TABLE public.email_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  followup_number INTEGER NOT NULL CHECK (followup_number BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'skipped', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email_id, followup_number)
);

-- Enable RLS
ALTER TABLE public.email_followups ENABLE ROW LEVEL SECURITY;

-- Users can view their own follow-ups
CREATE POLICY "Users can view own followups"
  ON public.email_followups FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles inserts/updates (edge function uses service key)
CREATE POLICY "Service role manages followups"
  ON public.email_followups FOR ALL
  USING (auth.uid() = user_id);

-- Index for efficient cron lookups
CREATE INDEX idx_followups_scheduled ON public.email_followups(status, scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_followups_email ON public.email_followups(email_id);

-- Enable realtime for follow-up tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_followups;
