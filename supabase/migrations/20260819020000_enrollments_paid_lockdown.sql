-- LearnPath.tsx's paid-enrollment flow ran a Paystack popup entirely client-side
-- and, on its own success callback, inserted the enrollment as payment_status
-- 'paid' directly — the client always had write access via "enr_own" (FOR ALL,
-- no WITH CHECK), so any signed-in user could grant themselves a free paid
-- enrollment from the browser console regardless of the app bug. Payment is now
-- verified server-side by verify-course-payment (service role, bypasses RLS).
-- Split "enr_own" so the client can only ever self-insert into a FREE course;
-- paid enrollments can only be written by the service role.

DROP POLICY IF EXISTS "enr_own" ON public.enrollments;

DO $$ BEGIN
  CREATE POLICY "enr_select_own" ON public.enrollments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "enr_insert_free_course" ON public.enrollments FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.price = 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "enr_update_own" ON public.enrollments FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "enr_delete_own" ON public.enrollments FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.id = talent_id AND t.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
