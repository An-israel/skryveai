-- Event-to-Waitlist Engine (Build Spec). Admin creates a webinar → gets a short
-- /e/<slug> link → people register → each becomes a real Skryve account + a
-- deduped waitlist entry → they get the community link and a (skippable) vetting
-- offer. Named "webinars" to avoid colliding with the existing in-app `events`.
--
-- Account creation happens in the event-register edge function (needs the auth
-- admin API); this migration is the data model + admin/public/dashboard RPCs.

-- ── Webinars (the lead-gen events) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webinars (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  slug               text NOT NULL UNIQUE,
  description        text,
  event_type         text,
  event_datetime     timestamptz,
  host_name          text,
  cover_image_url    text,
  community_link     text,               -- WhatsApp/Telegram group (revealed after registering)
  community_type     text,               -- 'whatsapp' | 'telegram'
  registration_count integer NOT NULL DEFAULT 0,
  community_clicks   integer NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webinars_active ON public.webinars(is_active, event_datetime DESC);

-- ── Registrations (a person ↔ a webinar; one row per event registered) ───────
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id        uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  waitlist_id       uuid REFERENCES public.waitlist(id) ON DELETE SET NULL,
  community_clicked boolean NOT NULL DEFAULT false,
  registered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_reg_webinar ON public.event_registrations(webinar_id, registered_at DESC);

-- ── Extend waitlist + profiles for the engine ────────────────────────────────
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS phone      text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS consent    boolean NOT NULL DEFAULT false;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS consent_at timestamptz;
-- The two-path flag: 'event_<slug>' = webinar registrant (vetting optional);
-- NULL/'direct' = real app user (vetting compulsory once the gate is on).
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS signup_source text;

-- The vetting gate flag (hard gate; flip off here to disable instantly).
INSERT INTO public.platform_flags (key, bool_value) VALUES ('vetting_gate_enabled', true)
  ON CONFLICT (key) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.webinars            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Active webinars are publicly readable EXCEPT the community link (revealed only
-- after registering). We expose display fields through webinar_by_slug() instead
-- of a table-wide SELECT, so keep the table itself owner/admin-only for reads.
DROP POLICY IF EXISTS webinars_admin ON public.webinars;
CREATE POLICY webinars_admin ON public.webinars FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS event_reg_own ON public.event_registrations;
CREATE POLICY event_reg_own ON public.event_registrations FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS event_reg_admin ON public.event_registrations;
CREATE POLICY event_reg_admin ON public.event_registrations FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── Public: fetch a webinar's display info by slug (no community link) ────────
CREATE OR REPLACE FUNCTION public.webinar_by_slug(_slug text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $fn$
  SELECT to_jsonb(w) FROM (
    SELECT id, title, slug, description, event_type, event_datetime, host_name,
           cover_image_url, community_type, registration_count, is_active
    FROM public.webinars WHERE slug = _slug AND is_active
  ) w;
$fn$;
GRANT EXECUTE ON FUNCTION public.webinar_by_slug(text) TO anon, authenticated;

-- ── Track community-link clicks (conversion metric) ──────────────────────────
CREATE OR REPLACE FUNCTION public.event_mark_community_click(_registration_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE public.event_registrations SET community_clicked = true
   WHERE id = _registration_id AND NOT community_clicked;
  IF FOUND THEN
    UPDATE public.webinars w SET community_clicks = community_clicks + 1
      FROM public.event_registrations r
     WHERE r.id = _registration_id AND w.id = r.webinar_id;
  END IF;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.event_mark_community_click(uuid) TO anon, authenticated;

-- ── Admin: create / update / toggle / list webinars ──────────────────────────
CREATE OR REPLACE FUNCTION public.webinar_upsert(
  _id uuid, _title text, _slug text, _description text, _event_type text,
  _event_datetime timestamptz, _host_name text, _cover_image_url text,
  _community_link text, _community_type text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); v_id uuid; v_slug text := lower(regexp_replace(trim(_slug), '[^a-zA-Z0-9]+', '-', 'g'));
BEGIN
  IF NOT public.is_admin(me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'title_required'); END IF;
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'slug_required'); END IF;

  IF _id IS NULL THEN
    -- new
    IF EXISTS (SELECT 1 FROM public.webinars WHERE slug = v_slug) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'slug_taken');
    END IF;
    INSERT INTO public.webinars (title, slug, description, event_type, event_datetime,
      host_name, cover_image_url, community_link, community_type, created_by)
      VALUES (_title, v_slug, _description, _event_type, _event_datetime,
      _host_name, _cover_image_url, _community_link, _community_type, me)
      RETURNING id INTO v_id;
  ELSE
    IF EXISTS (SELECT 1 FROM public.webinars WHERE slug = v_slug AND id <> _id) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'slug_taken');
    END IF;
    UPDATE public.webinars SET
      title = _title, slug = v_slug, description = _description, event_type = _event_type,
      event_datetime = _event_datetime, host_name = _host_name, cover_image_url = _cover_image_url,
      community_link = _community_link, community_type = _community_type
     WHERE id = _id RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'slug', v_slug);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.webinar_upsert(uuid, text, text, text, text, timestamptz, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.webinar_toggle(_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.webinars SET is_active = _active WHERE id = _id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.webinar_toggle(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.webinar_list_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(w) ORDER BY w.created_at DESC), '[]'::jsonb)
          FROM public.webinars w);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.webinar_list_admin() TO authenticated;

