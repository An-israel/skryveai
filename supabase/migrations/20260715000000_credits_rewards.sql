-- Credits & Rewards (Build Spec Feature 2).
-- Phase 1: in-platform credits (earn for real actions, spend on perks). LIVE.
-- Phase 2: cash withdrawal path — built but locked behind cash_rewards_enabled.
-- All balance changes go through SECURITY DEFINER RPCs (transactional, row-locked);
-- the ledger is append-only. Clients can never mutate balances directly.

-- ── Platform flags (public-readable) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_flags (
  key        text PRIMARY KEY,
  bool_value boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_flags (key, bool_value) VALUES ('cash_rewards_enabled', false)
  ON CONFLICT (key) DO NOTHING;

-- ── Wallets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_balance         integer NOT NULL DEFAULT 0,
  cash_balance_kobo      bigint  NOT NULL DEFAULT 0,   -- Phase 2 only; stays 0 until enabled
  lifetime_credits_earned integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── Append-only credit ledger ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer NOT NULL,                    -- always positive; direction from `type`
  type          text NOT NULL,                       -- earn | spend | adjust
  reason        text NOT NULL,                       -- action_key or spend item key
  reference_id  text,                                -- job/referral/course id that caused it
  balance_after integer NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_time ON public.credit_transactions(user_id, created_at DESC);
-- Idempotency: a given (user, action, reference) can only ever earn once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_earn_ref
  ON public.credit_transactions(user_id, reason, reference_id)
  WHERE type = 'earn' AND reference_id IS NOT NULL;

-- ── Cash ledger (Phase 2) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo        bigint NOT NULL,
  type               text NOT NULL,                  -- earn | withdraw | reverse
  reason             text,
  reference_id       text,
  status             text NOT NULL DEFAULT 'pending',-- pending | completed | failed
  balance_after_kobo bigint NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Reward rules (what each action pays; editable without code) ───────────────
CREATE TABLE IF NOT EXISTS public.reward_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key       text NOT NULL UNIQUE,
  credit_amount    integer NOT NULL DEFAULT 0,
  cash_amount_kobo bigint  NOT NULL DEFAULT 0,
  enabled          boolean NOT NULL DEFAULT true,
  daily_cap        integer,                          -- NULL = uncapped
  sort_order       integer NOT NULL DEFAULT 0,
  description      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Spend items (the in-platform sinks) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spend_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key      text NOT NULL UNIQUE,
  cost_credits  integer NOT NULL,
  duration_secs integer,                             -- for time-boxed perks (pro pass, featured)
  enabled       boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  name          text NOT NULL,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Entitlements a user bought with credits (perk grants + expiry).
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key   text NOT NULL,
  reference_id text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON public.credit_purchases(user_id, created_at DESC);

-- ── Withdrawal requests (Phase 2) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo    bigint NOT NULL,
  status         text NOT NULL DEFAULT 'pending',    -- pending | approved | paid | rejected
  method         text,
  destination    jsonb NOT NULL DEFAULT '{}',
  requested_at   timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz,
  failure_reason text
);

-- ── Seed reward rules ────────────────────────────────────────────────────────
INSERT INTO public.reward_rules (action_key, credit_amount, enabled, daily_cap, sort_order, description)
SELECT * FROM (VALUES
  ('job_completed',       500, true, NULL, 10, 'Complete a job'),
  ('got_hired',           300, true, NULL, 20, 'Get hired for a job'),
  ('five_star_review',    150, true, NULL, 30, 'Receive a 5-star review'),
  ('referral_first_job',  300, true, NULL, 40, 'A friend you referred lands their first job'),
  ('course_completed',    200, true, NULL, 50, 'Complete a course'),
  ('referral_joined',     100, true, 5,    60, 'A referred friend joins and verifies'),
  ('certificate_earned',  100, true, NULL, 70, 'Earn a certificate'),
  ('profile_completed',    50, true, NULL, 80, 'Complete your profile (one-time)'),
  ('application_streak_7', 50, true, NULL, 90, 'Keep a 7-day application streak'),
  ('learning_streak_7',    50, true, NULL, 100,'Keep a 7-day learning streak'),
  ('daily_active',          5, true, 1,    110,'Check in today')
) AS v(action_key, credit_amount, enabled, daily_cap, sort_order, description)
WHERE NOT EXISTS (SELECT 1 FROM public.reward_rules);

