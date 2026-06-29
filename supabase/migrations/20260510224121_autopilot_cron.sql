-- Enable pg_cron and pg_net for scheduled edge function calls
do $$ begin create extension if not exists pg_cron with schema extensions; exception when others then null; end $$;
do $$ begin create extension if not exists pg_net with schema extensions; exception when others then null; end $$;

-- Config table to store the Supabase project URL (admin sets this once)
create table if not exists public.app_config (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.app_config enable row level security;
-- Only service role can read/write (no user-facing access)
create policy "service_role_only" on public.app_config
  using (false);

comment on table public.app_config is
  'App-level config. Insert the two rows below once via Supabase dashboard SQL editor:
   INSERT INTO app_config (key, value) VALUES
     (''supabase_functions_url'', ''https://dgyuafltlpruhdlgwiew.supabase.co/functions/v1''),
     (''autopilot_cron_secret'', ''<generate a random secret>'')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

   Then set AUTOPILOT_CRON_SECRET=<same secret> in Supabase Edge Function secrets.';

-- Function called by cron to trigger autopilot-run for all active users
create or replace function public.trigger_autopilot_run()
returns void
language plpgsql
security definer
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from public.app_config where key = 'supabase_functions_url';
  select value into v_secret from public.app_config where key = 'autopilot_cron_secret';

  if v_url is null or v_secret is null then
    raise notice 'autopilot cron: app_config not set up yet — skipping';
    return;
  end if;

  perform net.http_post(
    url     := v_url || '/autopilot-run',
    headers := jsonb_build_object(
      'Content-Type',         'application/json',
      'x-autopilot-cron-secret', v_secret
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- Schedule: run autopilot at 6, 8, 10, 12, 14, 16, 18, 20 UTC daily
-- (covers 7am–9pm WAT which is UTC+1)
select cron.schedule(
  'autopilot-run-every-2h',
  '0 6,8,10,12,14,16,18,20 * * *',
  'select public.trigger_autopilot_run()'
);
