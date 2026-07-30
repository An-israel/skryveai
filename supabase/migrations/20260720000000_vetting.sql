-- Vetting system (August Prompts 2, 3, 4). The demand-side wedge: a skill test
-- AND a professionalism/attitude check, producing a "Vetted" badge a client can
-- trust. State transitions run through SECURITY DEFINER RPCs so a talent can
-- submit work but can never mark themselves passed — only a reviewer/admin can.

-- ── Test briefs (the replicable practical test per skill) ────────────────────
CREATE TABLE IF NOT EXISTS public.test_briefs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_category        text NOT NULL,
  title                 text NOT NULL,
  brief                 text NOT NULL,
  reference_template_url text,
  pass_criteria         text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_briefs_cat ON public.test_briefs(skill_category) WHERE is_active;

-- ── Applications (the master state machine) ──────────────────────────────────
-- status: skill_pending | skill_passed | prof_pending | approved | rejected
CREATE TABLE IF NOT EXISTS public.vetting_applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_category       text NOT NULL,
  status               text NOT NULL DEFAULT 'skill_pending',
  skill_test_status    text NOT NULL DEFAULT 'not_started', -- not_started | submitted | passed | failed
  professionalism_status text NOT NULL DEFAULT 'not_started', -- not_started | submitted | passed | failed
  overall_result       text,                                 -- approved | rejected
  reviewed_by          uuid,
  reviewed_at          timestamptz,
  retry_after          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_category)
);
CREATE INDEX IF NOT EXISTS idx_vetting_apps_status ON public.vetting_applications(status, created_at);

-- ── Skill submissions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES public.vetting_applications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_url   text,
  test_brief_id   uuid REFERENCES public.test_briefs(id) ON DELETE SET NULL,
  submission_url  text,
  submission_files jsonb NOT NULL DEFAULT '[]',
  score           integer,
  reviewer_notes  text,
  reviewed_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_sub_app ON public.skill_submissions(application_id, created_at DESC);