-- ── Seed spend items ─────────────────────────────────────────────────────────
INSERT INTO public.spend_items (item_key, cost_credits, duration_secs, sort_order, name, description)
SELECT * FROM (VALUES
  ('job_application_boost', 200, NULL,       10, 'Application Boost',   'Push your application to the top of a client''s list for one job'),
  ('proposal_priority',     150, NULL,       20, 'Enhanced Proposal',   'AI writes an enhanced, priority proposal'),
  ('extra_ai_proposals',    300, 86400,      30, '+10 AI Proposals',    '10 extra AI proposals today'),
  ('featured_profile_24h',  500, 86400,      40, 'Featured Profile',    'Featured in talent search for 24 hours'),
  ('pro_day_pass',          800, 86400,      50, 'Pro Day Pass',        '1 day of Pro features'),
  ('course_unlock',        1000, NULL,       60, 'Unlock a Course',     'Unlock a premium course'),
  ('pro_week_pass',        4000, 604800,     70, 'Pro Week Pass',       '1 week of Pro features')
) AS v(item_key, cost_credits, duration_secs, sort_order, name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.spend_items);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.platform_flags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flags_read ON public.platform_flags;
CREATE POLICY flags_read ON public.platform_flags FOR SELECT USING (true);
DROP POLICY IF EXISTS flags_admin ON public.platform_flags;
CREATE POLICY flags_admin ON public.platform_flags FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS wallets_read_own ON public.wallets;
CREATE POLICY wallets_read_own ON public.wallets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS credit_tx_read_own ON public.credit_transactions;
CREATE POLICY credit_tx_read_own ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS cash_tx_read_own ON public.cash_transactions;
CREATE POLICY cash_tx_read_own ON public.cash_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS purchases_read_own ON public.credit_purchases;
CREATE POLICY purchases_read_own ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS reward_rules_read ON public.reward_rules;
CREATE POLICY reward_rules_read ON public.reward_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS reward_rules_admin ON public.reward_rules;
CREATE POLICY reward_rules_admin ON public.reward_rules FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS spend_items_read ON public.spend_items;
CREATE POLICY spend_items_read ON public.spend_items FOR SELECT USING (true);
DROP POLICY IF EXISTS spend_items_admin ON public.spend_items;
CREATE POLICY spend_items_admin ON public.spend_items FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS withdrawals_read_own ON public.withdrawal_requests;
CREATE POLICY withdrawals_read_own ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS withdrawals_admin ON public.withdrawal_requests;
CREATE POLICY withdrawals_admin ON public.withdrawal_requests FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── Engine: ensure wallet (locked) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._wallet_locked(_uid uuid)
RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE w public.wallets;
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  RETURN w;
END;
$fn$;

-- ── Engine: award credits for an action (the single source of truth) ─────────
-- Locks the wallet, enforces the rule being enabled, per-reference idempotency,
-- and the daily cap, then appends to the ledger. Called by both the client-facing
-- credits_earn RPC and every server-side earning trigger, so the anti-farming
-- rules live in exactly one place.
CREATE OR REPLACE FUNCTION public._award_credits(_uid uuid, _action_key text, _reference_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r public.reward_rules%ROWTYPE; w public.wallets; used integer; bal integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_user'); END IF;

  SELECT * INTO r FROM public.reward_rules WHERE action_key = _action_key;
  IF NOT FOUND OR NOT r.enabled OR r.credit_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disabled');
  END IF;

  w := public._wallet_locked(_uid);

  IF _reference_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions
      WHERE user_id = _uid AND reason = _action_key AND reference_id = _reference_id AND type = 'earn'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already', 'balance', w.credit_balance);
  END IF;

  IF r.daily_cap IS NOT NULL THEN
    SELECT count(*) INTO used FROM public.credit_transactions
      WHERE user_id = _uid AND reason = _action_key AND type = 'earn'
        AND created_at >= date_trunc('day', now());
    IF used >= r.daily_cap THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'cap', 'balance', w.credit_balance);
    END IF;
  END IF;

  UPDATE public.wallets
     SET credit_balance = credit_balance + r.credit_amount,
         lifetime_credits_earned = lifetime_credits_earned + r.credit_amount,
         updated_at = now()
   WHERE user_id = _uid
   RETURNING credit_balance INTO bal;

  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after)
    VALUES (_uid, r.credit_amount, 'earn', _action_key, _reference_id, bal);

  RETURN jsonb_build_object('ok', true, 'credited', r.credit_amount, 'balance', bal,
                            'reason', _action_key, 'description', r.description);