-- Registrants for one webinar (export).
CREATE OR REPLACE FUNCTION public.webinar_registrants(_webinar_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name', wl.full_name, 'email', wl.email, 'phone', wl.phone,
      'country', wl.country, 'skill', wl.primary_skill,
      'community_clicked', r.community_clicked, 'registered_at', r.registered_at
    ) ORDER BY r.registered_at DESC), '[]'::jsonb)
    FROM public.event_registrations r
    LEFT JOIN public.waitlist wl ON wl.id = r.waitlist_id
    WHERE r.webinar_id = _webinar_id
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.webinar_registrants(uuid) TO authenticated;

-- ── Admin: the waitlist / data dashboard (Prompt 5) ──────────────────────────
CREATE OR REPLACE FUNCTION public.event_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'waitlist_total',   (SELECT count(*) FROM public.waitlist),
    'last_7_days',      (SELECT count(*) FROM public.waitlist WHERE created_at >= now() - interval '7 days'),
    'from_events',      (SELECT count(*) FROM public.waitlist WHERE source LIKE 'event_%'),
    'community_clicks', (SELECT COALESCE(sum(community_clicks),0) FROM public.webinars),
    'by_event', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'title', title, 'slug', slug, 'registrations', registration_count,
                    'community_clicks', community_clicks, 'is_active', is_active) ORDER BY registration_count DESC), '[]'::jsonb)
                 FROM public.webinars),
    'by_skill', (SELECT COALESCE(jsonb_agg(jsonb_build_object('skill', primary_skill, 'count', c) ORDER BY c DESC), '[]'::jsonb)
                 FROM (SELECT primary_skill, count(*) c FROM public.waitlist GROUP BY primary_skill ORDER BY c DESC LIMIT 20) s),
    'by_country', (SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', c) ORDER BY c DESC), '[]'::jsonb)
                   FROM (SELECT country, count(*) c FROM public.waitlist WHERE country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 20) s),
    'by_vetting', (SELECT jsonb_build_object(
                     'vetted',  (SELECT count(DISTINCT user_id) FROM public.vetting_badges WHERE is_vetted),
                     'pending', (SELECT count(DISTINCT user_id) FROM public.vetting_applications WHERE status IN ('skill_pending','prof_pending')),
                     'rejected',(SELECT count(DISTINCT user_id) FROM public.vetting_applications WHERE status = 'rejected')
                   ))
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.event_dashboard_stats() TO authenticated;

-- Full, filterable registrant/waitlist table for follow-up + CSV export.
CREATE OR REPLACE FUNCTION public.waitlist_people(_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row ORDER BY row->>'created_at' DESC), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'name', wl.full_name, 'email', wl.email, 'phone', wl.phone,
        'country', wl.country, 'skill', wl.primary_skill, 'source', wl.source,
        'consent', wl.consent, 'created_at', wl.created_at,
        'vetting', COALESCE((SELECT status FROM public.vetting_applications va WHERE va.user_id = wl.user_id ORDER BY va.updated_at DESC LIMIT 1), 'none')
      ) AS row
      FROM public.waitlist wl
      ORDER BY wl.created_at DESC
      LIMIT LEAST(GREATEST(_limit, 1), 5000)
    ) q
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.waitlist_people(integer) TO authenticated;

-- ── Service-role helper: look up an auth user by email (dedupe) ──────────────
-- Used only by the event-register edge function (service role). Not exposed to
-- anon/authenticated, so it can't be used to probe who has an account.
CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(_email text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, auth STABLE AS $fn$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.auth_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(text) TO service_role;

-- ── Vetting gate (two-path) ──────────────────────────────────────────────────
-- Returns whether the current user may perform gated actions (apply, be listed).
-- Gate off → everyone allowed. Event registrants (signup_source 'event_%') are
-- exempt. Everyone else must hold at least one active Vetted badge.
CREATE OR REPLACE FUNCTION public.vetting_access()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $fn$
DECLARE me uuid := auth.uid(); gate boolean; src text; vetted boolean; exempt boolean;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'auth'); END IF;
  SELECT bool_value INTO gate FROM public.platform_flags WHERE key = 'vetting_gate_enabled';
  gate := COALESCE(gate, false);
  SELECT signup_source INTO src FROM public.talent_profiles WHERE user_id = me;
  exempt := (src IS NOT NULL AND src LIKE 'event_%');
  vetted := EXISTS (SELECT 1 FROM public.vetting_badges WHERE user_id = me AND is_vetted);
  RETURN jsonb_build_object(
    'gate_enabled', gate,
    'exempt', exempt,
    'vetted', vetted,
    'allowed', (NOT gate) OR exempt OR vetted
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.vetting_access() TO authenticated;