-- ── Professionalism / attitude checks ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.professionalism_checks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id       uuid NOT NULL REFERENCES public.vetting_applications(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method               text,                    -- written | video | mixed
  answers              jsonb NOT NULL DEFAULT '{}',
  video_url            text,
  responsiveness_score integer,
  communication_score  integer,
  reliability_score    integer,
  interview_notes      text,
  result               text,                    -- pass | fail
  reviewed_by          uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prof_check_app ON public.professionalism_checks(application_id, created_at DESC);

-- ── The public trust badge ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vetting_badges (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_category text NOT NULL,
  is_vetted      boolean NOT NULL DEFAULT true,
  level          text NOT NULL DEFAULT 'vetted', -- vetted | top_vetted
  vetted_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  UNIQUE (user_id, skill_category)
);
CREATE INDEX IF NOT EXISTS idx_vetting_badges_active ON public.vetting_badges(user_id) WHERE is_vetted;

-- ── Seed test briefs for the core high-demand categories ─────────────────────
INSERT INTO public.test_briefs (skill_category, title, brief, pass_criteria)
SELECT * FROM (VALUES
  ('Graphic Design', 'Replicate & adapt a social post set',
   'We''ll share a reference template. Recreate it faithfully, then produce one on-brand variation for a different message. Submit the source file and exports.',
   'Pixel-level fidelity to the reference, correct type/spacing/colour, and a variation that keeps the brand system intact.'),
  ('UI/UX Design', 'Design a signup + empty-state screen',
   'Design a clean signup screen and one empty-state screen for a fictional product brief we provide. Submit a Figma link.',
   'Clear hierarchy, consistent spacing/components, sensible UX for errors and empty states.'),
  ('Web Development', 'Build a responsive component from a spec',
   'Build the described card/list component to match the provided design, responsive and accessible. Submit a live link (StackBlitz/CodeSandbox) + repo.',
   'Matches the design, responsive, semantic/accessible markup, clean code.'),
  ('Frontend Development', 'Build a responsive component from a spec',
   'Build the described component to match the provided design, responsive and accessible. Submit a live link + repo.',
   'Matches the design, responsive, accessible, clean state handling.'),
  ('Copywriting', 'Write a landing hero + 3 value props',
   'For the product brief we provide, write a hero headline + subhead and three value propositions. Submit as a doc.',
   'Clear, benefit-led, on-tone, no fluff or errors; mirrors the brief''s audience.'),
  ('Content Writing', 'Write a 500-word article section',
   'Write a 500-word section for the topic/brief we provide, with a clear structure and a strong opening. Submit as a doc.',
   'Well-structured, accurate, engaging, clean grammar, matches the brief.'),
  ('Video Editing', 'Cut a 30–45s short from supplied footage',
   'We''ll share raw clips. Edit a 30–45s short with clean pacing, captions and a hook in the first 3 seconds. Submit a link.',
   'Strong hook, clean cuts and pacing, readable captions, exported correctly.'),
  ('Social Media Management', 'Plan a 5-post launch week',
   'For the brand brief we provide, plan a 5-post launch week (copy + format + hook for each). Submit as a doc.',
   'Coherent narrative across posts, platform-appropriate, strong hooks, on-brand.')
) AS v(skill_category, title, brief, pass_criteria)
WHERE NOT EXISTS (SELECT 1 FROM public.test_briefs);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.test_briefs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vetting_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionalism_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vetting_badges         ENABLE ROW LEVEL SECURITY;

-- Briefs: public read of active ones; admin writes.
DROP POLICY IF EXISTS test_briefs_read ON public.test_briefs;
CREATE POLICY test_briefs_read ON public.test_briefs FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS test_briefs_admin ON public.test_briefs;
CREATE POLICY test_briefs_admin ON public.test_briefs FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Applications: owner + admin can read; INSERT via RPC path (owner allowed).
-- No owner UPDATE policy — status only changes through SECURITY DEFINER RPCs,
-- so a talent can never self-approve.
DROP POLICY IF EXISTS vetting_apps_read ON public.vetting_applications;
CREATE POLICY vetting_apps_read ON public.vetting_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS vetting_apps_admin ON public.vetting_applications;
CREATE POLICY vetting_apps_admin ON public.vetting_applications FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS skill_sub_read ON public.skill_submissions;
CREATE POLICY skill_sub_read ON public.skill_submissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS skill_sub_admin ON public.skill_submissions;
CREATE POLICY skill_sub_admin ON public.skill_submissions FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS prof_check_read ON public.professionalism_checks;
CREATE POLICY prof_check_read ON public.professionalism_checks FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS prof_check_admin ON public.professionalism_checks;
CREATE POLICY prof_check_admin ON public.professionalism_checks FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Badges are a public trust signal (clients must see them).
DROP POLICY IF EXISTS vetting_badges_read ON public.vetting_badges;
CREATE POLICY vetting_badges_read ON public.vetting_badges FOR SELECT USING (true);
DROP POLICY IF EXISTS vetting_badges_admin ON public.vetting_badges;
CREATE POLICY vetting_badges_admin ON public.vetting_badges FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── RPCs: talent flow ────────────────────────────────────────────────────────
-- Start (or resume) a vetting application for a skill.
CREATE OR REPLACE FUNCTION public.vetting_start(_skill_category text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); app public.vetting_applications;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _skill_category IS NULL OR length(trim(_skill_category)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'skill_required');
  END IF;

  SELECT * INTO app FROM public.vetting_applications WHERE user_id = me AND skill_category = _skill_category;
  IF NOT FOUND THEN
    INSERT INTO public.vetting_applications (user_id, skill_category)
      VALUES (me, _skill_category) RETURNING * INTO app;
  ELSIF app.status = 'rejected' AND app.retry_after IS NOT NULL AND app.retry_after <= now() THEN
    -- Allow a retry after the cooldown by resetting the application.
    UPDATE public.vetting_applications SET
      status = 'skill_pending', skill_test_status = 'not_started',
      professionalism_status = 'not_started', overall_result = NULL,
      reviewed_by = NULL, reviewed_at = NULL, retry_after = NULL, updated_at = now()
     WHERE id = app.id RETURNING * INTO app;
  END IF;

  RETURN jsonb_build_object('ok', true, 'application_id', app.id, 'status', app.status,
    'skill_test_status', app.skill_test_status, 'professionalism_status', app.professionalism_status);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_start(text) TO authenticated;

-- Submit the practical skill work.
CREATE OR REPLACE FUNCTION public.vetting_submit_skill(
  _application_id uuid, _portfolio_url text, _test_brief_id uuid,
  _submission_url text, _submission_files jsonb DEFAULT '[]'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); app public.vetting_applications;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO app FROM public.vetting_applications WHERE id = _application_id AND user_id = me FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF app.status NOT IN ('skill_pending') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_stage', 'status', app.status);
  END IF;

  INSERT INTO public.skill_submissions (application_id, user_id, portfolio_url, test_brief_id, submission_url, submission_files)
    VALUES (_application_id, me, _portfolio_url, _test_brief_id, _submission_url, COALESCE(_submission_files, '[]'::jsonb));

  UPDATE public.vetting_applications SET skill_test_status = 'submitted', updated_at = now()
   WHERE id = _application_id;

  RETURN jsonb_build_object('ok', true, 'status', 'submitted');
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_submit_skill(uuid, text, uuid, text, jsonb) TO authenticated;

-- Submit the professionalism stage (only reachable once skill is passed).
CREATE OR REPLACE FUNCTION public.vetting_submit_professionalism(
  _application_id uuid, _answers jsonb, _video_url text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); app public.vetting_applications;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO app FROM public.vetting_applications WHERE id = _application_id AND user_id = me FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF app.status <> 'prof_pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_stage', 'status', app.status);
  END IF;

  INSERT INTO public.professionalism_checks (application_id, user_id, method, answers, video_url)
    VALUES (_application_id, me, CASE WHEN _video_url IS NULL THEN 'written' ELSE 'mixed' END,
            COALESCE(_answers, '{}'::jsonb), _video_url);

  UPDATE public.vetting_applications SET professionalism_status = 'submitted', updated_at = now()
   WHERE id = _application_id;

  RETURN jsonb_build_object('ok', true, 'status', 'submitted');
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_submit_professionalism(uuid, jsonb, text) TO authenticated;

