-- ============================================================================
-- Job aggregator: allow any source platform + index for freshness ordering
-- ============================================================================
-- aggregated_jobs.platform was a restrictive enum (skryve_agg_platform) that
-- only allowed a fixed set of values. The scraper writes platform identifiers
-- such as 'weworkremotely', 'remotive', 'arbeitnow', 'jobicy' and 'himalayas'
-- which were NOT in the enum, so every one of those upserts failed and the
-- feed stayed empty. Convert the column to free-form text so new open-apply
-- job boards can be added without a schema change.
-- ============================================================================

ALTER TABLE public.aggregated_jobs
  ALTER COLUMN platform TYPE text USING platform::text;

-- The enum type is now unused (only this column referenced it). Drop it so it
-- can't silently reintroduce the same constraint later.
DROP TYPE IF EXISTS public.skryve_agg_platform;

-- The feed orders by posted_at DESC and filters on is_active + recency, so back
-- those queries with an index.
CREATE INDEX IF NOT EXISTS idx_agg_jobs_active_posted
  ON public.aggregated_jobs (is_active, posted_at DESC);
