
-- ============= Learning Paths =============
CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  total_modules INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  estimated_weeks INTEGER DEFAULT 6,
  difficulty_level TEXT DEFAULT 'beginner',
  is_active BOOLEAN NOT NULL DEFAULT true,
  icon_url TEXT,
  cover_image_url TEXT,
  popular_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active learning paths"
  ON public.learning_paths FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active = true OR public.is_admin(auth.uid())));

CREATE POLICY "Admins manage learning paths"
  ON public.learning_paths FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'));

-- ============= Modules =============
CREATE TABLE public.learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours INTEGER DEFAULT 8,
  unlock_level INTEGER DEFAULT 1,
  order_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(learning_path_id, module_number)
);

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view modules"
  ON public.learning_modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage modules"
  ON public.learning_modules FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'));

CREATE INDEX idx_learning_modules_path ON public.learning_modules(learning_path_id);

-- ============= Lessons =============
CREATE TABLE public.learning_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video',
  content_url TEXT,
  content_text TEXT,
  estimated_minutes INTEGER DEFAULT 20,
  credits_cost NUMERIC(10,2) DEFAULT 0.3,
  required_for_next BOOLEAN DEFAULT true,
  has_assignment BOOLEAN DEFAULT false,
  order_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_id, lesson_number)
);

ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view lessons"
  ON public.learning_lessons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage lessons"
  ON public.learning_lessons FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'));

CREATE INDEX idx_learning_lessons_module ON public.learning_lessons(module_id);
CREATE INDEX idx_learning_lessons_path ON public.learning_lessons(learning_path_id);

-- ============= Assignments =============
CREATE TABLE public.learning_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  submission_type TEXT NOT NULL DEFAULT 'text',
  passing_criteria TEXT,
  max_revisions INTEGER DEFAULT 3,
  due_after_hours INTEGER DEFAULT 72,
  credits_cost NUMERIC(10,2) DEFAULT 0.5,
  example_solution_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view assignments"
  ON public.learning_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage assignments"
  ON public.learning_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'content_editor'));

CREATE INDEX idx_learning_assignments_lesson ON public.learning_assignments(lesson_id);

-- ============= User Learning =============
CREATE TABLE public.user_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_module INTEGER NOT NULL DEFAULT 1,
  current_lesson INTEGER NOT NULL DEFAULT 1,
  completed_lesson_ids UUID[] DEFAULT '{}',
  completed_lessons INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_time_minutes INTEGER NOT NULL DEFAULT 0,
  coach_tone TEXT NOT NULL DEFAULT 'lenient',
  learning_pace TEXT DEFAULT '2hr/day',
  target_completion_date DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, learning_path_id)
);

ALTER TABLE public.user_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own learning"
  ON public.user_learning FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all learning"
  ON public.user_learning FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users insert own learning"
  ON public.user_learning FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own learning"
  ON public.user_learning FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own learning"
  ON public.user_learning FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_learning_user ON public.user_learning(user_id);
CREATE INDEX idx_user_learning_path ON public.user_learning(learning_path_id);

-- ============= Submissions =============
CREATE TABLE public.learning_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assignment_id UUID NOT NULL REFERENCES public.learning_assignments(id) ON DELETE CASCADE,
  user_learning_id UUID REFERENCES public.user_learning(id) ON DELETE SET NULL,
  submission_data TEXT,
  submission_url TEXT,
  file_path TEXT,
  ai_feedback TEXT,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  revision_count INTEGER NOT NULL DEFAULT 0,
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  passed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions"
  ON public.learning_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all submissions"
  ON public.learning_submissions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users insert own submissions"
  ON public.learning_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own submissions"
  ON public.learning_submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_learning_submissions_user ON public.learning_submissions(user_id);
CREATE INDEX idx_learning_submissions_assignment ON public.learning_submissions(assignment_id);

-- ============= Coach Messages =============
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_learning_id UUID REFERENCES public.user_learning(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'chat',
  message_text TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  credits_used NUMERIC(10,2) DEFAULT 0.1,
  sent_by TEXT NOT NULL DEFAULT 'coach',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_read BOOLEAN NOT NULL DEFAULT false,
  user_replied BOOLEAN NOT NULL DEFAULT false,
  is_proactive BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own coach messages"
  ON public.coach_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own coach messages"
  ON public.coach_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own coach messages"
  ON public.coach_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_coach_messages_user ON public.coach_messages(user_id);
CREATE INDEX idx_coach_messages_learning ON public.coach_messages(user_learning_id);

-- ============= Achievements =============
CREATE TABLE public.learning_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_learning_id UUID REFERENCES public.user_learning(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT,
  achievement_description TEXT,
  badge_image_url TEXT,
  skill_name TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements"
  ON public.learning_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own achievements"
  ON public.learning_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_learning_achievements_user ON public.learning_achievements(user_id);

-- ============= Triggers =============
CREATE TRIGGER trg_learning_paths_updated
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_learning_updated
  BEFORE UPDATE ON public.user_learning
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= Storage Bucket =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-submissions', 'learning-submissions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own submission files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'learning-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own submission files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'learning-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own submission files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'learning-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all submission files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'learning-submissions'
    AND public.is_admin(auth.uid())
  );
