
-- Fix activity log: only allow users to log their own activity
DROP POLICY "All authenticated users can insert activity" ON public.activity_log;

CREATE POLICY "Users can log their own activity"
ON public.activity_log
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id = auth.uid() OR user_id IS NULL)
);
