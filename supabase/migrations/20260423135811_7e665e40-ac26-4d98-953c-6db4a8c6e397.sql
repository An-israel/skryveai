-- Storage policies for learning-submissions bucket (private, user-owned folders)
CREATE POLICY "Users upload own learning submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'learning-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users view own learning submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'learning-submissions'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "Users update own learning submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'learning-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own learning submissions"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'learning-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Helper function: idempotent achievement insert
CREATE OR REPLACE FUNCTION public.award_learning_achievement(
  _user_id uuid,
  _user_learning_id uuid,
  _achievement_type text,
  _achievement_name text,
  _achievement_description text,
  _skill_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.learning_achievements
  WHERE user_id = _user_id
    AND achievement_type = _achievement_type
    AND COALESCE(skill_name, '') = COALESCE(_skill_name, '')
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO public.learning_achievements (
    user_id, user_learning_id, achievement_type, achievement_name,
    achievement_description, skill_name
  )
  VALUES (
    _user_id, _user_learning_id, _achievement_type, _achievement_name,
    _achievement_description, _skill_name
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;