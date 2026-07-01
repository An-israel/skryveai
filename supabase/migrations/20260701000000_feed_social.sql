-- Social layer for the unified feed: likes + comments on any feed item
-- (marketplace jobs, aggregated jobs, events, courses).

CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_source text NOT NULL,  -- 'marketplace' | 'aggregated' | 'event' | 'course'
  item_id     uuid NOT NULL,
  reaction    text NOT NULL DEFAULT 'like',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_source, item_id)
);

CREATE TABLE IF NOT EXISTS public.feed_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_source text NOT NULL,
  item_id     uuid NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_item ON public.feed_reactions(item_source, item_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_item  ON public.feed_comments(item_source, item_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_feed_comments_user  ON public.feed_comments(user_id);

ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments  ENABLE ROW LEVEL SECURITY;

-- Reactions: any signed-in user can see counts; users manage their own.
DROP POLICY IF EXISTS feed_react_select ON public.feed_reactions;
CREATE POLICY feed_react_select ON public.feed_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS feed_react_insert ON public.feed_reactions;
CREATE POLICY feed_react_insert ON public.feed_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS feed_react_delete ON public.feed_reactions;
CREATE POLICY feed_react_delete ON public.feed_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Comments: any signed-in user can read and post; users manage their own.
DROP POLICY IF EXISTS feed_comment_select ON public.feed_comments;
CREATE POLICY feed_comment_select ON public.feed_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS feed_comment_insert ON public.feed_comments;
CREATE POLICY feed_comment_insert ON public.feed_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS feed_comment_update ON public.feed_comments;
CREATE POLICY feed_comment_update ON public.feed_comments FOR UPDATE
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS feed_comment_delete ON public.feed_comments;
CREATE POLICY feed_comment_delete ON public.feed_comments FOR DELETE
  USING (auth.uid() = user_id);
