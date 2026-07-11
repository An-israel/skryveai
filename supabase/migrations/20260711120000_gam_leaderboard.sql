-- Gamification leaderboard (Gamification spec, Prompt 8 — "use carefully").
-- Public trust signals only: display name, level, points, avatar. No earnings /
-- ratings. Scoped to talents who have a public profile and have earned points,
-- so it motivates rather than exposing private data.
CREATE OR REPLACE FUNCTION public.gam_leaderboard(_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.rank), '[]'::jsonb)
  FROM (
    SELECT
      row_number() OVER (ORDER BY s.total_points DESC, s.updated_at ASC) AS rank,
      s.user_id,
      tp.full_name AS name,
      tp.profile_photo_url AS avatar,
      s.current_level,
      s.level_name,
      s.total_points
    FROM public.user_stats s
    JOIN public.talent_profiles tp ON tp.user_id = s.user_id
    WHERE s.total_points > 0
      AND COALESCE(tp.full_name, '') <> ''
    ORDER BY s.total_points DESC, s.updated_at ASC
    LIMIT LEAST(GREATEST(_limit, 1), 100)
  ) r;
$fn$;
GRANT EXECUTE ON FUNCTION public.gam_leaderboard(integer) TO authenticated, anon;
