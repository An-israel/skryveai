-- Webinar promise: give every user Sonder access for 48 hours. Deliberately
-- NOT implemented by changing anyone's subscriptions.plan — that would (a)
-- require picking a real plan to bulk-write onto every account, including
-- free users who'd then need to be bulk-reverted afterward, and (b) leave a
-- window where Sonder's per-plan credit/billing logic sees a plan that was
-- never actually purchased. Instead: a simple, generic, time-boxed flag
-- that both the client entitlement check and the Sonder cron job read
-- directly. Nothing to revert after 48 hours — the row just expires.

CREATE TABLE IF NOT EXISTS public.platform_promotions (
  key text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_promotions ENABLE ROW LEVEL SECURITY;

-- Every signed-in user's client needs to read this to know whether Sonder
-- is unlocked right now; it carries no sensitive data.
DROP POLICY IF EXISTS "promotions_select_all" ON public.platform_promotions;
CREATE POLICY "promotions_select_all" ON public.platform_promotions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "promotions_admin_write" ON public.platform_promotions;
CREATE POLICY "promotions_admin_write" ON public.platform_promotions FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.platform_promotions (key, expires_at, note)
VALUES (
  'sonder_webinar_promo',
  now() + interval '48 hours',
  'Sonder promised free to all users during the webinar — auto-expires, no manual revert needed'
)
ON CONFLICT (key) DO UPDATE SET
  expires_at = EXCLUDED.expires_at,
  note = EXCLUDED.note,
  updated_at = now();
