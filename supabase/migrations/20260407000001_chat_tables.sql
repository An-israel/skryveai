-- ─── Live Chat Tables ────────────────────────────────────────────────────────
-- Creates chat_conversations and chat_messages with proper RLS so the
-- chat widget and admin panel can read/write correctly.

-- Ensure helper functions exist (safe to run even if already defined)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'content_editor', 'support_agent')
  )
$$;

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  last_message_at timestamptz DEFAULT now(),
  unread_by_admin integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  message text NOT NULL,
  read_by_admin boolean DEFAULT false,
  read_by_user boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_conversations
DROP POLICY IF EXISTS "Users can view own conversation" ON public.chat_conversations;
CREATE POLICY "Users can view own conversation"
  ON public.chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversation" ON public.chat_conversations;
CREATE POLICY "Users can create own conversation"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation" ON public.chat_conversations;
CREATE POLICY "Users can update own conversation"
  ON public.chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can view all conversations"
  ON public.chat_conversations FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can update all conversations"
  ON public.chat_conversations FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- chat_messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can mark messages read" ON public.chat_messages;
CREATE POLICY "Users can mark messages read"
  ON public.chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can send messages" ON public.chat_messages;
CREATE POLICY "Admins can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update messages" ON public.chat_messages;
CREATE POLICY "Admins can update messages"
  ON public.chat_messages FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id
  ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status_time
  ON public.chat_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_time
  ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_admin
  ON public.chat_messages(conversation_id, read_by_admin)
  WHERE read_by_admin = false;

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enables postgres_changes subscriptions on these tables.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
