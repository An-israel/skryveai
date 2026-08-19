-- The audit found a second, fully-built learning system (learning_paths /
-- learning_modules / learning_lessons / learning_assignments / user_learning
-- / learning_submissions / coach_messages / learning_achievements) with no
-- route in the app ever rendering it. It turned out to be the codebase's own
-- deprecated predecessor: the migration that created the live courses/
-- enrollments/certificates schema literally comments "SECTION 5 — LEARNING
-- (new tables, separate from legacy learning_*)". The live system already
-- has payment/enrollment gating (CRIT-4), quizzes, and certificates that
-- this legacy schema never had. Dropping it rather than leaving it to rot —
-- its edge functions, its admin CMS (SkillsManager), and its dashboard
-- components were all removed from the frontend in the same change.
DROP FUNCTION IF EXISTS public.award_learning_achievement(uuid, uuid, text, text, text, text);

DROP TABLE IF EXISTS public.learning_achievements CASCADE;
DROP TABLE IF EXISTS public.coach_messages CASCADE;
DROP TABLE IF EXISTS public.learning_submissions CASCADE;
DROP TABLE IF EXISTS public.user_learning CASCADE;
DROP TABLE IF EXISTS public.learning_assignments CASCADE;
DROP TABLE IF EXISTS public.learning_lessons CASCADE;
DROP TABLE IF EXISTS public.learning_modules CASCADE;
DROP TABLE IF EXISTS public.learning_paths CASCADE;

DELETE FROM storage.objects WHERE bucket_id = 'learning-submissions';
DELETE FROM storage.buckets WHERE id = 'learning-submissions';
DROP POLICY IF EXISTS "Users upload own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all submission files" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own learning submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users view own learning submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users update own learning submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own learning submissions" ON storage.objects;
