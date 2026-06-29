-- ================================================================
-- Skryve Marketplace — Full Schema Migration
-- Run in Supabase SQL Editor on the EXISTING SkryveAI project
-- All statements are idempotent (safe to re-run)
-- ================================================================

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Enums ─────────────────────────────────────────────────────
do $$ begin create type skryve_user_role         as enum ('talent','client','admin');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_experience_level  as enum ('entry','mid','senior','expert');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_availability      as enum ('available','busy','not_available');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_job_type          as enum ('gig','contract','long_term');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_budget_type       as enum ('fixed','hourly');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_location_type     as enum ('remote','onsite','hybrid');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_job_status        as enum ('draft','active','paused','closed');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_app_status        as enum ('pending','viewed','shortlisted','interview','hired','rejected');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_offer_status      as enum ('pending','accepted','declined','countered','expired');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_project_status    as enum ('active','completed','disputed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_deliverable_status as enum ('pending','approved','revision_requested');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_event_format      as enum ('webinar','workshop','conference','meetup','hackathon');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_price_type        as enum ('free','paid');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_event_status      as enum ('draft','published','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_payment_status    as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_content_type      as enum ('video','text');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_agg_platform      as enum ('upwork','linkedin','indeed','jobberman','freelancer','remoteok','wellfound','glassdoor','toptal','fiverr');
exception when duplicate_object then null; end $$;
do $$ begin create type skryve_job_source        as enum ('marketplace','aggregated');
exception when duplicate_object then null; end $$;

-- ================================================================
-- SECTION 1 — USERS & PROFILES
-- ================================================================

-- talent_profiles
create table if not exists public.talent_profiles (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references auth.users(id) on delete cascade,
  full_name                text,
  location                 text,
  bio                      text,
  primary_skill            text,
  secondary_skills         text[]      not null default '{}',
  experience_level         skryve_experience_level,
  hourly_rate              numeric(10,2),
  availability_status      skryve_availability not null default 'available',
  languages                text[]      not null default '{}',
  social_links             jsonb       not null default '{}',
  profile_photo_url        text,
  is_verified              boolean     not null default false,
  rating_avg               numeric(3,2),
  completed_projects_count int         not null default 0,
  total_reviews            int         not null default 0,
  profile_views            int         not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- client_profiles
create table if not exists public.client_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  company_name  text,
  industry      text,
  team_size     text,
  location      text,
  website       text,
  logo_url      text,
  is_verified   boolean     not null default false,
  total_hires   int         not null default 0,
  rating_avg    numeric(3,2),
  total_reviews int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- portfolio_items
create table if not exists public.portfolio_items (
  id             uuid primary key default gen_random_uuid(),
  talent_id      uuid not null references public.talent_profiles(id) on delete cascade,
  title          text not null,
  description    text,
  image_url      text,
  project_url    text,
  skill_category text,
  is_featured    boolean     not null default false,
  created_at     timestamptz not null default now()
);

-- ================================================================
-- SECTION 2 — JOBS & MARKETPLACE
-- ================================================================

-- job_posts
create table if not exists public.job_posts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.client_profiles(id) on delete cascade,
  title            text not null,
  description      text not null,
  skill_category   text,
  job_type         skryve_job_type         not null default 'gig',
  budget_type      skryve_budget_type      not null default 'fixed',
  budget_min       numeric(10,2),
  budget_max       numeric(10,2),
  duration         text,
  deadline         timestamptz,
  location_type    skryve_location_type    not null default 'remote',
  required_skills  text[]      not null default '{}',
  status           skryve_job_status       not null default 'draft',
  applicant_count  int         not null default 0,
  views            int         not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- applications
create table if not exists public.applications (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid not null references public.job_posts(id) on delete cascade,
  talent_id           uuid not null references public.talent_profiles(id) on delete cascade,
  proposal_text       text,
  proposed_rate       numeric(10,2),
  estimated_timeline  text,
  portfolio_samples   text[]      not null default '{}',
  status              skryve_app_status not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (job_id, talent_id)
);

-- offers
create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references public.job_posts(id) on delete set null,
  client_id   uuid not null references public.client_profiles(id) on delete cascade,
  talent_id   uuid not null references public.talent_profiles(id) on delete cascade,
  scope       text,
  rate        numeric(10,2),
  timeline    text,
  milestones  jsonb       not null default '[]',
  terms       text,
  status      skryve_offer_status not null default 'pending',
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- projects
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid unique references public.offers(id) on delete set null,
  job_id       uuid references public.job_posts(id) on delete set null,
  client_id    uuid not null references public.client_profiles(id) on delete cascade,
  talent_id    uuid not null references public.talent_profiles(id) on delete cascade,
  status       skryve_project_status not null default 'active',
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- deliverables
create table if not exists public.deliverables (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  talent_id    uuid not null references public.talent_profiles(id) on delete cascade,
  file_url     text,
  note         text,
  status       skryve_deliverable_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz
);

-- reviews
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  review_text text,
  created_at  timestamptz not null default now(),
  unique (project_id, reviewer_id)
);

-- ================================================================
-- SECTION 3 — JOB AGGREGATOR
-- ================================================================

-- aggregated_jobs
create table if not exists public.aggregated_jobs (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null,
  platform     skryve_agg_platform not null,
  title        text not null,
  description  text,
  budget       text,
  job_type     text,
  location     text,
  posted_at    timestamptz,
  external_url text not null,
  skill_tags   text[]      not null default '{}',
  is_active    boolean     not null default true,
  scraped_at   timestamptz not null default now(),
  unique (external_id, platform)
);

-- job_preferences (talent's personalised feed settings)
create table if not exists public.job_preferences (
  id                   uuid primary key default gen_random_uuid(),
  talent_id            uuid not null unique references public.talent_profiles(id) on delete cascade,
  primary_skill        text,
  secondary_skills     text[]  not null default '{}',
  experience_level     skryve_experience_level,
  budget_min           numeric(10,2),
  job_types            text[]  not null default '{}',
  location_preference  skryve_location_type,
  preferred_platforms  text[]  not null default '{}',
  digest_enabled       boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- saved_jobs (bookmarks across both marketplace and aggregator)
create table if not exists public.saved_jobs (
  id         uuid primary key default gen_random_uuid(),
  talent_id  uuid not null references public.talent_profiles(id) on delete cascade,
  job_id     uuid references public.job_posts(id) on delete cascade,
  agg_job_id uuid references public.aggregated_jobs(id) on delete cascade,
  source     skryve_job_source not null default 'marketplace',
  saved_at   timestamptz not null default now(),
  check (
    (source = 'marketplace' and job_id is not null) or
    (source = 'aggregated'  and agg_job_id is not null)
  )
);

-- applications_tracker (manual tracking for external applications)
create table if not exists public.applications_tracker (
  id             uuid primary key default gen_random_uuid(),
  talent_id      uuid not null references public.talent_profiles(id) on delete cascade,
  job_title      text not null,
  platform       text,
  external_url   text,
  proposal_sent  boolean     not null default false,
  status         skryve_app_status not null default 'pending',
  applied_at     timestamptz not null default now(),
  follow_up_date date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ================================================================
-- SECTION 4 — EVENTS
-- ================================================================

-- events
create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  organizer_id     uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  description      text,
  banner_url       text,
  format           skryve_event_format  not null default 'webinar',
  niche_category   text,
  date_time        timestamptz not null,
  timezone         text        not null default 'UTC',
  duration_minutes int,
  platform_name    text,
  event_link       text,
  location_address text,
  price_type       skryve_price_type    not null default 'free',
  ticket_price     numeric(10,2),
  max_attendees    int,
  attendee_count   int         not null default 0,
  status           skryve_event_status  not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- event_rsvps
create table if not exists public.event_rsvps (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  payment_status skryve_payment_status not null default 'pending',
  registered_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ================================================================
-- SECTION 5 — LEARNING (new tables, separate from legacy learning_*)
-- ================================================================

-- courses
create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  skill_category text,
  level          skryve_experience_level,
  duration_hours numeric(5,1),
  lesson_count   int         not null default 0,
  price          numeric(10,2) not null default 0,
  thumbnail_url  text,
  is_published   boolean     not null default false,
  enrolled_count int         not null default 0,
  avg_rating     numeric(3,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- course_lessons
create table if not exists public.course_lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  module_name      text,
  title            text not null,
  content_type     skryve_content_type not null default 'video',
  content_url      text,
  duration_minutes int,
  order_index      int not null default 0,
  is_free_preview  boolean not null default false,
  created_at       timestamptz not null default now()
);

-- enrollments
create table if not exists public.enrollments (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  talent_id        uuid not null references public.talent_profiles(id) on delete cascade,
  payment_status   skryve_payment_status not null default 'paid',
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (course_id, talent_id)
);

-- lesson_progress
create table if not exists public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id    uuid not null references public.course_lessons(id) on delete cascade,
  is_completed boolean     not null default false,
  completed_at timestamptz,
  unique (enrollment_id, lesson_id)
);

-- certificates
create table if not exists public.certificates (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  talent_id       uuid not null references public.talent_profiles(id) on delete cascade,
  issued_at       timestamptz not null default now(),
  certificate_url text,
  unique (course_id, talent_id)
);

-- ================================================================
-- SECTION 6 — CV BUILDER
-- ================================================================

-- skryve_cvs (prefixed to avoid any conflict with existing cv data)
create table if not exists public.skryve_cvs (
  id                 uuid primary key default gen_random_uuid(),
  talent_id          uuid not null references public.talent_profiles(id) on delete cascade,
  title              text not null default 'My CV',
  template_name      text not null default 'classic',
  personal_info      jsonb not null default '{}',
  summary            text,
  experiences        jsonb not null default '[]',
  education          jsonb not null default '[]',
  skills             jsonb not null default '[]',
  certifications     jsonb not null default '[]',
  projects           jsonb not null default '[]',
  last_downloaded_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ================================================================
-- SECTION 7 — MESSAGING (separate from existing chat_conversations)
-- ================================================================

-- marketplace_conversations
create table if not exists public.marketplace_conversations (
  id              uuid primary key default gen_random_uuid(),
  talent_id       uuid not null references public.talent_profiles(id) on delete cascade,
  client_id       uuid not null references public.client_profiles(id) on delete cascade,
  job_id          uuid references public.job_posts(id) on delete set null,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (talent_id, client_id, job_id)
);

-- marketplace_messages
create table if not exists public.marketplace_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  attachment_url  text,
  is_read         boolean     not null default false,
  sent_at         timestamptz not null default now()
);

-- ================================================================
-- NOTIFICATIONS — already exists in SkryveAI with compatible schema
-- The existing table has: id, user_id, type, title, body, link,
-- is_read, created_at — this works for Skryve as-is.
-- ================================================================

-- ================================================================
-- INDEXES
-- ================================================================

-- talent_profiles
create index if not exists idx_talent_profiles_user        on public.talent_profiles(user_id);
create index if not exists idx_talent_profiles_skill       on public.talent_profiles(primary_skill);
create index if not exists idx_talent_profiles_rating      on public.talent_profiles(rating_avg desc nulls last);
create index if not exists idx_talent_profiles_avail       on public.talent_profiles(availability_status);
create index if not exists idx_talent_profiles_fts         on public.talent_profiles
  using gin(to_tsvector('english', coalesce(full_name,'') || ' ' || coalesce(bio,'') || ' ' || coalesce(primary_skill,'')));

-- client_profiles
create index if not exists idx_client_profiles_user        on public.client_profiles(user_id);
create index if not exists idx_client_profiles_industry    on public.client_profiles(industry);

-- portfolio_items
create index if not exists idx_portfolio_items_talent      on public.portfolio_items(talent_id);
create index if not exists idx_portfolio_items_featured    on public.portfolio_items(talent_id, is_featured);

-- job_posts
create index if not exists idx_job_posts_client            on public.job_posts(client_id);
create index if not exists idx_job_posts_status            on public.job_posts(status);
create index if not exists idx_job_posts_skill             on public.job_posts(skill_category);
create index if not exists idx_job_posts_type              on public.job_posts(job_type);
create index if not exists idx_job_posts_created           on public.job_posts(created_at desc);
create index if not exists idx_job_posts_active            on public.job_posts(status) where status = 'active';
create index if not exists idx_job_posts_fts               on public.job_posts
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

-- applications
create index if not exists idx_applications_job            on public.applications(job_id);
create index if not exists idx_applications_talent         on public.applications(talent_id);
create index if not exists idx_applications_status         on public.applications(status);

-- offers
create index if not exists idx_offers_client               on public.offers(client_id);
create index if not exists idx_offers_talent               on public.offers(talent_id);
create index if not exists idx_offers_status               on public.offers(status);

-- projects
create index if not exists idx_projects_client             on public.projects(client_id);
create index if not exists idx_projects_talent             on public.projects(talent_id);
create index if not exists idx_projects_status             on public.projects(status);

-- aggregated_jobs
create index if not exists idx_agg_jobs_platform           on public.aggregated_jobs(platform);
create index if not exists idx_agg_jobs_active             on public.aggregated_jobs(is_active) where is_active = true;
create index if not exists idx_agg_jobs_posted             on public.aggregated_jobs(posted_at desc);
create index if not exists idx_agg_jobs_skills             on public.aggregated_jobs using gin(skill_tags);
create index if not exists idx_agg_jobs_fts                on public.aggregated_jobs
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

-- saved_jobs
create index if not exists idx_saved_jobs_talent           on public.saved_jobs(talent_id);

-- applications_tracker
create index if not exists idx_app_tracker_talent          on public.applications_tracker(talent_id);
create index if not exists idx_app_tracker_status          on public.applications_tracker(status);

-- events
create index if not exists idx_events_organizer            on public.events(organizer_id);
create index if not exists idx_events_status               on public.events(status);
create index if not exists idx_events_format               on public.events(format);
create index if not exists idx_events_date                 on public.events(date_time);
create index if not exists idx_events_published            on public.events(status) where status = 'published';
create index if not exists idx_events_niche                on public.events(niche_category);
create index if not exists idx_events_fts                  on public.events
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

-- event_rsvps
create index if not exists idx_event_rsvps_event           on public.event_rsvps(event_id);
create index if not exists idx_event_rsvps_user            on public.event_rsvps(user_id);

-- courses
create index if not exists idx_courses_skill               on public.courses(skill_category);
create index if not exists idx_courses_published           on public.courses(is_published) where is_published = true;
create index if not exists idx_courses_level               on public.courses(level);

-- course_lessons
create index if not exists idx_course_lessons_course       on public.course_lessons(course_id);
create index if not exists idx_course_lessons_order        on public.course_lessons(course_id, order_index);

-- enrollments
create index if not exists idx_enrollments_talent          on public.enrollments(talent_id);
create index if not exists idx_enrollments_course          on public.enrollments(course_id);

-- lesson_progress
create index if not exists idx_lesson_progress_enrollment  on public.lesson_progress(enrollment_id);

-- certificates
create index if not exists idx_certificates_talent         on public.certificates(talent_id);

-- skryve_cvs
create index if not exists idx_skryve_cvs_talent           on public.skryve_cvs(talent_id);

-- marketplace_conversations
create index if not exists idx_mkt_conv_talent             on public.marketplace_conversations(talent_id);
create index if not exists idx_mkt_conv_client             on public.marketplace_conversations(client_id);
create index if not exists idx_mkt_conv_last_msg           on public.marketplace_conversations(last_message_at desc);

-- marketplace_messages
create index if not exists idx_mkt_msg_conversation        on public.marketplace_messages(conversation_id);
create index if not exists idx_mkt_msg_sender              on public.marketplace_messages(sender_id);
create index if not exists idx_mkt_msg_sent                on public.marketplace_messages(sent_at desc);
create index if not exists idx_mkt_msg_unread              on public.marketplace_messages(conversation_id, is_read) where is_read = false;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.talent_profiles           enable row level security;
alter table public.client_profiles           enable row level security;
alter table public.portfolio_items           enable row level security;
alter table public.job_posts                 enable row level security;
alter table public.applications              enable row level security;
alter table public.offers                    enable row level security;
alter table public.projects                  enable row level security;
alter table public.deliverables              enable row level security;
alter table public.reviews                   enable row level security;
alter table public.aggregated_jobs           enable row level security;
alter table public.job_preferences           enable row level security;
alter table public.saved_jobs                enable row level security;
alter table public.applications_tracker      enable row level security;
alter table public.events                    enable row level security;
alter table public.event_rsvps               enable row level security;
alter table public.courses                   enable row level security;
alter table public.course_lessons            enable row level security;
alter table public.enrollments               enable row level security;
alter table public.lesson_progress           enable row level security;
alter table public.certificates              enable row level security;
alter table public.skryve_cvs                enable row level security;
alter table public.marketplace_conversations enable row level security;
alter table public.marketplace_messages      enable row level security;

-- ── talent_profiles ───────────────────────────────────────────
do $$ begin create policy "tp_select_public"  on public.talent_profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "tp_insert_own"     on public.talent_profiles for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "tp_update_own"     on public.talent_profiles for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── client_profiles ───────────────────────────────────────────
do $$ begin create policy "cp_select_public"  on public.client_profiles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "cp_insert_own"     on public.client_profiles for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "cp_update_own"     on public.client_profiles for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── portfolio_items ───────────────────────────────────────────
do $$ begin create policy "pi_select_public"  on public.portfolio_items for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "pi_manage_own"     on public.portfolio_items for all
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── job_posts ─────────────────────────────────────────────────
do $$ begin create policy "jp_select_active"  on public.job_posts for select
  using (status = 'active' or exists (
    select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid()
  ));
exception when duplicate_object then null; end $$;
do $$ begin create policy "jp_insert_client"  on public.job_posts for insert
  with check (exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin create policy "jp_update_client"  on public.job_posts for update
  using (exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin create policy "jp_delete_client"  on public.job_posts for delete
  using (exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── applications ──────────────────────────────────────────────
do $$ begin create policy "app_select_parties" on public.applications for select
  using (
    exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
    or exists (select 1 from public.job_posts jp join public.client_profiles c on c.id = jp.client_id
               where jp.id = job_id and c.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin create policy "app_insert_talent"  on public.applications for insert
  with check (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin create policy "app_update_parties" on public.applications for update
  using (
    exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
    or exists (select 1 from public.job_posts jp join public.client_profiles c on c.id = jp.client_id
               where jp.id = job_id and c.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- ── offers ────────────────────────────────────────────────────
do $$ begin create policy "offer_select_parties" on public.offers for select
  using (
    exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid())
    or exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin create policy "offer_insert_client" on public.offers for insert
  with check (exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin create policy "offer_update_parties" on public.offers for update
  using (
    exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid())
    or exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- ── projects ──────────────────────────────────────────────────
do $$ begin create policy "proj_select_parties" on public.projects for select
  using (
    exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid())
    or exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin create policy "proj_update_parties" on public.projects for update
  using (
    exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid())
    or exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- ── deliverables ──────────────────────────────────────────────
do $$ begin create policy "del_select_parties" on public.deliverables for select
  using (exists (
    select 1 from public.projects p where p.id = project_id and (
      exists (select 1 from public.client_profiles c where c.id = p.client_id and c.user_id = auth.uid())
      or exists (select 1 from public.talent_profiles t where t.id = p.talent_id and t.user_id = auth.uid())
    )
  ));
exception when duplicate_object then null; end $$;
do $$ begin create policy "del_insert_talent" on public.deliverables for insert
  with check (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── reviews ───────────────────────────────────────────────────
do $$ begin create policy "rev_select_public"  on public.reviews for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin create policy "rev_insert_own"     on public.reviews for insert with check (auth.uid() = reviewer_id);
exception when duplicate_object then null; end $$;

-- ── aggregated_jobs ───────────────────────────────────────────
do $$ begin create policy "agg_select_all"     on public.aggregated_jobs for select using (is_active = true);
exception when duplicate_object then null; end $$;

-- ── job_preferences ───────────────────────────────────────────
do $$ begin create policy "jpr_own"            on public.job_preferences for all
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── saved_jobs ────────────────────────────────────────────────
do $$ begin create policy "sj_own"             on public.saved_jobs for all
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── applications_tracker ──────────────────────────────────────
do $$ begin create policy "at_own"             on public.applications_tracker for all
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── events ────────────────────────────────────────────────────
do $$ begin create policy "evt_select_public"  on public.events for select using (status = 'published' or auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "evt_insert_auth"    on public.events for insert with check (auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "evt_update_own"     on public.events for update using (auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "evt_delete_own"     on public.events for delete using (auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;

-- ── event_rsvps ───────────────────────────────────────────────
do $$ begin create policy "rsvp_select_own"    on public.event_rsvps for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "rsvp_insert_own"    on public.event_rsvps for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── courses ───────────────────────────────────────────────────
do $$ begin create policy "crs_select_public"  on public.courses for select using (is_published = true);
exception when duplicate_object then null; end $$;

-- ── course_lessons ────────────────────────────────────────────
do $$ begin create policy "cl_select_enrolled" on public.course_lessons for select
  using (
    is_free_preview = true
    or exists (select 1 from public.enrollments e where e.course_id = course_id and
               exists (select 1 from public.talent_profiles t where t.id = e.talent_id and t.user_id = auth.uid()))
  );
exception when duplicate_object then null; end $$;

-- ── enrollments ───────────────────────────────────────────────
do $$ begin create policy "enr_own"            on public.enrollments for all
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── lesson_progress ───────────────────────────────────────────
do $$ begin create policy "lp_own"             on public.lesson_progress for all
  using (exists (
    select 1 from public.enrollments e
    join public.talent_profiles t on t.id = e.talent_id
    where e.id = enrollment_id and t.user_id = auth.uid()
  ));
exception when duplicate_object then null; end $$;

-- ── certificates ──────────────────────────────────────────────
do $$ begin create policy "cert_own"           on public.certificates for select
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── skryve_cvs ────────────────────────────────────────────────
do $$ begin create policy "cv_own"             on public.skryve_cvs for all
  using (exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── marketplace_conversations ─────────────────────────────────
do $$ begin create policy "mkt_conv_parties"   on public.marketplace_conversations for select
  using (
    exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
    or exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin create policy "mkt_conv_insert"    on public.marketplace_conversations for insert
  with check (
    exists (select 1 from public.talent_profiles t where t.id = talent_id and t.user_id = auth.uid())
    or exists (select 1 from public.client_profiles c where c.id = client_id and c.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- ── marketplace_messages ──────────────────────────────────────
do $$ begin create policy "mkt_msg_parties"    on public.marketplace_messages for select
  using (exists (
    select 1 from public.marketplace_conversations mc where mc.id = conversation_id and (
      exists (select 1 from public.talent_profiles t where t.id = mc.talent_id and t.user_id = auth.uid())
      or exists (select 1 from public.client_profiles c where c.id = mc.client_id and c.user_id = auth.uid())
    )
  ));
exception when duplicate_object then null; end $$;
do $$ begin create policy "mkt_msg_insert_own" on public.marketplace_messages for insert
  with check (auth.uid() = sender_id);
exception when duplicate_object then null; end $$;
do $$ begin create policy "mkt_msg_update_own" on public.marketplace_messages for update
  using (auth.uid() = sender_id);
exception when duplicate_object then null; end $$;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto sync last_message_at on marketplace_conversations
create or replace function public.sync_mkt_conversation_ts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.marketplace_conversations
  set last_message_at = new.sent_at
  where id = new.conversation_id;
  return null;
end;
$$;
drop trigger if exists trg_sync_mkt_conv_ts on public.marketplace_messages;
create trigger trg_sync_mkt_conv_ts
  after insert on public.marketplace_messages
  for each row execute function public.sync_mkt_conversation_ts();

-- Keep applicant_count in sync on job_posts
create or replace function public.sync_job_applicant_count()
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
  for each row execute function public.sync_job_applicant_count();

-- Keep attendee_count in sync on events
create or replace function public.sync_event_attendee_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.events set attendee_count = attendee_count + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' then
    update public.events set attendee_count = greatest(attendee_count - 1, 0) where id = old.event_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_sync_attendee_count on public.event_rsvps;
create trigger trg_sync_attendee_count
  after insert or delete on public.event_rsvps
  for each row execute function public.sync_event_attendee_count();

-- Recalculate avg ratings after reviews
create or replace function public.sync_skryve_ratings()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project record;
begin
  select client_id, talent_id into v_project
  from public.projects where id = coalesce(new.project_id, old.project_id);

  update public.talent_profiles tp set
    rating_avg   = (select avg(r.rating) from public.reviews r
                    join public.projects p on p.id = r.project_id where p.talent_id = tp.id),
    total_reviews = (select count(*) from public.reviews r
                     join public.projects p on p.id = r.project_id where p.talent_id = tp.id)
  where tp.id = v_project.talent_id;

  update public.client_profiles cp set
    rating_avg   = (select avg(r.rating) from public.reviews r
                    join public.projects p on p.id = r.project_id where p.client_id = cp.id),
    total_reviews = (select count(*) from public.reviews r
                     join public.projects p on p.id = r.project_id where p.client_id = cp.id)
  where cp.id = v_project.client_id;

  return null;
end;
$$;
drop trigger if exists trg_sync_skryve_ratings on public.reviews;
create trigger trg_sync_skryve_ratings
  after insert or update or delete on public.reviews
  for each row execute function public.sync_skryve_ratings();

-- updated_at helper (reuse if already exists)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ declare t text;
begin
  foreach t in array array[
    'talent_profiles','client_profiles','job_posts','applications',
    'offers','projects','courses','skryve_cvs',
    'marketplace_conversations','events','job_preferences','applications_tracker'
  ] loop
    execute format('
      drop trigger if exists set_updated_at_%1$s on public.%1$s;
      create trigger set_updated_at_%1$s
        before update on public.%1$s
        for each row execute function public.set_updated_at();
    ', t);
  end loop;
end $$;
