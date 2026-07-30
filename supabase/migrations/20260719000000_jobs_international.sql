-- Reposition the job aggregator around international / remote work (August Prompt 1).
-- Adds classification flags to aggregated_jobs and a trigger that fills them from
-- the listing text, so both existing rows and every future scraped row are tagged
-- without changing the scraper. The feed can then surface international/remote first.

ALTER TABLE public.aggregated_jobs ADD COLUMN IF NOT EXISTS is_remote             boolean NOT NULL DEFAULT false;
ALTER TABLE public.aggregated_jobs ADD COLUMN IF NOT EXISTS is_international       boolean NOT NULL DEFAULT false;
ALTER TABLE public.aggregated_jobs ADD COLUMN IF NOT EXISTS pays_foreign_currency boolean NOT NULL DEFAULT false;
ALTER TABLE public.aggregated_jobs ADD COLUMN IF NOT EXISTS pay_currency          text;

-- Classifier: derive the flags from the listing's text. Heuristic, and safe to
-- re-run — it only reads title/description/location/budget.
CREATE OR REPLACE FUNCTION public.classify_aggregated_job()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE t text; loc text; local_africa boolean; foreign_cur boolean;
BEGIN
  t   := lower(concat_ws(' ', NEW.title, NEW.description, NEW.location, NEW.budget));
  loc := lower(coalesce(NEW.location, ''));

  NEW.is_remote := t ~ '(remote|work from home|wfh|anywhere|distributed team|fully remote)';

  foreign_cur := t ~ '(\$|usd|us\$|£|gbp|€|eur|dollar|pound sterling|euro)';
  NEW.pays_foreign_currency := foreign_cur;
  NEW.pay_currency := CASE
    WHEN t ~ '(\$|usd|us\$|dollar)' THEN 'USD'
    WHEN t ~ '(£|gbp|pound)'        THEN 'GBP'
    WHEN t ~ '(€|eur|euro)'         THEN 'EUR'
    ELSE NEW.pay_currency
  END;

  -- Is the role anchored to a specific African locality (i.e. a local job)?
  local_africa := loc ~ '(nigeria|lagos|abuja|ibadan|kano|port harcourt|benin city|ghana|accra|kenya|nairobi|south africa|johannesburg|cape town|uganda|kampala|tanzania|rwanda|kigali|africa)';

  NEW.is_international :=
       foreign_cur
    OR t ~ '(worldwide|globally|global|international|us[- ]based|uk[- ]based|u\.s\.|united states|united kingdom|europe|european|canada|australia|north america)'
    OR (NEW.is_remote AND NOT local_africa);

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_classify_aggregated_job ON public.aggregated_jobs;
CREATE TRIGGER trg_classify_aggregated_job
  BEFORE INSERT OR UPDATE OF title, description, location, budget ON public.aggregated_jobs
  FOR EACH ROW EXECUTE FUNCTION public.classify_aggregated_job();

-- Backfill existing rows (fires the trigger via a no-op-ish touch on classified cols).
UPDATE public.aggregated_jobs SET title = title;

-- Feed reads "active international/remote, newest first".
CREATE INDEX IF NOT EXISTS idx_agg_jobs_international
  ON public.aggregated_jobs (is_active, is_international, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_agg_jobs_remote
  ON public.aggregated_jobs (is_active, is_remote, posted_at DESC);
