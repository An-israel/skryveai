-- ============================================================================
-- Ensure realtime is enabled for marketplace messaging (+ autopilot activity)
-- ============================================================================
-- The app subscribes to postgres_changes on these tables (live chat in
-- MessageThread, the autopilot activity log), but they were never added to the
-- supabase_realtime publication in a migration. Add them so live updates work
-- on a freshly provisioned project.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.marketplace_messages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'marketplace_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_messages;
  END IF;

  IF to_regclass('public.autopilot_activity') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'autopilot_activity'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.autopilot_activity;
  END IF;
END $$;
