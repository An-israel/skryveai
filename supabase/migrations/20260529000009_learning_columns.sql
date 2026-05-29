-- courses: add missing columns
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_featured        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS what_you_will_learn text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instructor_name    text,
  ADD COLUMN IF NOT EXISTS instructor_bio     text,
  ADD COLUMN IF NOT EXISTS instructor_photo_url text,
  ADD COLUMN IF NOT EXISTS review_count       int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags               text[] NOT NULL DEFAULT '{}';

-- course_lessons: add notes support
ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS content_body  text,
  ADD COLUMN IF NOT EXISTS attachments   jsonb  NOT NULL DEFAULT '[]';

-- lesson_progress: add notes + watch tracking
ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS notes         text,
  ADD COLUMN IF NOT EXISTS watch_percent int NOT NULL DEFAULT 0;

-- course_reviews table
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id  uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  talent_id  uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  rating     int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, talent_id)
);
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cr_select_all" ON public.course_reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cr_insert_own" ON public.course_reviews FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.talent_profiles WHERE id = talent_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id);
