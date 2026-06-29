-- quizzes: one per module (optional, toggled per course)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_name  text NOT NULL,
  title        text NOT NULL,
  pass_threshold int NOT NULL DEFAULT 70,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- quiz_questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question       text NOT NULL,
  question_type  text NOT NULL DEFAULT 'multiple_choice', -- 'multiple_choice' | 'true_false'
  options        jsonb NOT NULL DEFAULT '[]',  -- array of option strings
  correct_answer text NOT NULL,               -- the correct option text
  explanation    text,
  order_index    int  NOT NULL DEFAULT 0
);

-- quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  talent_id   uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  score       int  NOT NULL DEFAULT 0,
  total       int  NOT NULL DEFAULT 0,
  passed      boolean NOT NULL DEFAULT false,
  answers     jsonb NOT NULL DEFAULT '{}',  -- { questionId: selectedAnswer }
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Add quiz_required flag to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS quiz_required boolean NOT NULL DEFAULT false;

-- RLS
ALTER TABLE public.quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "quiz_select_all"  ON public.quizzes        FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qq_select_all"    ON public.quiz_questions  FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qa_own"           ON public.quiz_attempts   FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.talent_profiles WHERE id = talent_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qa_insert_own"    ON public.quiz_attempts   FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.talent_profiles WHERE id = talent_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add sharing columns to certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS shared_to_profile boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quizzes_course  ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_q_quiz     ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_a_talent   ON public.quiz_attempts(quiz_id, talent_id);
