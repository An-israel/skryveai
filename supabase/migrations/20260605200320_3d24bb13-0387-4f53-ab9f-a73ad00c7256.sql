
-- 1. Fix tautology in course_lessons policy
DROP POLICY IF EXISTS cl_select_enrolled ON public.course_lessons;
CREATE POLICY cl_select_enrolled ON public.course_lessons
FOR SELECT
USING (
  is_free_preview = true
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = course_lessons.course_id
      AND EXISTS (
        SELECT 1 FROM public.talent_profiles t
        WHERE t.id = e.talent_id AND t.user_id = auth.uid()
      )
  )
);

-- 2. Restrict push_config to service role only (edge functions use service role key)
DROP POLICY IF EXISTS "Authenticated users can read push config" ON public.push_config;

-- 3. Restrict email_patterns reads to admins only
DROP POLICY IF EXISTS "Authenticated read patterns" ON public.email_patterns;
CREATE POLICY "Admins read patterns" ON public.email_patterns
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 4. Restrict referrals INSERT to admins only
DROP POLICY IF EXISTS "Admins can insert referrals" ON public.referrals;
CREATE POLICY "Admins can insert referrals" ON public.referrals
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));
