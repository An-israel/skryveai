-- ============================================================================
-- Notifications: add a click-through link
-- ============================================================================
-- Several call sites already tried to insert a `link` (and the UI needs one to
-- navigate when a notification is clicked), but the column never existed, so
-- those inserts silently failed. Add it.
-- ============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text;
