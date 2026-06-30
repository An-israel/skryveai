-- General 1:1 direct messaging (talent<->talent collaboration, or any two users).
-- Separate from marketplace_conversations (which is strictly client<->talent+job).

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_conversations_ordered CHECK (user_a < user_b),
  CONSTRAINT direct_conversations_pair_unique UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_conv_user_a ON public.direct_conversations(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_conv_user_b ON public.direct_conversations(user_b, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_msg_conv ON public.direct_messages(conversation_id, created_at ASC);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- helper: is the current user a participant in a conversation?
CREATE OR REPLACE FUNCTION public.is_dm_participant(_conversation_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.direct_conversations c
    WHERE c.id = _conversation_id AND (c.user_a = _uid OR c.user_b = _uid)
  );
$fn$;

-- conversations: participants only
DROP POLICY IF EXISTS dm_conv_select ON public.direct_conversations;
CREATE POLICY dm_conv_select ON public.direct_conversations FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);
DROP POLICY IF EXISTS dm_conv_insert ON public.direct_conversations;
CREATE POLICY dm_conv_insert ON public.direct_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
DROP POLICY IF EXISTS dm_conv_update ON public.direct_conversations;
CREATE POLICY dm_conv_update ON public.direct_conversations FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- messages: participants can read; sender (and participant) can write
DROP POLICY IF EXISTS dm_msg_select ON public.direct_messages;
CREATE POLICY dm_msg_select ON public.direct_messages FOR SELECT
  USING (public.is_dm_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS dm_msg_insert ON public.direct_messages;
CREATE POLICY dm_msg_insert ON public.direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.is_dm_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS dm_msg_update ON public.direct_messages;
CREATE POLICY dm_msg_update ON public.direct_messages FOR UPDATE
  USING (public.is_dm_participant(conversation_id, auth.uid()));

-- realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='direct_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='direct_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
  END IF;
END $$;

-- get-or-create a conversation between the caller and another user
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  me uuid := auth.uid();
  lo uuid;
  hi uuid;
  conv uuid;
BEGIN
  IF me IS NULL OR _other IS NULL OR me = _other THEN
    RAISE EXCEPTION 'invalid participants';
  END IF;
  lo := LEAST(me, _other);
  hi := GREATEST(me, _other);
  SELECT id INTO conv FROM public.direct_conversations WHERE user_a = lo AND user_b = hi;
  IF conv IS NULL THEN
    INSERT INTO public.direct_conversations (user_a, user_b) VALUES (lo, hi) RETURNING id INTO conv;
  END IF;
  RETURN conv;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) TO authenticated;
