ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS rate_proposed numeric;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS proposal_text text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS external_url text;
