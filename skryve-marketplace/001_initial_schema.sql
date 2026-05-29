-- ============================================================
-- Skryve Marketplace – Initial Schema
-- Run ONLY this file in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Enums ────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('talent', 'client', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('pending', 'reviewed', 'shortlisted', 'rejected', 'accepted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum ('pending', 'accepted', 'declined', 'withdrawn', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('active', 'paused', 'completed', 'cancelled', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type milestone_status as enum ('pending', 'in_progress', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'processing', 'completed', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'application_received', 'application_status_changed',
    'offer_received', 'offer_status_changed',
    'project_update', 'milestone_update',
    'message_received', 'payment_update',
    'review_received', 'system'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('entry', 'intermediate', 'expert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_type as enum ('fixed', 'hourly');
exception when duplicate_object then null; end $$;

-- ── 1. users ──────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  role          user_role not null default 'talent',
  bio           text,
  location      text,
  timezone      text,
  website       text,
  is_verified   boolean not null default false,
  is_active     boolean not null default true,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. categories ─────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  icon        text,
  description text,
  parent_id   uuid references public.categories(id) on delete set null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 3. skills ─────────────────────────────────────────────────
create table if not exists public.skills (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── 4. talent_profiles ────────────────────────────────────────
create table if not exists public.talent_profiles (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null unique references public.users(id) on delete cascade,
  headline             text,
  hourly_rate          numeric(10,2),
  experience_level     experience_level,
  availability         text,                    -- e.g. 'full-time', 'part-time', 'weekends'
  years_of_experience  int,
  languages            text[],
  response_time_hours  int,
  total_earnings       numeric(12,2) not null default 0,
  completed_projects   int not null default 0,
  avg_rating           numeric(3,2),
  total_reviews        int not null default 0,
  profile_views        int not null default 0,
  is_featured          boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── 5. talent_skills ──────────────────────────────────────────
create table if not exists public.talent_skills (
  id          uuid primary key default uuid_generate_v4(),
  talent_id   uuid not null references public.talent_profiles(id) on delete cascade,
  skill_id    uuid not null references public.skills(id) on delete cascade,
  level       text,
  created_at  timestamptz not null default now(),
  unique (talent_id, skill_id)
);

-- ── 6. portfolios ─────────────────────────────────────────────
create table if not exists public.portfolios (
  id          uuid primary key default uuid_generate_v4(),
  talent_id   uuid not null references public.talent_profiles(id) on delete cascade,
  title       text not null,
  description text,
  cover_url   text,
  project_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 7. portfolio_media ────────────────────────────────────────
create table if not exists public.portfolio_media (
  id           uuid primary key default uuid_generate_v4(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  url          text not null,
  media_type   text not null default 'image',
  caption      text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ── 8. client_profiles ────────────────────────────────────────
create table if not exists public.client_profiles (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null unique references public.users(id) on delete cascade,
  company_name        text,
  company_size        text,
  industry            text,
  company_website     text,
  company_logo_url    text,
  total_spent         numeric(12,2) not null default 0,
  posted_jobs         int not null default 0,
  completed_projects  int not null default 0,
  avg_rating          numeric(3,2),
  total_reviews       int not null default 0,
  payment_verified    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 9. job_posts ──────────────────────────────────────────────
create table if not exists public.job_posts (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.client_profiles(id) on delete cascade,
  title               text not null,
  description         text not null,
  category_id         uuid references public.categories(id) on delete set null,
  project_type        project_type not null default 'fixed',
  experience_level    experience_level,
  budget_min          numeric(10,2),
  budget_max          numeric(10,2),
  hourly_rate_min     numeric(10,2),
  hourly_rate_max     numeric(10,2),
  estimated_hours     int,
  duration_weeks      int,
  status              job_status not null default 'draft',
  applicant_count     int not null default 0,
  views               int not null default 0,
  is_featured         boolean not null default false,
  deadline            timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 10. job_skills ────────────────────────────────────────────
create table if not exists public.job_skills (
  id        uuid primary key default uuid_generate_v4(),
  job_id    uuid not null references public.job_posts(id) on delete cascade,
  skill_id  uuid not null references public.skills(id) on delete cascade,
  required  boolean not null default true,
  unique (job_id, skill_id)
);

-- ── 11. saved_jobs ────────────────────────────────────────────
create table if not exists public.saved_jobs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  job_id     uuid not null references public.job_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

-- ── 12. applications ──────────────────────────────────────────
create table if not exists public.applications (
  id               uuid primary key default uuid_generate_v4(),
  job_id           uuid not null references public.job_posts(id) on delete cascade,
  talent_id        uuid not null references public.talent_profiles(id) on delete cascade,
  cover_letter     text,
  proposed_rate    numeric(10,2),
  estimated_weeks  int,
  status           application_status not null default 'pending',
  client_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (job_id, talent_id)
);

-- ── 13. offers ────────────────────────────────────────────────
create table if not exists public.offers (
  id               uuid primary key default uuid_generate_v4(),
  job_id           uuid references public.job_posts(id) on delete set null,
  application_id   uuid references public.applications(id) on delete set null,
  client_id        uuid not null references public.client_profiles(id) on delete cascade,
  talent_id        uuid not null references public.talent_profiles(id) on delete cascade,
  title            text not null,
  description      text,
  project_type     project_type not null default 'fixed',
  amount           numeric(10,2) not null,
  duration_weeks   int,
  status           offer_status not null default 'pending',
  expires_at       timestamptz,
  talent_message   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── 14. projects ──────────────────────────────────────────────
create table if not exists public.projects (
  id             uuid primary key default uuid_generate_v4(),
  offer_id       uuid unique references public.offers(id) on delete set null,
  job_id         uuid references public.job_posts(id) on delete set null,
  client_id      uuid not null references public.client_profiles(id) on delete cascade,
  talent_id      uuid not null references public.talent_profiles(id) on delete cascade,
  title          text not null,
  description    text,
  project_type   project_type not null default 'fixed',
  total_amount   numeric(10,2),
  status         project_status not null default 'active',
  start_date     timestamptz,
  end_date       timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── 15. milestones ────────────────────────────────────────────
create table if not exists public.milestones (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  description  text,
  amount       numeric(10,2),
  due_date     timestamptz,
  status       milestone_status not null default 'pending',
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 16. payments ──────────────────────────────────────────────
create table if not exists public.payments (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  milestone_id    uuid references public.milestones(id) on delete set null,
  client_id       uuid not null references public.client_profiles(id) on delete cascade,
  talent_id       uuid not null references public.talent_profiles(id) on delete cascade,
  amount          numeric(10,2) not null,
  platform_fee    numeric(10,2) not null default 0,
  net_amount      numeric(10,2) not null,
  status          payment_status not null default 'pending',
  provider        text,
  provider_ref    text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 17. reviews ───────────────────────────────────────────────
create table if not exists public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  reviewer_id  uuid not null references public.users(id) on delete cascade,
  reviewee_id  uuid not null references public.users(id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),
  unique (project_id, reviewer_id)
);

-- ── 18. conversations ─────────────────────────────────────────
create table if not exists public.conversations (
  id                  uuid primary key default uuid_generate_v4(),
  participant_one_id  uuid not null references public.users(id) on delete cascade,
  participant_two_id  uuid not null references public.users(id) on delete cascade,
  job_id              uuid references public.job_posts(id) on delete set null,
  project_id          uuid references public.projects(id) on delete set null,
  last_message_at     timestamptz,
  created_at          timestamptz not null default now(),
  unique (participant_one_id, participant_two_id)
);

-- ── 19. messages ──────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  content         text not null,
  attachments     jsonb,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── 20. notifications ─────────────────────────────────────────
create table if not exists public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  type         notification_type not null,
  title        text not null,
  body         text,
  data         jsonb,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── 21. cvs ───────────────────────────────────────────────────
create table if not exists public.cvs (
  id          uuid primary key default uuid_generate_v4(),
  talent_id   uuid not null references public.talent_profiles(id) on delete cascade,
  title       text not null default 'My CV',
  summary     text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 22. cv_sections ───────────────────────────────────────────
create table if not exists public.cv_sections (
  id          uuid primary key default uuid_generate_v4(),
  cv_id       uuid not null references public.cvs(id) on delete cascade,
  type        text not null,       -- 'experience', 'education', 'certification', 'custom'
  title       text not null,
  content     jsonb not null default '{}',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 23. courses ───────────────────────────────────────────────
create table if not exists public.courses (
  id              uuid primary key default uuid_generate_v4(),
  creator_id      uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text,
  cover_url       text,
  category_id     uuid references public.categories(id) on delete set null,
  price           numeric(10,2) not null default 0,
  is_published    boolean not null default false,
  total_lessons   int not null default 0,
  enrolled_count  int not null default 0,
  avg_rating      numeric(3,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 24. lessons ───────────────────────────────────────────────
create table if not exists public.lessons (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  content     text,
  video_url   text,
  duration_s  int,
  sort_order  int not null default 0,
  is_free     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 25. enrollments ───────────────────────────────────────────
create table if not exists public.enrollments (
  id             uuid primary key default uuid_generate_v4(),
  course_id      uuid not null references public.courses(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  progress       int not null default 0 check (progress between 0 and 100),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (course_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
create index if not exists idx_users_email           on public.users(email);
create index if not exists idx_users_role            on public.users(role);

create index if not exists idx_talent_profiles_user  on public.talent_profiles(user_id);
create index if not exists idx_talent_profiles_rate  on public.talent_profiles(hourly_rate);
create index if not exists idx_talent_profiles_rating on public.talent_profiles(avg_rating desc);
create index if not exists idx_talent_profiles_featured on public.talent_profiles(is_featured) where is_featured = true;

create index if not exists idx_client_profiles_user  on public.client_profiles(user_id);

create index if not exists idx_talent_skills_talent  on public.talent_skills(talent_id);
create index if not exists idx_talent_skills_skill   on public.talent_skills(skill_id);

create index if not exists idx_portfolios_talent     on public.portfolios(talent_id);

create index if not exists idx_job_posts_client      on public.job_posts(client_id);
create index if not exists idx_job_posts_status      on public.job_posts(status);
create index if not exists idx_job_posts_category    on public.job_posts(category_id);
create index if not exists idx_job_posts_type        on public.job_posts(project_type);
create index if not exists idx_job_posts_created     on public.job_posts(created_at desc);
create index if not exists idx_job_posts_open        on public.job_posts(status) where status = 'open';

create index if not exists idx_job_skills_job        on public.job_skills(job_id);
create index if not exists idx_job_skills_skill      on public.job_skills(skill_id);

create index if not exists idx_saved_jobs_user       on public.saved_jobs(user_id);
create index if not exists idx_saved_jobs_job        on public.saved_jobs(job_id);

create index if not exists idx_applications_job      on public.applications(job_id);
create index if not exists idx_applications_talent   on public.applications(talent_id);
create index if not exists idx_applications_status   on public.applications(status);

create index if not exists idx_offers_client         on public.offers(client_id);
create index if not exists idx_offers_talent         on public.offers(talent_id);
create index if not exists idx_offers_status         on public.offers(status);
create index if not exists idx_offers_job            on public.offers(job_id);

create index if not exists idx_projects_client       on public.projects(client_id);
create index if not exists idx_projects_talent       on public.projects(talent_id);
create index if not exists idx_projects_status       on public.projects(status);
create index if not exists idx_projects_job          on public.projects(job_id);

create index if not exists idx_milestones_project    on public.milestones(project_id);
create index if not exists idx_milestones_status     on public.milestones(status);

create index if not exists idx_payments_project      on public.payments(project_id);
create index if not exists idx_payments_client       on public.payments(client_id);
create index if not exists idx_payments_talent       on public.payments(talent_id);
create index if not exists idx_payments_status       on public.payments(status);

create index if not exists idx_reviews_project       on public.reviews(project_id);
create index if not exists idx_reviews_reviewee      on public.reviews(reviewee_id);

create index if not exists idx_conversations_p1      on public.conversations(participant_one_id);
create index if not exists idx_conversations_p2      on public.conversations(participant_two_id);
create index if not exists idx_conversations_last    on public.conversations(last_message_at desc);

create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sender       on public.messages(sender_id);
create index if not exists idx_messages_created      on public.messages(created_at desc);
create index if not exists idx_messages_unread       on public.messages(conversation_id, is_read) where is_read = false;

create index if not exists idx_notifications_user    on public.notifications(user_id);
create index if not exists idx_notifications_unread  on public.notifications(user_id, is_read) where is_read = false;
create index if not exists idx_notifications_created on public.notifications(created_at desc);

create index if not exists idx_cvs_talent            on public.cvs(talent_id);
create index if not exists idx_cv_sections_cv        on public.cv_sections(cv_id);

create index if not exists idx_courses_creator       on public.courses(creator_id);
create index if not exists idx_courses_published     on public.courses(is_published) where is_published = true;
create index if not exists idx_courses_category      on public.courses(category_id);

create index if not exists idx_lessons_course        on public.lessons(course_id);

create index if not exists idx_enrollments_user      on public.enrollments(user_id);
create index if not exists idx_enrollments_course    on public.enrollments(course_id);

-- Full-text search
create index if not exists idx_job_posts_fts on public.job_posts
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
create index if not exists idx_talent_fts on public.talent_profiles
  using gin(to_tsvector('english', coalesce(headline,'')));
create index if not exists idx_skills_trgm on public.skills using gin(name gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
alter table public.users              enable row level security;
alter table public.categories         enable row level security;
alter table public.skills             enable row level security;
alter table public.talent_profiles    enable row level security;
alter table public.talent_skills      enable row level security;
alter table public.portfolios         enable row level security;
alter table public.portfolio_media    enable row level security;
alter table public.client_profiles    enable row level security;
alter table public.job_posts          enable row level security;
alter table public.job_skills         enable row level security;
alter table public.saved_jobs         enable row level security;
alter table public.applications       enable row level security;
alter table public.offers             enable row level security;
alter table public.projects           enable row level security;
alter table public.milestones         enable row level security;
alter table public.payments           enable row level security;
alter table public.reviews            enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.notifications      enable row level security;
alter table public.cvs                enable row level security;
alter table public.cv_sections        enable row level security;
alter table public.courses            enable row level security;
alter table public.lessons            enable row level security;
alter table public.enrollments        enable row level security;

-- ── users policies ────────────────────────────────────────────
do $$ begin
  create policy "users_select_own" on public.users for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "users_select_public" on public.users for select using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "users_update_own" on public.users for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- ── categories & skills (public read) ─────────────────────────
do $$ begin
  create policy "categories_select_all" on public.categories for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "skills_select_all" on public.skills for select using (true);
exception when duplicate_object then null; end $$;

-- ── talent_profiles ───────────────────────────────────────────
do $$ begin
  create policy "talent_profiles_select_all" on public.talent_profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "talent_profiles_insert_own" on public.talent_profiles for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "talent_profiles_update_own" on public.talent_profiles for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── talent_skills ─────────────────────────────────────────────
do $$ begin
  create policy "talent_skills_select_all" on public.talent_skills for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "talent_skills_insert_own" on public.talent_skills for insert
    with check (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "talent_skills_delete_own" on public.talent_skills for delete
    using (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── portfolios ────────────────────────────────────────────────
do $$ begin
  create policy "portfolios_select_all" on public.portfolios for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "portfolios_insert_own" on public.portfolios for insert
    with check (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "portfolios_update_own" on public.portfolios for update
    using (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "portfolios_delete_own" on public.portfolios for delete
    using (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── portfolio_media ───────────────────────────────────────────
do $$ begin
  create policy "portfolio_media_select_all" on public.portfolio_media for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "portfolio_media_manage_own" on public.portfolio_media for all
    using (exists (
      select 1 from public.portfolios p
      join public.talent_profiles tp on tp.id = p.talent_id
      where p.id = portfolio_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── client_profiles ───────────────────────────────────────────
do $$ begin
  create policy "client_profiles_select_all" on public.client_profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "client_profiles_insert_own" on public.client_profiles for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "client_profiles_update_own" on public.client_profiles for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── job_posts ─────────────────────────────────────────────────
do $$ begin
  create policy "job_posts_select_open" on public.job_posts for select
    using (status = 'open' or exists (
      select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job_posts_insert_client" on public.job_posts for insert
    with check (exists (
      select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job_posts_update_client" on public.job_posts for update
    using (exists (
      select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job_posts_delete_client" on public.job_posts for delete
    using (exists (
      select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── job_skills ────────────────────────────────────────────────
do $$ begin
  create policy "job_skills_select_all" on public.job_skills for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job_skills_manage_client" on public.job_skills for all
    using (exists (
      select 1 from public.job_posts jp
      join public.client_profiles cp on cp.id = jp.client_id
      where jp.id = job_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── saved_jobs ────────────────────────────────────────────────
do $$ begin
  create policy "saved_jobs_own" on public.saved_jobs for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── applications ──────────────────────────────────────────────
do $$ begin
  create policy "applications_select_parties" on public.applications for select
    using (
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
      or
      exists (select 1 from public.job_posts jp join public.client_profiles cp on cp.id = jp.client_id where jp.id = job_id and cp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "applications_insert_talent" on public.applications for insert
    with check (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "applications_update_parties" on public.applications for update
    using (
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
      or
      exists (select 1 from public.job_posts jp join public.client_profiles cp on cp.id = jp.client_id where jp.id = job_id and cp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

-- ── offers ────────────────────────────────────────────────────
do $$ begin
  create policy "offers_select_parties" on public.offers for select
    using (
      exists (select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid())
      or
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "offers_insert_client" on public.offers for insert
    with check (exists (
      select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "offers_update_parties" on public.offers for update
    using (
      exists (select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid())
      or
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

-- ── projects ──────────────────────────────────────────────────
do $$ begin
  create policy "projects_select_parties" on public.projects for select
    using (
      exists (select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid())
      or
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "projects_update_parties" on public.projects for update
    using (
      exists (select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid())
      or
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

-- ── milestones ────────────────────────────────────────────────
do $$ begin
  create policy "milestones_select_parties" on public.milestones for select
    using (exists (
      select 1 from public.projects p
      where p.id = project_id
      and (
        exists (select 1 from public.client_profiles cp where cp.id = p.client_id and cp.user_id = auth.uid())
        or
        exists (select 1 from public.talent_profiles tp where tp.id = p.talent_id and tp.user_id = auth.uid())
      )
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "milestones_manage_client" on public.milestones for all
    using (exists (
      select 1 from public.projects p
      join public.client_profiles cp on cp.id = p.client_id
      where p.id = project_id and cp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── payments ──────────────────────────────────────────────────
do $$ begin
  create policy "payments_select_parties" on public.payments for select
    using (
      exists (select 1 from public.client_profiles cp where cp.id = client_id and cp.user_id = auth.uid())
      or
      exists (select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

-- ── reviews ───────────────────────────────────────────────────
do $$ begin
  create policy "reviews_select_all" on public.reviews for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reviews_insert_own" on public.reviews for insert
    with check (auth.uid() = reviewer_id);
exception when duplicate_object then null; end $$;

-- ── conversations ─────────────────────────────────────────────
do $$ begin
  create policy "conversations_select_participants" on public.conversations for select
    using (auth.uid() = participant_one_id or auth.uid() = participant_two_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "conversations_insert_auth" on public.conversations for insert
    with check (auth.uid() = participant_one_id or auth.uid() = participant_two_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "conversations_update_participants" on public.conversations for update
    using (auth.uid() = participant_one_id or auth.uid() = participant_two_id);
exception when duplicate_object then null; end $$;

-- ── messages ──────────────────────────────────────────────────
do $$ begin
  create policy "messages_select_participants" on public.messages for select
    using (exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_one_id = auth.uid() or c.participant_two_id = auth.uid())
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "messages_insert_own" on public.messages for insert
    with check (
      auth.uid() = sender_id
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_id
        and (c.participant_one_id = auth.uid() or c.participant_two_id = auth.uid())
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "messages_update_own" on public.messages for update
    using (auth.uid() = sender_id);
exception when duplicate_object then null; end $$;

-- ── notifications ─────────────────────────────────────────────
do $$ begin
  create policy "notifications_select_own" on public.notifications for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notifications_update_own" on public.notifications for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── cvs ───────────────────────────────────────────────────────
do $$ begin
  create policy "cvs_select_own" on public.cvs for select
    using (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "cvs_manage_own" on public.cvs for all
    using (exists (
      select 1 from public.talent_profiles tp where tp.id = talent_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── cv_sections ───────────────────────────────────────────────
do $$ begin
  create policy "cv_sections_manage_own" on public.cv_sections for all
    using (exists (
      select 1 from public.cvs c
      join public.talent_profiles tp on tp.id = c.talent_id
      where c.id = cv_id and tp.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── courses ───────────────────────────────────────────────────
do $$ begin
  create policy "courses_select_published" on public.courses for select
    using (is_published = true or auth.uid() = creator_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "courses_manage_creator" on public.courses for all
    using (auth.uid() = creator_id);
exception when duplicate_object then null; end $$;

-- ── lessons ───────────────────────────────────────────────────
do $$ begin
  create policy "lessons_select_enrolled" on public.lessons for select
    using (
      is_free = true
      or exists (select 1 from public.enrollments e where e.course_id = course_id and e.user_id = auth.uid())
      or exists (select 1 from public.courses c where c.id = course_id and c.creator_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "lessons_manage_creator" on public.lessons for all
    using (exists (
      select 1 from public.courses c where c.id = course_id and c.creator_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── enrollments ───────────────────────────────────────────────
do $$ begin
  create policy "enrollments_select_own" on public.enrollments for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "enrollments_insert_own" on public.enrollments for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "enrollments_update_own" on public.enrollments for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-create user row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep applicant_count in sync
create or replace function public.sync_applicant_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.job_posts set applicant_count = applicant_count + 1 where id = new.job_id;
  elsif tg_op = 'DELETE' then
    update public.job_posts set applicant_count = greatest(applicant_count - 1, 0) where id = old.job_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_applicant_count on public.applications;
create trigger trg_sync_applicant_count
  after insert or delete on public.applications
  for each row execute function public.sync_applicant_count();

-- Update conversation last_message_at
create or replace function public.sync_conversation_timestamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_conversation_ts on public.messages;
create trigger trg_sync_conversation_ts
  after insert on public.messages
  for each row execute function public.sync_conversation_timestamp();

-- Recalculate avg_rating on reviews
create or replace function public.sync_avg_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_talent_id  uuid;
  v_client_id  uuid;
  v_project    record;
begin
  select client_id, talent_id into v_project
  from public.projects where id = coalesce(new.project_id, old.project_id);

  -- Update talent avg
  update public.talent_profiles tp set
    avg_rating   = (select avg(rating) from public.reviews r
                    join public.projects p on p.id = r.project_id
                    where p.talent_id = tp.id),
    total_reviews = (select count(*) from public.reviews r
                     join public.projects p on p.id = r.project_id
                     where p.talent_id = tp.id)
  where tp.id = v_project.talent_id;

  -- Update client avg
  update public.client_profiles cp set
    avg_rating   = (select avg(rating) from public.reviews r
                    join public.projects p on p.id = r.project_id
                    where p.client_id = cp.id),
    total_reviews = (select count(*) from public.reviews r
                     join public.projects p on p.id = r.project_id
                     where p.client_id = cp.id)
  where cp.id = v_project.client_id;

  return null;
end;
$$;

drop trigger if exists trg_sync_avg_rating on public.reviews;
create trigger trg_sync_avg_rating
  after insert or update or delete on public.reviews
  for each row execute function public.sync_avg_rating();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at_users              on public.users;
drop trigger if exists set_updated_at_talent_profiles    on public.talent_profiles;
drop trigger if exists set_updated_at_client_profiles    on public.client_profiles;
drop trigger if exists set_updated_at_job_posts          on public.job_posts;
drop trigger if exists set_updated_at_applications       on public.applications;
drop trigger if exists set_updated_at_offers             on public.offers;
drop trigger if exists set_updated_at_projects           on public.projects;
drop trigger if exists set_updated_at_milestones         on public.milestones;
drop trigger if exists set_updated_at_payments           on public.payments;
drop trigger if exists set_updated_at_cvs                on public.cvs;
drop trigger if exists set_updated_at_cv_sections        on public.cv_sections;
drop trigger if exists set_updated_at_courses            on public.courses;
drop trigger if exists set_updated_at_lessons            on public.lessons;
drop trigger if exists set_updated_at_portfolios         on public.portfolios;

create trigger set_updated_at_users           before update on public.users           for each row execute function public.set_updated_at();
create trigger set_updated_at_talent_profiles before update on public.talent_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_client_profiles before update on public.client_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_job_posts       before update on public.job_posts       for each row execute function public.set_updated_at();
create trigger set_updated_at_applications    before update on public.applications    for each row execute function public.set_updated_at();
create trigger set_updated_at_offers          before update on public.offers          for each row execute function public.set_updated_at();
create trigger set_updated_at_projects        before update on public.projects        for each row execute function public.set_updated_at();
create trigger set_updated_at_milestones      before update on public.milestones      for each row execute function public.set_updated_at();
create trigger set_updated_at_payments        before update on public.payments        for each row execute function public.set_updated_at();
create trigger set_updated_at_cvs             before update on public.cvs             for each row execute function public.set_updated_at();
create trigger set_updated_at_cv_sections     before update on public.cv_sections     for each row execute function public.set_updated_at();
create trigger set_updated_at_courses         before update on public.courses         for each row execute function public.set_updated_at();
create trigger set_updated_at_lessons         before update on public.lessons         for each row execute function public.set_updated_at();
create trigger set_updated_at_portfolios      before update on public.portfolios      for each row execute function public.set_updated_at();