-- Current user's applications + latest sub-state, for the talent dashboard.
CREATE OR REPLACE FUNCTION public.vetting_mine()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $fn$
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT id, skill_category, status, skill_test_status, professionalism_status,
           overall_result, retry_after, created_at, updated_at
    FROM public.vetting_applications WHERE user_id = auth.uid()
  ) a;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_mine() TO authenticated;

-- ── RPCs: reviewer flow (admin only) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.vetting_review_skill(
  _submission_id uuid, _score integer, _pass boolean, _notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); sub public.skill_submissions; app_id uuid;
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO sub FROM public.skill_submissions WHERE id = _submission_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  app_id := sub.application_id;

  UPDATE public.skill_submissions SET score = _score, reviewer_notes = _notes, reviewed_by = me
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
GRANT EXECUTE ON FUNCTION public.vetting_review_skill(uuid, integer, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vetting_review_professionalism(
  _check_id uuid, _communication integer, _reliability integer, _responsiveness integer,
  _pass boolean, _notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); chk public.professionalism_checks; app public.vetting_applications;
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO chk FROM public.professionalism_checks WHERE id = _check_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.professionalism_checks SET
    communication_score = _communication, reliability_score = _reliability,
    responsiveness_score = _responsiveness, interview_notes = _notes,
    result = CASE WHEN _pass THEN 'pass' ELSE 'fail' END, reviewed_by = me
   WHERE id = _check_id;

  SELECT * INTO app FROM public.vetting_applications WHERE id = chk.application_id FOR UPDATE;

  IF _pass THEN
    UPDATE public.vetting_applications
       SET professionalism_status = 'passed', status = 'approved', overall_result = 'approved',
           reviewed_by = me, reviewed_at = now(), updated_at = now()
     WHERE id = app.id;
    -- Issue / refresh the public badge.
    INSERT INTO public.vetting_badges (user_id, skill_category, is_vetted, vetted_at, revoked_at)
      VALUES (app.user_id, app.skill_category, true, now(), NULL)
    ON CONFLICT (user_id, skill_category)
      DO UPDATE SET is_vetted = true, vetted_at = now(), revoked_at = NULL;
  ELSE
    UPDATE public.vetting_applications
       SET professionalism_status = 'failed', status = 'rejected', overall_result = 'rejected',
           reviewed_by = me, reviewed_at = now(), retry_after = now() + interval '14 days', updated_at = now()
     WHERE id = app.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'passed', _pass);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_review_professionalism(uuid, integer, integer, integer, boolean, text) TO authenticated;

-- Revoke a badge (integrity — e.g. a client reports a serious issue).
CREATE OR REPLACE FUNCTION public.vetting_revoke_badge(_user_id uuid, _skill_category text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.vetting_badges SET is_vetted = false, revoked_at = now()
   WHERE user_id = _user_id AND skill_category = _skill_category;
  RETURN jsonb_build_object('ok', true);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_revoke_badge(uuid, text) TO authenticated;

-- Admin review queue: applications waiting on a reviewer.
CREATE OR REPLACE FUNCTION public.vetting_review_queue()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at')), '[]'::jsonb)
    FROM (
      SELECT to_jsonb(a) || jsonb_build_object(
        'pending_stage', CASE WHEN a.skill_test_status = 'submitted' THEN 'skill'
                              WHEN a.professionalism_status = 'submitted' THEN 'professionalism' END
      ) AS row
      FROM public.vetting_applications a
      WHERE a.skill_test_status = 'submitted' OR a.professionalism_status = 'submitted'
    ) q
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_review_queue() TO authenticated;

-- Public: fetch a user's active badges (for profiles / search cards).
CREATE OR REPLACE FUNCTION public.vetting_badges_for(_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $fn$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('skill_category', skill_category, 'level', level, 'vetted_at', vetted_at)), '[]'::jsonb)
  FROM public.vetting_badges WHERE user_id = _user_id AND is_vetted;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_badges_for(uuid) TO anon, authenticated;
