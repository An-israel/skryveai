-- Certificates had a SELECT-only policy scoped to the owning learner:
--  - No INSERT/UPDATE policy existed at all, so every code path that tries to
--    issue one (course completion, the completion page, the certificate-claim
--    page) was silently denied by RLS — the "Claim Your Certificate" page
--    rendered permanently blank for every learner.
--  - The SELECT policy being owner-only also defeated the point of public
--    verification: CertificateVerify.tsx is meant to let anyone (a recruiter,
--    not just the certificate holder) confirm a certificate is real, but could
--    only ever read the visiting user's own certificates.
-- Certificates carry no sensitive data (id/course/talent/issued_at/url) — a
-- verification link is supposed to be shareable, so make reads public and
-- scope writes to the owning learner (mirrors "enr_own"-style ownership checks
-- used elsewhere).

DROP POLICY IF EXISTS "cert_own" ON public.certificates;

DO $$ BEGIN
  CREATE POLICY "cert_select_public" ON public.certificates FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cert_insert_own" ON public.certificates FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cert_update_own" ON public.certificates FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
