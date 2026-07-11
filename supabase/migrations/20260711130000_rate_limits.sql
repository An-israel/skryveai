-- Invisible anti-abuse rate limiting (Limits & Gamification spec, Prompt 2).
-- A sliding-window counter, separate from the value tiers. Thresholds are high
-- enough that a real human never hits them — only bots/scrapers do.

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,          -- e.g. "tiptip:<uid>" or "signup:<ip>"
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time
  ON public.rate_limit_events(key, created_at DESC);

-- Only the service role (edge functions) reads/writes this; no user policies.
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Sliding-window check scoped to the caller. Returns whether the action is
-- allowed and records it when so. Keys are namespaced by the caller's uid.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _action text, _limit integer, _window_seconds integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me    uuid := auth.uid();
  v_key text;
  v_cnt integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_key := _action || ':' || me::text;

  SELECT count(*) INTO v_cnt FROM public.rate_limit_events
    WHERE key = v_key AND created_at >= now() - make_interval(secs => _window_seconds);

  IF v_cnt >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  INSERT INTO public.rate_limit_events (key) VALUES (v_key);
  RETURN jsonb_build_object('allowed', true, 'remaining', _limit - v_cnt - 1);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;

-- Housekeeping: prune events older than a day (call from cron if desired).
CREATE OR REPLACE FUNCTION public.prune_rate_limit_events()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '1 day';
$fn$;
