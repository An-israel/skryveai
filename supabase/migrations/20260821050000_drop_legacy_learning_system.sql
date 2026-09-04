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

-- Supabase's hosted Postgres blocks direct DML on storage.objects/buckets
-- from migrations ("Direct deletion from storage tables is not allowed. Use
-- the Storage API instead.", SQLSTATE 42501) — this isn't a permission we
-- can grant ourselves. The learning-submissions bucket and its files are
-- orphaned now that the tables referencing them are gone; clean it up
-- separately via the dashboard (Storage → learning-submissions → delete) or
-- the Storage API, not SQL. Only the policies (regular Postgres RLS policy
-- objects, not storage-managed rows) can be dropped here.
DROP POLICY IF EXISTS "Users upload own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all submission files" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own learning submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users view own learning submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users update own learning submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own learning submissions" ON storage.objects;
