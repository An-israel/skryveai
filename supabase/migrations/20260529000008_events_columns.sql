-- ================================================================
-- Migration 00008: Events Hub additional columns & reminder system
-- ================================================================

-- Add is_featured flag for featured banner slot
alter table public.events
  add column if not exists is_featured        boolean      not null default false,
  add column if not exists tags               text[]       not null default '{}',
  add column if not exists cover_image_url    text,
  add column if not exists reminder_24h_sent  boolean      not null default false,
  add column if not exists reminder_1h_sent   boolean      not null default false,
  add column if not exists speakers           jsonb        not null default '[]',
  add column if not exists agenda             jsonb        not null default '[]';

-- event_rsvps: track ticket/RSVP more explicitly
alter table public.event_rsvps
  add column if not exists ticket_ref         text,
  add column if not exists amount_paid        numeric(10,2);

-- Index for reminder queries
create index if not exists idx_events_reminder_24h on public.events(date_time, reminder_24h_sent)
  where status = 'published';
create index if not exists idx_events_reminder_1h  on public.events(date_time, reminder_1h_sent)
  where status = 'published';
create index if not exists idx_events_featured      on public.events(is_featured)
  where status = 'published' and is_featured = true;

-- RLS: allow any authenticated user to read RSVPs for events they attend
do $$ begin
  create policy "rsvp_select_event_owner"
    on public.event_rsvps for select
    using (
      auth.uid() = user_id
      or auth.uid() in (select organizer_id from public.events where id = event_id)
    );
exception when duplicate_object then null; end $$;

-- pg_cron: event reminders every hour
select cron.schedule(
  'event-reminders',
  '0 * * * *',
  $$select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/event-reminders',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
  )$$
);
