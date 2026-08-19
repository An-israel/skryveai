-- quiz_questions.correct_answer (and explanation) were sent to the browser
-- the moment a quiz loaded — before the learner answered — readable via
-- devtools the whole time ("qq_select_all" has no column restriction).
-- quiz_attempts also had a client-writable INSERT policy, so even fixing the
-- read side wouldn't stop someone from just inserting a fabricated "passed"
-- attempt directly. Move grading server-side entirely:
--   - quiz_questions_public exposes everything EXCEPT the answer key/explanation
--     (a view naturally enforces this at the column level, not just row level)
--   - submit_quiz_attempt() grades server-side and is the only way to write
--     quiz_attempts now; it returns per-question correct answers/explanations
--     in its response, which is safe once the attempt has actually happened

DROP POLICY IF EXISTS "qq_select_all" ON public.quiz_questions;
DO $$ BEGIN
  CREATE POLICY "qq_admin_only" ON public.quiz_questions FOR SELECT
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW public.quiz_questions_public AS
  SELECT id, quiz_id, question, question_type, options, order_index
  FROM public.quiz_questions;
GRANT SELECT ON public.quiz_questions_public TO authenticated;

DROP POLICY IF EXISTS "qa_insert_own" ON public.quiz_attempts;
-- (qa_own / SELECT stays — a learner can still read their own past attempts.)

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me              uuid := auth.uid();
  v_talent_id     uuid;
  v_pass_threshold int;
  v_total         int;
  v_correct       int;
  v_pct           int;
  v_passed        boolean;
  v_results       jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id INTO v_talent_id FROM public.talent_profiles WHERE user_id = me;
  IF v_talent_id IS NULL THEN RAISE EXCEPTION 'talent profile required'; END IF;

  SELECT pass_threshold INTO v_pass_threshold FROM public.quizzes WHERE id = _quiz_id;
  IF v_pass_threshold IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  SELECT count(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = _quiz_id;
  IF v_total = 0 THEN RAISE EXCEPTION 'quiz has no questions'; END IF;

  SELECT
    count(*) FILTER (WHERE (_answers ->> id::text) = correct_answer),
    jsonb_object_agg(id, jsonb_build_object('correct_answer', correct_answer, 'explanation', explanation))
  INTO v_correct, v_results
  FROM public.quiz_questions
  WHERE quiz_id = _quiz_id;

  v_pct := round((v_correct::numeric / v_total) * 100);
  v_passed := v_pct >= v_pass_threshold;

  INSERT INTO public.quiz_attempts (quiz_id, talent_id, score, total, passed, answers)
  VALUES (_quiz_id, v_talent_id, v_correct, v_total, v_passed, _answers);

  RETURN jsonb_build_object(
    'score', v_correct,
    'total', v_total,
    'passed', v_passed,
    'pass_threshold', v_pass_threshold,
    'results', v_results
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;
