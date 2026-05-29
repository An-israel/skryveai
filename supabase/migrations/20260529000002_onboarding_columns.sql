ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS rate_currency text DEFAULT 'NGN';
ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS hiring_categories text[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS typical_budget text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