END;
$fn$;

-- ── Earn credits (client-facing; delegates to the engine as the current user) ─
CREATE OR REPLACE FUNCTION public.credits_earn(_action_key text, _reference_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN public._award_credits(me, _action_key, _reference_id);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.credits_earn(text, text) TO authenticated;

-- ── Spend credits (generic) ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credits_spend(_amount integer, _reason text, _reference_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); w public.wallets; bal integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  w := public._wallet_locked(me);
  IF w.credit_balance < _amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', w.credit_balance);
  END IF;
  UPDATE public.wallets SET credit_balance = credit_balance - _amount, updated_at = now()
    WHERE user_id = me RETURNING credit_balance INTO bal;
  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after)
    VALUES (me, _amount, 'spend', _reason, _reference_id, bal);
  RETURN jsonb_build_object('ok', true, 'spent', _amount, 'balance', bal);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.credits_spend(integer, text, text) TO authenticated;

-- ── Buy a store item (spend + grant entitlement) ────────────────────────────
CREATE OR REPLACE FUNCTION public.credits_buy(_item_key text, _reference_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); it public.spend_items%ROWTYPE; w public.wallets; bal integer; exp timestamptz;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO it FROM public.spend_items WHERE item_key = _item_key;
  IF NOT FOUND OR NOT it.enabled THEN RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;

  w := public._wallet_locked(me);
  IF w.credit_balance < it.cost_credits THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', w.credit_balance,
                              'needed', it.cost_credits - w.credit_balance);
  END IF;

  UPDATE public.wallets SET credit_balance = credit_balance - it.cost_credits, updated_at = now()
    WHERE user_id = me RETURNING credit_balance INTO bal;
  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after)
    VALUES (me, it.cost_credits, 'spend', _item_key, _reference_id, bal);

  exp := CASE WHEN it.duration_secs IS NULL THEN NULL ELSE now() + make_interval(secs => it.duration_secs) END;
  INSERT INTO public.credit_purchases (user_id, item_key, reference_id, expires_at)
    VALUES (me, _item_key, _reference_id, exp);

  RETURN jsonb_build_object('ok', true, 'spent', it.cost_credits, 'balance', bal,
                            'item', it.item_key, 'expires_at', exp);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.credits_buy(text, text) TO authenticated;

-- ── Read helpers ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credits_balance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); w public.wallets;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (me) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = me;
  RETURN jsonb_build_object(
    'credits', w.credit_balance,
    'cash_kobo', w.cash_balance_kobo,
    'lifetime', w.lifetime_credits_earned,
    'cash_enabled', COALESCE((SELECT bool_value FROM public.platform_flags WHERE key = 'cash_rewards_enabled'), false)
  );
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.credits_balance() TO authenticated;

CREATE OR REPLACE FUNCTION public.credits_history(_limit integer DEFAULT 40)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT id, amount, type, reason, reference_id, balance_after, created_at
    FROM public.credit_transactions
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 200)
  ) t;
$fn$;
GRANT EXECUTE ON FUNCTION public.credits_history(integer) TO authenticated;

-- ── Phase 2: request a withdrawal (gated by the flag) ────────────────────────
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount_kobo bigint, _method text, _destination jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE me uuid := auth.uid(); w public.wallets; v_enabled boolean; v_min bigint := 500000; -- ₦5,000
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT bool_value INTO v_enabled FROM public.platform_flags WHERE key = 'cash_rewards_enabled';
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cash_disabled');
  END IF;
  IF _amount_kobo < v_min THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum', 'minimum_kobo', v_min);
  END IF;
  w := public._wallet_locked(me);
  IF w.cash_balance_kobo < _amount_kobo THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_cash');
  END IF;
  INSERT INTO public.withdrawal_requests (user_id, amount_kobo, method, destination)
    VALUES (me, _amount_kobo, _method, COALESCE(_destination, '{}'::jsonb));
  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(bigint, text, jsonb) TO authenticated;

