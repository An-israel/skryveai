-- Enterprise Email Finding & Verification Infrastructure
-- 4-layer pipeline: DB lookup → Hunter.io → Apollo.io → Pattern+Verify

-- ─────────────────────────────────────────────────
-- 1. verified_emails  (primary cache + audit store)
-- ─────────────────────────────────────────────────
create table if not exists public.verified_emails (
  id                   uuid primary key default gen_random_uuid(),
  email                varchar(255) unique not null,
  domain               varchar(255) not null,

  -- Person details (optional — filled when found via person lookup)
  first_name           varchar(100),
  last_name            varchar(100),
  full_name            varchar(200),
  job_title            varchar(200),
  company_name         varchar(255),
  company_domain       varchar(255),

  -- Verification status
  status               varchar(50) not null default 'unknown',
    -- 'valid' | 'invalid' | 'risky' | 'catch-all' | 'unknown'
  confidence_score     integer default 0,
  last_verified_at     timestamptz default now(),
  verification_method  varchar(100),
    -- 'database' | 'api_hunter' | 'api_apollo' | 'smtp' | 'pattern' | 'scrape'

  -- Source tracking
  found_via            varchar(100),
    -- 'internal_db' | 'hunter_api' | 'apollo_api' | 'pattern_gen' | 'scrape' | 'user_upload'
  data_source_count    integer default 1,
  public_sources       text[],

  -- Quality flags
  is_catch_all         boolean default false,
  is_disposable        boolean default false,
  is_role_based        boolean default false,
  is_spam_trap         boolean default false,

  -- Delivery stats (updated by email queue)
  bounce_count         integer default 0,
  success_count        integer default 0,
  times_verified       integer default 1,
  last_used_at         timestamptz,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_verified_emails_domain        on public.verified_emails(domain);
create index if not exists idx_verified_emails_company_domain on public.verified_emails(company_domain);
create index if not exists idx_verified_emails_status        on public.verified_emails(status);
create index if not exists idx_verified_emails_last_verified on public.verified_emails(last_verified_at);

alter table public.verified_emails enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'verified_emails' and policyname = 'service_role_only'
  ) then
    create policy "service_role_only" on public.verified_emails using (false);
  end if;
end $$;

-- ─────────────────────────────────────────────────
-- 2. email_verification_logs  (full audit trail)
-- ─────────────────────────────────────────────────
create table if not exists public.email_verification_logs (
  id                   uuid primary key default gen_random_uuid(),
  email                varchar(255) not null,
  verification_method  varchar(100),
  result_status        varchar(50),
  confidence_score     integer,
  response_code        varchar(10),
  response_message     text,
  response_time_ms     integer,
  error_occurred       boolean default false,
  error_message        text,
  verified_at          timestamptz default now(),
  verified_by_user_id  uuid
);

create index if not exists idx_email_ver_logs_email       on public.email_verification_logs(email);
create index if not exists idx_email_ver_logs_verified_at on public.email_verification_logs(verified_at);

alter table public.email_verification_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_verification_logs' and policyname = 'service_role_only'
  ) then
    create policy "service_role_only" on public.email_verification_logs using (false);
  end if;
end $$;

-- ─────────────────────────────────────────────────
-- 3. api_response_cache  (save API credits)
-- ─────────────────────────────────────────────────
create table if not exists public.api_response_cache (
  id               uuid primary key default gen_random_uuid(),
  cache_key        varchar(500) unique not null,
  api_provider     varchar(50),
  response_data    jsonb not null,
  http_status_code integer,
  hit_count        integer default 0,
  created_at       timestamptz default now(),
  expires_at       timestamptz
);

create index if not exists idx_api_cache_key        on public.api_response_cache(cache_key);
create index if not exists idx_api_cache_expires_at on public.api_response_cache(expires_at);

alter table public.api_response_cache enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'api_response_cache' and policyname = 'service_role_only'
  ) then
    create policy "service_role_only" on public.api_response_cache using (false);
  end if;
end $$;

-- ─────────────────────────────────────────────────
-- 4. api_usage_tracking  (cost monitoring)
-- ─────────────────────────────────────────────────
create table if not exists public.api_usage_tracking (
  id               uuid primary key default gen_random_uuid(),
  api_provider     varchar(50),
  endpoint         varchar(255),
  credits_used     numeric(10,2),
  cost_usd         numeric(10,4),
  response_time_ms integer,
  success          boolean,
  request_params   jsonb,
  response_status  integer,
  user_id          uuid,
  campaign_id      uuid,
  created_at       timestamptz default now()
);

create index if not exists idx_api_usage_provider   on public.api_usage_tracking(api_provider);
create index if not exists idx_api_usage_created_at on public.api_usage_tracking(created_at);
create index if not exists idx_api_usage_user_id    on public.api_usage_tracking(user_id);

alter table public.api_usage_tracking enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'api_usage_tracking' and policyname = 'service_role_only'
  ) then
    create policy "service_role_only" on public.api_usage_tracking using (false);
  end if;
end $$;
