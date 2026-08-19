-- join_waitlist() is callable by anon with no throttle at all — a script can
-- call it as fast as it can generate email addresses. The existing
-- check_rate_limit() helper requires auth.uid() and is only granted to
-- `authenticated`, so it doesn't cover this anon-facing RPC. Key this one on
-- the caller's IP instead — PostgREST exposes the incoming request headers
-- via the `request.headers` GUC, populated with x-forwarded-for.
CREATE OR REPLACE FUNCTION public.join_waitlist(
  _email text, _full_name text DEFAULT NULL, _primary_skill text DEFAULT NULL,
  _portfolio_url text DEFAULT NULL, _years_experience integer DEFAULT NULL,
  _source text DEFAULT NULL, _country text DEFAULT NULL, _referred_by text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_email text := lower(trim(_email));
  v_ref   text := nullif(upper(trim(_referred_by)), '');
  existing public.waitlist%ROWTYPE;
  v_code  text;
  v_is_new boolean := false;
  total   integer;
  base    bigint;
  pos     integer;
  v_ip    text;
  v_key   text;
  v_cnt   integer;
BEGIN
  IF v_email IS NULL OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  v_ip := split_part(coalesce(
    (current_setting('request.headers', true)::json ->> 'x-forwarded-for'),
    'unknown'
  ), ',', 1);
  v_key := 'waitlist:' || v_ip;

  SELECT count(*) INTO v_cnt FROM public.rate_limit_events
    WHERE key = v_key AND created_at >= now() - interval '1 hour';
  IF v_cnt >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;
  INSERT INTO public.rate_limit_events (key) VALUES (v_key);

  SELECT * INTO existing FROM public.waitlist WHERE lower(email) = v_email;

  IF FOUND THEN
    -- Update details but never re-credit a referral for an existing signup.
    UPDATE public.waitlist SET
      full_name        = COALESCE(_full_name, full_name),
      primary_skill    = COALESCE(_primary_skill, primary_skill),
      portfolio_url    = COALESCE(_portfolio_url, portfolio_url),
      years_experience = COALESCE(_years_experience, years_experience),
      country          = COALESCE(_country, country)
     WHERE id = existing.id;
    v_code := existing.referral_code;
    base   := existing.signup_seq;
  ELSE
    v_is_new := true;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    base   := nextval('public.waitlist_seq');
    -- A referral only counts if the code exists and isn't the joiner's own future code.
    IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.waitlist WHERE referral_code = v_ref) THEN
      v_ref := NULL;
    END IF;
    INSERT INTO public.waitlist (
      email, full_name, primary_skill, portfolio_url, years_experience,
      source, country, referral_code, referred_by, signup_seq, user_id
    ) VALUES (
      v_email, _full_name, _primary_skill, _portfolio_url, _years_experience,
      _source, _country, v_code, v_ref, base, auth.uid()
    );
    -- Credit the referrer (moves them up the line).
    IF v_ref IS NOT NULL THEN
      UPDATE public.waitlist SET referral_count = referral_count + 1 WHERE referral_code = v_ref;
    END IF;
  END IF;

  SELECT count(*)::int INTO total FROM public.waitlist;
  SELECT greatest(1, (COALESCE(base, 0))::int - referral_count * 10)
    INTO pos FROM public.waitlist WHERE lower(email) = v_email;

  RETURN jsonb_build_object(
    'ok', true, 'is_new', v_is_new, 'total', total,
    'referral_code', v_code, 'position', pos
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, text, text, integer, text, text, text) TO anon, authenticated;
