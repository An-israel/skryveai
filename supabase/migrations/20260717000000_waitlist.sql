-- Freelancer waitlist — the supply-side distribution asset. Frictionless capture
-- (no auth required) so anyone can join; the count is public for social proof,
-- but the rows (with PII) are admin-only. This is the number you take to investors.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  full_name        text,
  primary_skill    text,               -- what they do (from the skill catalog)
  portfolio_url    text,
  years_experience integer,
  wants_remote     boolean NOT NULL DEFAULT true,
  source           text,               -- utm / referrer, for channel analysis
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- if signed in
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- One entry per email (case-insensitive). A repeat signup updates in place.
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_email ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (even anonymous) can join the waitlist.
DROP POLICY IF EXISTS waitlist_insert_anyone ON public.waitlist;
CREATE POLICY waitlist_insert_anyone ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Only admins can read the list (PII) or manage it.
DROP POLICY IF EXISTS waitlist_admin_read ON public.waitlist;
CREATE POLICY waitlist_admin_read ON public.waitlist FOR SELECT
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS waitlist_admin_write ON public.waitlist;
CREATE POLICY waitlist_admin_write ON public.waitlist FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Public social-proof counter — returns only the total, never any row data.
CREATE OR REPLACE FUNCTION public.waitlist_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $fn$
  SELECT count(*)::int FROM public.waitlist;
$fn$;
GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon, authenticated;

-- Join the waitlist idempotently by email (SECURITY DEFINER so the unique-email
-- upsert works without exposing the table). Returns the new total.
CREATE OR REPLACE FUNCTION public.join_waitlist(
  _email text, _full_name text DEFAULT NULL, _primary_skill text DEFAULT NULL,
  _portfolio_url text DEFAULT NULL, _years_experience integer DEFAULT NULL,
  _source text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE total integer;
BEGIN
  IF _email IS NULL OR position('@' in _email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  INSERT INTO public.waitlist (email, full_name, primary_skill, portfolio_url, years_experience, source, user_id)
    VALUES (lower(trim(_email)), _full_name, _primary_skill, _portfolio_url, _years_experience, _source, auth.uid())
  ON CONFLICT (lower(email)) DO UPDATE SET
    full_name        = COALESCE(EXCLUDED.full_name, public.waitlist.full_name),
    primary_skill    = COALESCE(EXCLUDED.primary_skill, public.waitlist.primary_skill),
    portfolio_url    = COALESCE(EXCLUDED.portfolio_url, public.waitlist.portfolio_url),
    years_experience = COALESCE(EXCLUDED.years_experience, public.waitlist.years_experience);

  SELECT count(*)::int INTO total FROM public.waitlist;
  RETURN jsonb_build_object('ok', true, 'total', total);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, text, text, integer, text) TO anon, authenticated;
