-- Add ats_score, is_public, and public_slug columns to skryve_cvs
ALTER TABLE public.skryve_cvs
  ADD COLUMN IF NOT EXISTS ats_score    int,
  ADD COLUMN IF NOT EXISTS is_public    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug  text UNIQUE;

-- Enable RLS for skryve_cvs
ALTER TABLE public.skryve_cvs ENABLE ROW LEVEL SECURITY;

-- Create ownership policy (talent can manage their own CVs)
DO $$ BEGIN
  CREATE POLICY "cv_own" ON public.skryve_cvs
    FOR ALL USING (
      auth.uid() IN (SELECT user_id FROM public.talent_profiles WHERE id = talent_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
