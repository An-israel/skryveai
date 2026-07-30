-- Waitlist referral loop (August Build Prompt 5). Extends the base waitlist with
-- a viral referral mechanic: each waitlister gets a unique code; referring a new
-- freelancer moves them up the line. Positions are computed on read (signup order
-- minus a per-referral boost) so they always reflect the live list.

-- ── Extend the waitlist table ────────────────────────────────────────────────
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS country        text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referral_code  text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referred_by    text;   -- referrer's code
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS signup_seq     bigint;

CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_referral_code ON public.waitlist (referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON public.waitlist (referred_by);

-- Monotonic signup sequence → the base position (join order).
CREATE SEQUENCE IF NOT EXISTS public.waitlist_seq;

-- Each referral moves a waitlister this many spots up the line.
-- (Kept as a constant in the functions below.)

-- Backfill codes/seq for any rows created before this migration.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.waitlist WHERE referral_code IS NULL OR signup_seq IS NULL ORDER BY created_at LOOP
    UPDATE public.waitlist
       SET referral_code = COALESCE(referral_code, upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8))),
           signup_seq    = COALESCE(signup_seq, nextval('public.waitlist_seq'))
     WHERE id = r.id;
  END LOOP;
END $$;

-- ── Join (idempotent by email) + credit the referrer ─────────────────────────
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
BEGIN
  IF v_email IS NULL OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

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

-- Drop the old 6-arg signature so callers resolve to the extended one.
DROP FUNCTION IF EXISTS public.join_waitlist(text, text, text, text, integer, text);

-- ── Status for the success screen / referral landing ─────────────────────────
CREATE OR REPLACE FUNCTION public.waitlist_status(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
DECLARE w public.waitlist%ROWTYPE; total integer; pos integer;
BEGIN
  SELECT * INTO w FROM public.waitlist WHERE referral_code = upper(trim(_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT count(*)::int INTO total FROM public.waitlist;
  pos := greatest(1, (COALESCE(w.signup_seq, 0))::int - w.referral_count * 10);
  RETURN jsonb_build_object(
    'ok', true, 'position', pos, 'referral_count', w.referral_count,
    'referral_code', w.referral_code, 'total', total
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.waitlist_status(text) TO anon, authenticated;

-- ── Admin dashboard numbers (investor metrics) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.waitlist_admin_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'total',        (SELECT count(*) FROM public.waitlist),
    'last_7_days',  (SELECT count(*) FROM public.waitlist WHERE created_at >= now() - interval '7 days'),
    'referred',     (SELECT count(*) FROM public.waitlist WHERE referred_by IS NOT NULL),
    'by_skill',     (SELECT COALESCE(jsonb_agg(jsonb_build_object('skill', primary_skill, 'count', c) ORDER BY c DESC), '[]'::jsonb)
                     FROM (SELECT primary_skill, count(*) c FROM public.waitlist GROUP BY primary_skill ORDER BY c DESC LIMIT 20) s),
    'by_country',   (SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', c) ORDER BY c DESC), '[]'::jsonb)
                     FROM (SELECT country, count(*) c FROM public.waitlist WHERE country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 20) s),
    'top_referrers',(SELECT COALESCE(jsonb_agg(jsonb_build_object('email', email, 'referrals', referral_count) ORDER BY referral_count DESC), '[]'::jsonb)
                     FROM (SELECT email, referral_count FROM public.waitlist WHERE referral_count > 0 ORDER BY referral_count DESC LIMIT 20) s)
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.waitlist_admin_stats() TO authenticated;
