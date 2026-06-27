-- ============================================================================
-- Security advisor fixes
-- ============================================================================
-- Addresses findings from the Supabase security advisor:
--   * CRITICAL: VAPID private key readable by any authenticated user
--   * Public/anon exposure of internal user UUIDs on marketplace tables
--   * activity_log missing a user-scoped SELECT policy
--   * SECURITY DEFINER functions with a mutable search_path
--   * EXECUTE granted to public/signed-in roles on trigger-only functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CRITICAL: stop exposing the VAPID private key.
--    push_config holds both public_key and private_key in one row. The old
--    policy let ANY authenticated user `SELECT *`, leaking the private key.
--    Clients only ever need the public key, which they fetch through the
--    `manage-push` edge function (service role, bypasses RLS). No client needs
--    direct table access, so we drop the policy entirely. RLS stays enabled,
--    leaving the table accessible only to the service role.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read push config" ON public.push_config;

-- ----------------------------------------------------------------------------
-- 2. Restrict marketplace SELECT policies to authenticated users only.
--    These used `USING (true)` with no role target, so anonymous/unauthenticated
--    visitors could read every row (and the internal user UUIDs they contain).
--    No public/unauthenticated page reads these tables, so scoping to the
--    `authenticated` role removes the anonymous exposure without changing
--    behaviour for signed-in users.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tp_select_public"  ON public.talent_profiles;
CREATE POLICY "tp_select_public"  ON public.talent_profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cp_select_public"  ON public.client_profiles;
CREATE POLICY "cp_select_public"  ON public.client_profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pi_select_public"  ON public.portfolio_items;
CREATE POLICY "pi_select_public"  ON public.portfolio_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rev_select_public" ON public.reviews;
CREATE POLICY "rev_select_public" ON public.reviews
  FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 3. Give users a SELECT policy on their own activity_log rows.
--    Previously only super_admins could read it, while users could insert
--    their own rows but never read them back.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
CREATE POLICY "Users can view their own activity"
  ON public.activity_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Pin a stable search_path on every SECURITY DEFINER function in `public`.
--    A mutable search_path lets a caller shadow built-in objects and is the
--    "Function Search Path Mutable" advisor warning. Setting it explicitly is
--    non-breaking. Done dynamically so we cover existing functions without
--    rewriting their bodies.
-- ----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Revoke EXECUTE from public/anon/authenticated on SECURITY DEFINER
--    trigger functions. Trigger functions are invoked by the trigger
--    mechanism (running as the table owner) and are never meant to be called
--    directly, so removing the EXECUTE grant is safe and closes the
--    "Public/Signed-In Users Can Execute SECURITY DEFINER Function" warnings
--    for these functions. Functions used inside RLS policies (has_role,
--    is_admin, ...) and client RPCs are intentionally left callable.
-- ----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t      ON t.oid = p.prorettype
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND t.typname = 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;
