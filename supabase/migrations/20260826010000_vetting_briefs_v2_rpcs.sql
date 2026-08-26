-- Wire the new test_briefs / skill_submissions columns (added in
-- 20260826000000_vetting_task_briefs_v2.sql) through the admin RPCs, and let
-- a reviewer persist which reviewer_checklist items they actually confirmed
-- on a submission, instead of only a pass/fail.

-- List every brief (incl. inactive) for the admin editor — now with the
-- richer fields (submit format, resources, hands-on time, deadline window,
-- reviewer checklist).
CREATE OR REPLACE FUNCTION public.vetting_briefs_all()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.skill_category), '[]'::jsonb)
    FROM (
      SELECT id, skill_category, title, brief, reference_template_url, pass_criteria, is_active,
             submit_format, resources, hands_on_time, submit_within_days, reviewer_checklist
      FROM public.test_briefs
    ) b
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_briefs_all() TO authenticated;

-- Create or update a brief. Old 7-arg signature dropped and replaced with the
-- full set so a stale client call fails loudly instead of silently dropping
-- the new fields.
DROP FUNCTION IF EXISTS public.vetting_brief_upsert(uuid, text, text, text, text, text, boolean);

CREATE FUNCTION public.vetting_brief_upsert(
  _id uuid, _skill_category text, _title text, _brief text,
  _reference_template_url text, _pass_criteria text, _is_active boolean,
  _submit_format text DEFAULT NULL, _resources text DEFAULT NULL, _hands_on_time text DEFAULT NULL,
  _submit_within_days integer DEFAULT 2, _reviewer_checklist jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); v_id uuid;
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _skill_category IS NULL OR length(trim(_skill_category)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'skill_required');
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.test_briefs (
      skill_category, title, brief, reference_template_url, pass_criteria, is_active,
      submit_format, resources, hands_on_time, submit_within_days, reviewer_checklist
    ) VALUES (
      _skill_category, COALESCE(_title, _skill_category || ' test'), COALESCE(_brief, ''),
      _reference_template_url, _pass_criteria, COALESCE(_is_active, true),
      _submit_format, _resources, _hands_on_time, COALESCE(_submit_within_days, 2),
      COALESCE(_reviewer_checklist, '[]'::jsonb)
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.test_briefs SET
      skill_category = _skill_category, title = COALESCE(_title, title), brief = COALESCE(_brief, brief),
      reference_template_url = _reference_template_url, pass_criteria = _pass_criteria,
      is_active = COALESCE(_is_active, is_active),
      submit_format = _submit_format, resources = _resources, hands_on_time = _hands_on_time,
      submit_within_days = COALESCE(_submit_within_days, submit_within_days),
      reviewer_checklist = COALESCE(_reviewer_checklist, reviewer_checklist)
     WHERE id = _id RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_brief_upsert(uuid, text, text, text, text, text, boolean, text, text, text, integer, jsonb) TO authenticated;

-- Review a skill submission, now also recording which reviewer_checklist
-- items were confirmed (a per-submission audit trail, not just a gut call).
DROP FUNCTION IF EXISTS public.vetting_review_skill(uuid, integer, boolean, text);

CREATE FUNCTION public.vetting_review_skill(
  _submission_id uuid, _score integer, _pass boolean, _notes text DEFAULT NULL,
  _checklist_results jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); sub public.skill_submissions; app_id uuid;
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO sub FROM public.skill_submissions WHERE id = _submission_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  app_id := sub.application_id;

  UPDATE public.skill_submissions SET
    score = _score, reviewer_notes = _notes, reviewed_by = me,
    checklist_results = COALESCE(_checklist_results, checklist_results)
   WHERE id = _submission_id;

  IF _pass THEN
    UPDATE public.vetting_applications
       SET skill_test_status = 'passed', status = 'prof_pending', updated_at = now()
     WHERE id = app_id;
  ELSE
    UPDATE public.vetting_applications
       SET skill_test_status = 'failed', status = 'rejected', overall_result = 'rejected',
           reviewed_by = me, reviewed_at = now(), retry_after = now() + interval '14 days', updated_at = now()
     WHERE id = app_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'passed', _pass);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_review_skill(uuid, integer, boolean, text, jsonb) TO authenticated;
