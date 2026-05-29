ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'NGN';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS job_post_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS talent_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

DO $$ BEGIN
  CREATE POLICY "job_posts_client_manage" ON public.job_posts FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.client_profiles cp
        WHERE cp.id = client_id AND cp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "job_posts_talent_select" ON public.job_posts FOR SELECT
    USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
