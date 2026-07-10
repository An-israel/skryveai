-- Sonder — the overnight job-application agent.
-- It sources, scores, tailors and pre-fills applications while the user sleeps;
-- the user reviews and submits each one in-app the next morning. No browser
-- farm: Skryve jobs submit in-app, external jobs open pre-filled + tracked.

-- ── Preferences ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sonder_preferences (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active           boolean NOT NULL DEFAULT true,
  titles           text[]  NOT NULL DEFAULT '{}',   -- target roles
  locations        text[]  NOT NULL DEFAULT '{}',   -- '' or 'remote' = anywhere
  remote_only      boolean NOT NULL DEFAULT false,
  salary_min       numeric,
  industries_avoid text[]  NOT NULL DEFAULT '{}',
  work_authorization text,
  daily_limit      int     NOT NULL DEFAULT 5,      -- max prepared per run
  base_cv_id       uuid REFERENCES public.skryve_cvs(id) ON DELETE SET NULL,
  last_run_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Prepared applications queue ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sonder_applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source             text NOT NULL DEFAULT 'aggregated',  -- 'aggregated' | 'marketplace'
  aggregated_job_id  uuid REFERENCES public.aggregated_jobs(id) ON DELETE CASCADE,
  marketplace_job_id uuid REFERENCES public.job_posts(id) ON DELETE CASCADE,
  company            text,
  title              text NOT NULL,
  job_url            text,
  platform           text,
  fit_score          int  NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready','needs_review','skipped','submitted')),
  cover_letter       text,
  needs_review_reason text,
  skipped_reason     text,
  prepared_at        timestamptz NOT NULL DEFAULT now(),
  submitted_at       timestamptz,
  UNIQUE (user_id, aggregated_job_id)
);

CREATE INDEX IF NOT EXISTS idx_sonder_apps_user_status
  ON public.sonder_applications(user_id, status, fit_score DESC);

-- ── RLS: owner-only ──────────────────────────────────────────────────────────
ALTER TABLE public.sonder_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sonder_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sonder_pref_own ON public.sonder_preferences;
CREATE POLICY sonder_pref_own ON public.sonder_preferences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sonder_app_select ON public.sonder_applications;
CREATE POLICY sonder_app_select ON public.sonder_applications FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS sonder_app_update ON public.sonder_applications;
CREATE POLICY sonder_app_update ON public.sonder_applications FOR UPDATE
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS sonder_app_delete ON public.sonder_applications;
CREATE POLICY sonder_app_delete ON public.sonder_applications FOR DELETE
  USING (auth.uid() = user_id);
-- Inserts are done by the service role (the agent), which bypasses RLS.

-- ── Sonder bot identity (rendered as a bot, hidden from the directory) ───────
DO $$
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  VALUES (
    '50fde12b-0000-4000-8000-000000000002',
    'sonder@skryveai.com',
    jsonb_build_object('full_name', 'Sonder', 'role', 'talent'),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.talent_profiles (user_id, full_name, onboarding_completed, is_bot, bio)
  VALUES ('50fde12b-0000-4000-8000-000000000002', 'Sonder', true, true,
          'Your job-application agent. I apply while you sleep — you review and submit.')
  ON CONFLICT (user_id) DO UPDATE SET is_bot = true, full_name = 'Sonder';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Sonder bot setup skipped: %', SQLERRM;
END $$;
