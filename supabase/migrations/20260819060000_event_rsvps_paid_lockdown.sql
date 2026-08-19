-- "Buy Ticket" on a paid event just inserted an RSVP with payment_status:
-- 'pending' — there was no Paystack call anywhere in that path (and the
-- Paystack inline script wasn't even loaded, see index.html), so attendees
-- got in for free and the pending status never resolved. "rsvp_insert_own"
-- let the client insert an RSVP for ANY event regardless of price. Paid-event
-- RSVPs now only get created by verify-event-payment (service role, after
-- verifying the charge) — restrict client inserts to free events only.

DROP POLICY IF EXISTS "rsvp_insert_own" ON public.event_rsvps;

DO $$ BEGIN
  CREATE POLICY "rsvp_insert_free_event" ON public.event_rsvps FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.price_type = 'free')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Separately: no DELETE policy existed at all for this table, so "cancel RSVP"
-- (EventDetail.tsx / Events.tsx) has always silently deleted zero rows under
-- RLS. Own-row cancellation is safe to allow outright (no payment involved).
DO $$ BEGIN
  CREATE POLICY "rsvp_delete_own" ON public.event_rsvps FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