-- ── Earning triggers on real events ──────────────────────────────────────────
-- Every trigger delegates to _award_credits, which enforces enabled/idempotency/cap.
-- A trigger firing a second time is harmless: the per-reference guard rejects it.

-- profile_completed: when gamification profile completion first hits 100%.
CREATE OR REPLACE FUNCTION public.credits_on_profile_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.profile_completion_percent >= 100 AND COALESCE(OLD.profile_completion_percent, 0) < 100 THEN
    PERFORM public._award_credits(NEW.user_id, 'profile_completed', NEW.user_id::text);
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_profile_complete ON public.user_stats;
CREATE TRIGGER trg_credits_profile_complete
  AFTER UPDATE OF profile_completion_percent ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_profile_complete();

-- got_hired: when a marketplace application transitions to 'hired'. The
-- applications table keys on talent_profiles.id, so we resolve the auth user.
CREATE OR REPLACE FUNCTION public.credits_on_hired()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE uid uuid;
BEGIN
  IF NEW.status::text = 'hired' AND COALESCE(OLD.status::text, '') <> 'hired' THEN
    SELECT user_id INTO uid FROM public.talent_profiles WHERE id = NEW.talent_id;
    PERFORM public._award_credits(uid, 'got_hired', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_hired ON public.applications;
CREATE TRIGGER trg_credits_hired
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_hired();

-- job_completed: when a project transitions to 'completed' (the talent earns).
CREATE OR REPLACE FUNCTION public.credits_on_project_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE uid uuid;
BEGIN
  IF NEW.status::text = 'completed' AND COALESCE(OLD.status::text, '') <> 'completed' THEN
    SELECT user_id INTO uid FROM public.talent_profiles WHERE id = NEW.talent_id;
    PERFORM public._award_credits(uid, 'job_completed', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_project_complete ON public.projects;
CREATE TRIGGER trg_credits_project_complete
  AFTER UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_project_complete();

-- five_star_review: the reviewee earns when they receive a 5-star review.
CREATE OR REPLACE FUNCTION public.credits_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.rating = 5 THEN
    PERFORM public._award_credits(NEW.reviewee_id, 'five_star_review', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_review ON public.reviews;
CREATE TRIGGER trg_credits_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_review();

-- referral_joined: the referrer earns when a friend joins via their code
-- (daily-capped at 5 in the rule, so it can't be farmed). referral_first_job is
-- awarded when that referral is marked completed (their first paid job).
CREATE OR REPLACE FUNCTION public.credits_on_referral_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  PERFORM public._award_credits(NEW.referrer_id, 'referral_joined', NEW.referred_id::text);
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_referral_insert ON public.referrals;
CREATE TRIGGER trg_credits_referral_insert
  AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_referral_insert();

CREATE OR REPLACE FUNCTION public.credits_on_referral_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    PERFORM public._award_credits(NEW.referrer_id, 'referral_first_job', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_referral_complete ON public.referrals;
CREATE TRIGGER trg_credits_referral_complete
  AFTER UPDATE OF status ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_referral_complete();

-- streaks: award each completed 7-day block once. Reference is (count / 7) so 7,
-- 14, 21… each pay a single time, and a reset that climbs back re-earns fairly.
CREATE OR REPLACE FUNCTION public.credits_on_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE action_key text; block integer;
BEGIN
  IF NEW.current_count > 0 AND NEW.current_count % 7 = 0
     AND NEW.current_count <> COALESCE(OLD.current_count, 0) THEN
    action_key := CASE NEW.streak_type
                    WHEN 'application' THEN 'application_streak_7'
                    WHEN 'learning'    THEN 'learning_streak_7'
                    ELSE NULL END;
    IF action_key IS NOT NULL THEN
      block := NEW.current_count / 7;
      PERFORM public._award_credits(NEW.user_id, action_key, NEW.user_id::text || ':' || block::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_credits_streak ON public.streaks;
CREATE TRIGGER trg_credits_streak
  AFTER INSERT OR UPDATE OF current_count ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.credits_on_streak();
