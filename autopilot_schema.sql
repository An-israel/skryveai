-- SkryveAI Auto-Pilot Schema
-- Run this in your Supabase SQL editor to create all required tables.

-- autopilot_configs
create table if not exists autopilot_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  is_active boolean default false,
  expertise jsonb default '{}',
  target_businesses jsonb default '{}',
  locations jsonb default '[]',
  daily_quota jsonb default '{}',
  email_style jsonb default '{}',
  compliance jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- autopilot_sessions
create table if not exists autopilot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  emails_sent integer default 0,
  emails_failed integer default 0,
  emails_skipped integer default 0,
  status text default 'idle',
  current_location text,
  current_activity text,
  started_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- autopilot_activity
create table if not exists autopilot_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references autopilot_sessions(id),
  business_name text,
  business_location text,
  contact_email text,
  email_subject text,
  email_body text,
  status text default 'sent',
  opened boolean default false,
  clicked boolean default false,
  replied boolean default false,
  created_at timestamptz default now()
);

-- contacted_businesses
create table if not exists contacted_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  domain text not null,
  contacted_at timestamptz default now(),
  unique(user_id, domain)
);

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table autopilot_configs enable row level security;
alter table autopilot_sessions enable row level security;
alter table autopilot_activity enable row level security;
alter table contacted_businesses enable row level security;

-- Users can only access their own rows

create policy "Users manage own autopilot config"
  on autopilot_configs
  for all
  using (auth.uid() = user_id);

create policy "Users view own sessions"
  on autopilot_sessions
  for all
  using (auth.uid() = user_id);

create policy "Users view own activity"
  on autopilot_activity
  for all
  using (auth.uid() = user_id);

create policy "Users manage contacted businesses"
  on contacted_businesses
  for all
  using (auth.uid() = user_id);

-- ── Indexes for performance ─────────────────────────────────────────────────

create index if not exists idx_autopilot_sessions_user_date
  on autopilot_sessions(user_id, date);

create index if not exists idx_autopilot_activity_user_created
  on autopilot_activity(user_id, created_at desc);

create index if not exists idx_contacted_businesses_user_domain
  on contacted_businesses(user_id, domain);

-- ── updated_at trigger ──────────────────────────────────────────────────────

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger autopilot_configs_updated_at
  before update on autopilot_configs
  for each row execute function update_updated_at_column();

create trigger autopilot_sessions_updated_at
  before update on autopilot_sessions
  for each row execute function update_updated_at_column();

-- ── Enable Realtime for live activity feed ──────────────────────────────────
-- Run these in the Supabase dashboard > Database > Replication,
-- or uncomment and run here if your project supports it:
--
-- alter publication supabase_realtime add table autopilot_activity;
-- alter publication supabase_realtime add table autopilot_sessions;
