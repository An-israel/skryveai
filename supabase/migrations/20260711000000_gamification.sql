-- Gamification & Retention — schema + engine (Build Spec Part 2)
-- Rewards REAL progress toward income and skill: applying to jobs, completing
-- lessons/courses, landing clients, earning reviews. No empty-engagement points.
-- Everything runs through SECURITY DEFINER RPCs so the Vite SPA needs no API layer.

-- ── Levels ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.levels (
  level          integer PRIMARY KEY,
  name           text NOT NULL,
  points_required integer NOT NULL,
  perks          text
);

INSERT INTO public.levels (level, name, points_required, perks) VALUES
  (1, 'Rising Talent', 0,     'Getting started on Skryve'),
  (2, 'Established',   500,   'Profile boost in search'),
  (3, 'Pro',          1500,   'Pro badge on your profile'),
  (4, 'Top Rated',    4000,   'Top Rated badge — clients trust it'),
  (5, 'Elite',       10000,   'Elite status — the top of Skryve')
ON CONFLICT (level) DO UPDATE
  SET name = EXCLUDED.name,
      points_required = EXCLUDED.points_required,
      perks = EXCLUDED.perks;

-- ── User stats ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points               integer NOT NULL DEFAULT 0,
  current_level              integer NOT NULL DEFAULT 1,
  level_name                 text    NOT NULL DEFAULT 'Rising Talent',
  profile_completion_percent integer NOT NULL DEFAULT 0,
  jobs_applied               integer NOT NULL DEFAULT 0,
  projects_completed         integer NOT NULL DEFAULT 0,
  courses_completed          integer NOT NULL DEFAULT 0,
  certificates_earned        integer NOT NULL DEFAULT 0,
  avg_rating                 numeric NOT NULL DEFAULT 0,
  total_earnings             numeric NOT NULL DEFAULT 0,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- ── Streaks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type      text NOT NULL,               -- application | learning | login
  current_count    integer NOT NULL DEFAULT 0,
  longest_count    integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, streak_type)
);

