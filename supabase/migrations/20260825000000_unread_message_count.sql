-- The sidebar's "Messages" badge and the "Notifications" badge/bell showed
-- the exact same number everywhere — both were just the unread count from
-- the generic `notifications` table, which also gets a row (type="message")
-- every time a real message arrives. So a new DM bumped both badges by the
-- same amount, and there was no way to tell "you have an unread message"
-- from "you have an unread notification" at a glance.
--
-- Gives the Messages badge a real, independent count from the actual
-- messaging tables (both marketplace conversations and Collab direct
-- messages), so it only lights up for actual unread messages.
CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT (
    COALESCE((
      SELECT count(*) FROM public.marketplace_messages mm
      JOIN public.marketplace_conversations mc ON mc.id = mm.conversation_id
      JOIN public.talent_profiles tp ON tp.id = mc.talent_id
      WHERE tp.user_id = auth.uid() AND mm.is_read = false AND mm.sender_id != auth.uid()
    ), 0)
    +
    COALESCE((
      SELECT count(*) FROM public.marketplace_messages mm
      JOIN public.marketplace_conversations mc ON mc.id = mm.conversation_id
      JOIN public.client_profiles cp ON cp.id = mc.client_id
      WHERE cp.user_id = auth.uid() AND mm.is_read = false AND mm.sender_id != auth.uid()
    ), 0)
    +
    COALESCE((
      SELECT count(*) FROM public.direct_messages dm
      JOIN public.direct_conversations dc ON dc.id = dm.conversation_id
      WHERE (dc.user_a = auth.uid() OR dc.user_b = auth.uid())
        AND dm.read_at IS NULL AND dm.sender_id != auth.uid()
    ), 0)
  )::integer;
$fn$;
GRANT EXECUTE ON FUNCTION public.unread_message_count() TO authenticated;
