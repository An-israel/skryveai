-- job_applications.status only allowed applied/replied/interview/offer/rejected,
-- but the marketplace hiring UI (shortlist, send offer, negotiate/counter, hire)
-- writes shortlisted/offer_sent/offer_received/countered/hired — every one of
-- those updates has been silently rejected by Postgres (23514) since the
-- constraint was added, while the UI reports success at each step regardless
-- (none of the call sites checked the update for an error). Widen the
-- constraint to the real set of statuses in use across both the personal
-- application tracker and the marketplace hiring flow.

ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN (
    'applied', 'replied', 'interview', 'offer', 'rejected',   -- personal tracker
    'pending', 'viewed', 'shortlisted',                       -- marketplace: pre-offer
    'offer_sent', 'offer_received', 'countered', 'hired'      -- marketplace: offer stage
  ));