-- ── Badges ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  description    text,
  icon           text,
  criteria_type  text,
  criteria_value integer,
  tier           text NOT NULL DEFAULT 'bronze', -- bronze | silver | gold
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.badges (code, name, description, icon, criteria_type, criteria_value, tier, sort_order) VALUES
  ('first_application', 'First Step',   'Applied to your first job',                'Footprints', 'jobs_applied',       1,      'bronze', 10),
  ('profile_complete',  'All Set',      'Reached 100% profile completion',          'CircleCheck','profile_percent',    100,    'bronze', 20),
  ('course_complete',   'Certified',    'Completed your first course',              'GraduationCap','courses_completed',1,      'silver', 30),
  ('five_star',         'Five Star',    'Received a 5-star review',                 'Star',       'five_star_review',   1,      'silver', 40),
  ('streak_7',          'On Fire',      'Kept a 7-day application streak',          'Flame',      'application_streak', 7,      'silver', 50),
  ('streak_30',         'Unstoppable',  'Kept a 30-day streak',                     'Zap',        'application_streak', 30,     'gold',   60),
  ('first_client',      'First Client', 'Landed your first paying client',          'Handshake',  'projects_completed', 1,      'gold',   70),
  ('first_100k',        'Six Figures',  'Earned your first 100k on Skryve',         'Trophy',     'total_earnings',     100000, 'gold',   80)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
      criteria_type = EXCLUDED.criteria_type, criteria_value = EXCLUDED.criteria_value,
      tier = EXCLUDED.tier, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.user_badges (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- ── Achievements log (feeds celebrations + the achievements timeline) ─────────
CREATE TABLE IF NOT EXISTS public.achievements_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           text NOT NULL,               -- points | level_up | badge | streak_milestone
  title          text NOT NULL,
  description    text,
  points_awarded integer NOT NULL DEFAULT 0,
  celebrate      boolean NOT NULL DEFAULT false, -- warrants a full celebration moment
  seen           boolean NOT NULL DEFAULT false, -- celebration already shown
  metadata       jsonb   NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_time
  ON public.achievements_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_unseen
  ON public.achievements_log(user_id) WHERE celebrate AND NOT seen;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.levels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_log ENABLE ROW LEVEL SECURITY;

-- Levels + badges: public read (needed for locked-badge galleries and profiles).
DROP POLICY IF EXISTS levels_read ON public.levels;
CREATE POLICY levels_read ON public.levels FOR SELECT USING (true);
DROP POLICY IF EXISTS badges_read ON public.badges;
CREATE POLICY badges_read ON public.badges FOR SELECT USING (true);

-- user_stats holds private data (earnings, ratings) — owner/admin read only.
-- The public trust signals (level, earned badges) are exposed via gam_public_profile().
DROP POLICY IF EXISTS user_stats_read ON public.user_stats;
CREATE POLICY user_stats_read ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
-- Earned badges are a public trust signal on profiles.
DROP POLICY IF EXISTS user_badges_read ON public.user_badges;
CREATE POLICY user_badges_read ON public.user_badges FOR SELECT USING (true);

-- Streaks + the achievements log are private to the owner (or admins).
DROP POLICY IF EXISTS streaks_read_own ON public.streaks;
CREATE POLICY streaks_read_own ON public.streaks FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS achievements_read_own ON public.achievements_log;
CREATE POLICY achievements_read_own ON public.achievements_log FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ── Engine internals (operate on an explicit _uid so triggers can use them) ──

-- Make sure a stats row exists for the user.
CREATE OR REPLACE FUNCTION public._gam_ensure_stats(_uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  INSERT INTO public.user_stats (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;
$fn$;

-- Canonical point values for real actions.
CREATE OR REPLACE FUNCTION public._gam_points(_action text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE _action
    WHEN 'profile_section' THEN 20
    WHEN 'apply_job'       THEN 10
    WHEN 'lesson_complete' THEN 15
    WHEN 'course_complete' THEN 200
    WHEN 'land_client'     THEN 500
    WHEN 'review_5star'    THEN 100
    WHEN 'streak_7'        THEN 150
    WHEN 'referral'        THEN 100
    ELSE 0
  END;
$fn$;

-- Recompute level from total points. Logs a celebration on level-up.
-- Returns the new level number if the user leveled up, else 0.
CREATE OR REPLACE FUNCTION public._gam_recompute_level(_uid uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_points integer;
  v_old    integer;
  v_new    integer;
  v_name   text;
BEGIN
  SELECT total_points, current_level INTO v_points, v_old
    FROM public.user_stats WHERE user_id = _uid;

  SELECT level, name INTO v_new, v_name
    FROM public.levels
    WHERE points_required <= v_points
    ORDER BY level DESC LIMIT 1;

  v_new  := COALESCE(v_new, 1);
  v_name := COALESCE(v_name, 'Rising Talent');

  UPDATE public.user_stats
    SET current_level = v_new, level_name = v_name, updated_at = now()
    WHERE user_id = _uid;

  IF v_new > COALESCE(v_old, 1) THEN
    INSERT INTO public.achievements_log (user_id, type, title, description, celebrate)
      VALUES (_uid, 'level_up', 'Leveled up to ' || v_name || '!',
              'You reached ' || v_name || ' — real progress, real status.', true);
    RETURN v_new;
  END IF;
  RETURN 0;
END;
$fn$;

-- Grant a badge if not already held. Returns true when newly earned.
CREATE OR REPLACE FUNCTION public._gam_grant_badge(_uid uuid, _code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_badge public.badges%ROWTYPE;
  v_new   boolean := false;
BEGIN
  SELECT * INTO v_badge FROM public.badges WHERE code = _code;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (_uid, v_badge.id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  GET DIAGNOSTICS v_new = ROW_COUNT;
  IF v_new THEN
    INSERT INTO public.achievements_log (user_id, type, title, description, celebrate, metadata)
      VALUES (_uid, 'badge', 'Badge unlocked: ' || v_badge.name,
              v_badge.description, true,
              jsonb_build_object('code', v_badge.code, 'tier', v_badge.tier, 'icon', v_badge.icon));
  END IF;
  RETURN v_new;
END;
$fn$;

-- Evaluate all stat-derived badges for a user (idempotent). Returns count earned.
CREATE OR REPLACE FUNCTION public._gam_check_badges(_uid uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s public.user_stats%ROWTYPE;
  v_app_streak integer;
  n integer := 0;
BEGIN
  SELECT * INTO s FROM public.user_stats WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(longest_count, 0) INTO v_app_streak
    FROM public.streaks WHERE user_id = _uid AND streak_type = 'application';
  v_app_streak := COALESCE(v_app_streak, 0);

  IF s.jobs_applied       >= 1      AND public._gam_grant_badge(_uid, 'first_application') THEN n := n + 1; END IF;
  IF s.profile_completion_percent >= 100 AND public._gam_grant_badge(_uid, 'profile_complete') THEN n := n + 1; END IF;
  IF s.courses_completed  >= 1      AND public._gam_grant_badge(_uid, 'course_complete') THEN n := n + 1; END IF;
  IF s.projects_completed >= 1      AND public._gam_grant_badge(_uid, 'first_client') THEN n := n + 1; END IF;
  IF s.total_earnings     >= 100000 AND public._gam_grant_badge(_uid, 'first_100k') THEN n := n + 1; END IF;
  IF v_app_streak         >= 7      AND public._gam_grant_badge(_uid, 'streak_7') THEN n := n + 1; END IF;
  IF v_app_streak         >= 30     AND public._gam_grant_badge(_uid, 'streak_30') THEN n := n + 1; END IF;

  RETURN n;
END;
$fn$;

-- Core award: add points for a real action, bump the matching counter, recompute
-- level, evaluate badges, and log the achievement.
CREATE OR REPLACE FUNCTION public._gam_award(_uid uuid, _action text, _celebrate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_pts     integer;
  v_leveled integer;
  v_title   text;
BEGIN
  PERFORM public._gam_ensure_stats(_uid);
  v_pts := public._gam_points(_action);

  -- Bump the counter that matches the action (drives badges + stat cards).
  UPDATE public.user_stats SET
    total_points       = total_points + v_pts,
    jobs_applied       = jobs_applied       + (CASE WHEN _action = 'apply_job'       THEN 1 ELSE 0 END),
    courses_completed  = courses_completed  + (CASE WHEN _action = 'course_complete' THEN 1 ELSE 0 END),
    certificates_earned= certificates_earned+ (CASE WHEN _action = 'course_complete' THEN 1 ELSE 0 END),
    projects_completed = projects_completed + (CASE WHEN _action = 'land_client'     THEN 1 ELSE 0 END),
    updated_at         = now()
  WHERE user_id = _uid;

  v_title := CASE _action
    WHEN 'profile_section' THEN 'Profile section completed'
    WHEN 'apply_job'       THEN 'Applied to a job'
    WHEN 'lesson_complete' THEN 'Lesson completed'
    WHEN 'course_complete' THEN 'Course completed'
    WHEN 'land_client'     THEN 'Landed a client'
    WHEN 'review_5star'    THEN 'Earned a 5-star review'
    WHEN 'referral'        THEN 'Referred a friend'
    ELSE 'Points earned'
  END;

  IF v_pts > 0 THEN
    INSERT INTO public.achievements_log (user_id, type, title, points_awarded, celebrate)
      VALUES (_uid, 'points', v_title, v_pts, _celebrate);
  END IF;

  -- 5-star review is an event, not a counter — grant its badge directly.
  IF _action = 'review_5star' THEN
    PERFORM public._gam_grant_badge(_uid, 'five_star');
  END IF;

  PERFORM public._gam_check_badges(_uid);
  v_leveled := public._gam_recompute_level(_uid);

  RETURN jsonb_build_object(
    'action', _action,
    'points_awarded', v_pts,
    'leveled_up', v_leveled > 0,
    'stats', (SELECT to_jsonb(us) FROM public.user_stats us WHERE user_id = _uid)
  );
END;
$fn$;

-- Streak bump: increment on a consecutive qualifying day, reset on a gap,
-- award milestone badges/points/celebrations at 7/14/30/100.
CREATE OR REPLACE FUNCTION public._gam_bump_streak(_uid uuid, _type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r         public.streaks%ROWTYPE;
  v_today   date := current_date;
  v_current integer;
  v_longest integer;
  v_ms      integer := 0;
BEGIN
  PERFORM public._gam_ensure_stats(_uid);
  SELECT * INTO r FROM public.streaks WHERE user_id = _uid AND streak_type = _type;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, streak_type, current_count, longest_count, last_active_date)
      VALUES (_uid, _type, 1, 1, v_today);
    v_current := 1; v_longest := 1;
  ELSIF r.last_active_date = v_today THEN
    RETURN jsonb_build_object('type', _type, 'current', r.current_count,
                              'longest', r.longest_count, 'incremented', false, 'milestone', 0);
  ELSIF r.last_active_date = v_today - 1 THEN
    v_current := r.current_count + 1;
    v_longest := GREATEST(r.longest_count, v_current);
    UPDATE public.streaks SET current_count = v_current, longest_count = v_longest,
      last_active_date = v_today, updated_at = now()
      WHERE id = r.id;
  ELSE
    v_current := 1;
    v_longest := GREATEST(r.longest_count, 1);
    UPDATE public.streaks SET current_count = 1, longest_count = v_longest,
      last_active_date = v_today, updated_at = now()
      WHERE id = r.id;
  END IF;

  IF v_current IN (7, 14, 30, 100) THEN
    v_ms := v_current;
    INSERT INTO public.achievements_log (user_id, type, title, description, celebrate, metadata)
      VALUES (_uid, 'streak_milestone',
              v_current || '-day ' || _type || ' streak!',
              'Consistency compounds. Keep the momentum going.', true,
              jsonb_build_object('streak_type', _type, 'days', v_current));
    IF _type = 'application' AND v_current = 7 THEN
      UPDATE public.user_stats SET total_points = total_points + public._gam_points('streak_7'),
        updated_at = now() WHERE user_id = _uid;
      PERFORM public._gam_recompute_level(_uid);
    END IF;
    PERFORM public._gam_check_badges(_uid);
  END IF;

  RETURN jsonb_build_object('type', _type, 'current', v_current,
                            'longest', v_longest, 'incremented', true, 'milestone', v_ms);
END;
$fn$;

-- ── Public RPCs (scoped to auth.uid()) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gam_award(_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- Only allow client-driven actions here; job applications go through the trigger.
  IF _action NOT IN ('profile_section','lesson_complete','course_complete',
                     'land_client','review_5star','referral') THEN
    RAISE EXCEPTION 'unsupported action %', _action;
  END IF;
  RETURN public._gam_award(me, _action,
    _action IN ('course_complete','land_client','review_5star'));
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_award(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gam_update_streak(_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _type NOT IN ('application','learning','login') THEN
    RAISE EXCEPTION 'unsupported streak %', _type;
  END IF;
  RETURN public._gam_bump_streak(me, _type);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_update_streak(text) TO authenticated;

-- Recompute profile completion (5 sections × 20%). Awards the 'All Set' badge at 100%.
CREATE OR REPLACE FUNCTION public.gam_recalc_profile()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me      uuid := auth.uid();
  p       record;
  has_cv  boolean;
  v_pct   integer := 0;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM public._gam_ensure_stats(me);

  SELECT bio, profile_photo_url, primary_skill, hourly_rate
    INTO p FROM public.talent_profiles WHERE user_id = me;
  SELECT EXISTS (SELECT 1 FROM public.skryve_cvs WHERE user_id = me) INTO has_cv;

  IF p.profile_photo_url IS NOT NULL AND p.profile_photo_url <> '' THEN v_pct := v_pct + 20; END IF;
  IF p.bio             IS NOT NULL AND p.bio             <> '' THEN v_pct := v_pct + 20; END IF;
  IF p.primary_skill   IS NOT NULL AND p.primary_skill   <> '' THEN v_pct := v_pct + 20; END IF;
  IF p.hourly_rate     IS NOT NULL AND p.hourly_rate      > 0  THEN v_pct := v_pct + 20; END IF;
  IF has_cv THEN v_pct := v_pct + 20; END IF;

  UPDATE public.user_stats SET profile_completion_percent = v_pct, updated_at = now()
    WHERE user_id = me;

  PERFORM public._gam_check_badges(me);
  RETURN v_pct;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_recalc_profile() TO authenticated;

-- Everything the owner's dashboard needs in one call (private — self only).
CREATE OR REPLACE FUNCTION public.gam_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  target uuid := auth.uid();
  s      public.user_stats%ROWTYPE;
  v_next jsonb;
BEGIN
  IF target IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM public._gam_ensure_stats(target);
  SELECT * INTO s FROM public.user_stats WHERE user_id = target;

  SELECT to_jsonb(l) INTO v_next FROM public.levels l
    WHERE l.level = s.current_level + 1;

  RETURN jsonb_build_object(
    'stats', to_jsonb(s),
    'current_level', (SELECT to_jsonb(l) FROM public.levels l WHERE l.level = s.current_level),
    'next_level', v_next,
    'streaks', COALESCE((SELECT jsonb_agg(to_jsonb(st)) FROM public.streaks st WHERE st.user_id = target), '[]'::jsonb),
    'badges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'code', b.code, 'name', b.name, 'description', b.description, 'icon', b.icon,
        'tier', b.tier, 'sort_order', b.sort_order,
        'earned', ub.id IS NOT NULL, 'earned_at', ub.earned_at
      ) ORDER BY b.sort_order)
      FROM public.badges b
      LEFT JOIN public.user_badges ub ON ub.badge_id = b.id AND ub.user_id = target
    ), '[]'::jsonb),
    'recent', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
      FROM (SELECT * FROM public.achievements_log WHERE user_id = target
            ORDER BY created_at DESC LIMIT 12) a
    ), '[]'::jsonb)
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_stats() TO authenticated;

-- Public trust signals for a talent's profile: level + earned badges only.
CREATE OR REPLACE FUNCTION public.gam_public_profile(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE s public.user_stats%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT * INTO s FROM public.user_stats WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;

  RETURN jsonb_build_object(
    'current_level', s.current_level,
    'level_name', s.level_name,
    'badges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'code', b.code, 'name', b.name, 'description', b.description,
        'icon', b.icon, 'tier', b.tier, 'earned_at', ub.earned_at
      ) ORDER BY b.sort_order)
      FROM public.user_badges ub JOIN public.badges b ON b.id = ub.badge_id
      WHERE ub.user_id = _uid
    ), '[]'::jsonb)
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_public_profile(uuid) TO authenticated, anon;

-- Pull unseen celebration-worthy achievements and mark them seen.
CREATE OR REPLACE FUNCTION public.gam_pop_celebrations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me  uuid := auth.uid();
  res jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  WITH popped AS (
    UPDATE public.achievements_log
      SET seen = true
      WHERE user_id = me AND celebrate AND NOT seen
      RETURNING *
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(popped) ORDER BY created_at), '[]'::jsonb)
    INTO res FROM popped;

  RETURN res;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_pop_celebrations() TO authenticated;

-- ── Trigger: award points + streak whenever a job application is inserted ────
-- Fires only on genuine INSERTs, so re-applying (upsert → UPDATE) never double-awards.
CREATE OR REPLACE FUNCTION public.gam_on_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  PERFORM public._gam_award(NEW.user_id, 'apply_job', false);
  PERFORM public._gam_bump_streak(NEW.user_id, 'application');
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_gam_on_application ON public.job_applications;
CREATE TRIGGER trg_gam_on_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.gam_on_application();
