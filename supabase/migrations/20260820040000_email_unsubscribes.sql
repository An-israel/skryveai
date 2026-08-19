-- email-webhook's "unsubscribe" link was a stub — it logged to console and
-- showed a confirmation page, but never recorded anything, so a user who
-- "unsubscribed" kept getting the same emails. Give it somewhere real to
-- write to (only admins need to read it — the outreach/campaign sender this
-- was built for, process-email-queue, isn't part of the current deployed
-- function set, so nothing checks this list yet, but the opt-out itself is
-- now real instead of fabricated).
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email             text PRIMARY KEY,
  unsubscribed_at   timestamptz NOT NULL DEFAULT now(),
  source_email_id   uuid
);
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "unsub_admin_read" ON public.email_unsubscribes FOR SELECT
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
