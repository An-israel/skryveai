ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_amount numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency text DEFAULT 'NGN';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS talent_review_submitted boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title text;

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.project_deliverables (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  file_url         text,
  file_name        text,
  external_url     text,
  delivery_note    text,
  client_feedback  text,
  status           text not null default 'pending_review',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.talent_reviews (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid references public.projects(id) on delete set null,
  reviewer_id           uuid,
  reviewee_id           uuid,
  review_text           text,
  rating                integer check (rating >= 1 and rating <= 5),
  review_type           text default 'talent_to_client',
  created_at            timestamptz not null default now()
);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "milestone_parties" ON public.project_milestones FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND (
            EXISTS (SELECT 1 FROM public.talent_profiles tp WHERE tp.id = p.talent_id AND tp.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = p.client_id AND cp.user_id = auth.uid())
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "deliverable_parties" ON public.project_deliverables FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND (
            EXISTS (SELECT 1 FROM public.talent_profiles tp WHERE tp.id = p.talent_id AND tp.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = p.client_id AND cp.user_id = auth.uid())
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "reviews_select" ON public.talent_reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "reviews_insert_own" ON public.talent_reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
