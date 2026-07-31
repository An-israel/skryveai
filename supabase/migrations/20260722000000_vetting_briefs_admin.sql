-- Admin management of vetting test briefs, so the owner can attach the actual
-- reference template (Figma/Drive link) candidates recreate, and edit brief copy
-- per skill without a code change. Answers "how do they get a template?" — the
-- admin sets reference_template_url and it shows as a button in the skill test.

-- List every brief (incl. inactive) for the admin editor.
CREATE OR REPLACE FUNCTION public.vetting_briefs_all()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.skill_category), '[]'::jsonb)
    FROM (
      SELECT id, skill_category, title, brief, reference_template_url, pass_criteria, is_active
      FROM public.test_briefs
    ) b
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_briefs_all() TO authenticated;

-- Create or update a brief.
CREATE OR REPLACE FUNCTION public.vetting_brief_upsert(
  _id uuid, _skill_category text, _title text, _brief text,
  _reference_template_url text, _pass_criteria text, _is_active boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); v_id uuid;
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _skill_category IS NULL OR length(trim(_skill_category)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'skill_required');
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.test_briefs (skill_category, title, brief, reference_template_url, pass_criteria, is_active)
      VALUES (_skill_category, COALESCE(_title, _skill_category || ' test'), COALESCE(_brief, ''),
              _reference_template_url, _pass_criteria, COALESCE(_is_active, true))
      RETURNING id INTO v_id;
  ELSE
    UPDATE public.test_briefs SET
      skill_category = _skill_category, title = COALESCE(_title, title), brief = COALESCE(_brief, brief),
      reference_template_url = _reference_template_url, pass_criteria = _pass_criteria,
      is_active = COALESCE(_is_active, is_active)
     WHERE id = _id RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_brief_upsert(uuid, text, text, text, text, text, boolean) TO authenticated;
