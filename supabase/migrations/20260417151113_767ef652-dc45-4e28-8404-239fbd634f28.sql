-- Email finder single search history
CREATE TABLE public.email_finder_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  first_name TEXT,
  last_name TEXT,
  domain TEXT,
  company TEXT,
  found_email TEXT,
  confidence INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  sources JSONB DEFAULT '[]'::jsonb,
  verification JSONB DEFAULT '{}'::jsonb,
  job_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_finder_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own searches" ON public.email_finder_searches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own searches" ON public.email_finder_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own searches" ON public.email_finder_searches
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all searches" ON public.email_finder_searches
  FOR SELECT USING (is_admin(auth.uid()));

CREATE INDEX idx_email_finder_searches_user ON public.email_finder_searches(user_id, created_at DESC);

-- Bulk jobs
CREATE TABLE public.email_finder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  found_count INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  input_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.email_finder_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own jobs" ON public.email_finder_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own jobs" ON public.email_finder_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own jobs" ON public.email_finder_jobs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own jobs" ON public.email_finder_jobs
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all jobs" ON public.email_finder_jobs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE INDEX idx_email_finder_jobs_user ON public.email_finder_jobs(user_id, created_at DESC);
CREATE INDEX idx_email_finder_jobs_status ON public.email_finder_jobs(status);

CREATE TRIGGER update_email_finder_jobs_updated_at
  BEFORE UPDATE ON public.email_finder_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global learned patterns
CREATE TABLE public.email_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  pattern TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 1,
  samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_patterns ENABLE ROW LEVEL SECURITY;

-- Globally readable to authenticated users
CREATE POLICY "Authenticated read patterns" ON public.email_patterns
  FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_email_patterns_domain ON public.email_patterns(domain);

CREATE TRIGGER update_email_patterns_updated_at
  BEFORE UPDATE ON public.email_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-business enrichment metadata
CREATE TABLE public.business_email_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  original_email TEXT,
  enriched_email TEXT,
  confidence INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  sources JSONB DEFAULT '[]'::jsonb,
  verification JSONB DEFAULT '{}'::jsonb,
  attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_email_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrichment" ON public.business_email_enrichment
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own enrichment" ON public.business_email_enrichment
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own enrichment" ON public.business_email_enrichment
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all enrichment" ON public.business_email_enrichment
  FOR SELECT USING (is_admin(auth.uid()));

CREATE INDEX idx_enrichment_business ON public.business_email_enrichment(business_id);
CREATE INDEX idx_enrichment_campaign ON public.business_email_enrichment(campaign_id);
CREATE INDEX idx_enrichment_user ON public.business_email_enrichment(user_id);

CREATE TRIGGER update_business_email_enrichment_updated_at
  BEFORE UPDATE ON public.business_email_enrichment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for jobs table so frontend can subscribe to progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_finder_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_email_enrichment;