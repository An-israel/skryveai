-- CV Upload & Auto-Profile (Build Spec Feature 1).
-- Users upload an existing CV; the parse-cv edge function extracts the text and
-- turns it into structured JSON, which auto-fills an editable review screen. On
-- confirm, the client writes talent_profiles + work_experience + education. The
-- original file + raw text + parsed JSON are kept as the user's "master CV".

-- ── Master CV (one per user; re-upload replaces via upsert on user_id) ────────
CREATE TABLE IF NOT EXISTS public.master_cvs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url    text,                 -- storage path in the private cv-uploads bucket
  file_name   text,
  raw_text    text,                 -- extracted plain text
  parsed_json jsonb,                -- structured data the AI pulled out
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Structured work history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_experience (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company     text,
  role        text,
  start_date  text,                 -- free-form ("Jan 2020"); CVs rarely give clean dates
  end_date    text,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_experience_user ON public.work_experience(user_id, sort_order);

-- ── Structured education ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution   text,
  qualification text,
  year          text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_education_user ON public.education(user_id, sort_order);

-- talent_profiles already holds full_name, bio, location, secondary_skills (skills),
-- social_links (links) and tagline (headline). Add years_experience for the parser.
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS years_experience integer;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS headline text;

-- ── RLS: strictly owner-only on all three ────────────────────────────────────
ALTER TABLE public.master_cvs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_cvs_own ON public.master_cvs;
CREATE POLICY master_cvs_own ON public.master_cvs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS work_experience_own ON public.work_experience;
CREATE POLICY work_experience_own ON public.work_experience FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS education_own ON public.education;
CREATE POLICY education_own ON public.education FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Private storage bucket for the uploaded CV files ─────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('cv-uploads', 'cv-uploads', false)
  ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Owner-only access: files live under "<uid>/..." so the first path segment
-- must match the caller. Service role (the parse-cv function) bypasses RLS.
DROP POLICY IF EXISTS cv_uploads_owner_read ON storage.objects;
CREATE POLICY cv_uploads_owner_read ON storage.objects FOR SELECT
  USING (bucket_id = 'cv-uploads' AND owner = auth.uid());
DROP POLICY IF EXISTS cv_uploads_owner_insert ON storage.objects;
CREATE POLICY cv_uploads_owner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cv-uploads' AND auth.uid() IS NOT NULL
              AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS cv_uploads_owner_update ON storage.objects;
CREATE POLICY cv_uploads_owner_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'cv-uploads' AND owner = auth.uid());
DROP POLICY IF EXISTS cv_uploads_owner_delete ON storage.objects;
CREATE POLICY cv_uploads_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'cv-uploads' AND owner = auth.uid());
