-- talent_profiles never had a certifications column, but two features assume
-- it does: CertificatePage.tsx reads/writes it when a talent adds a course
-- certificate to their public profile, and CVEditor.tsx's "Import from
-- Skryve profile" reads it to pre-fill a new CV. Both have been silently
-- broken since they were written (Postgres/PostgREST rejects the query with
-- "column talent_profiles.certifications does not exist", and the callers
-- didn't surface that error) — add the column both already expect.
ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]';
