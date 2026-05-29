ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS marketplace_job_id uuid REFERENCES job_posts(id) ON DELETE SET NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS rate_type text DEFAULT 'fixed';
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS timeline text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS portfolio_item_ids text[] DEFAULT '{}';
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS counter_rate numeric;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS counter_timeline text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS counter_note text;

ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS marketplace_job_id uuid REFERENCES job_posts(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.marketplace_jobs AS
  SELECT
    jp.*,
    cp.company_name,
    cp.logo_url,
    cp.industry,
    cp.is_verified AS verified,
    cp.user_id   AS client_user_id,
    cp.total_hires,
    cp.rating_avg
  FROM public.job_posts jp
  LEFT JOIN public.client_profiles cp ON cp.id = jp.client_id;
