-- Talent comments on marketplace job posts. Reuses the existing generic
-- feed_comments table (item_source='marketplace', item_id=job_posts.id) —
-- it already carries job-post comments for the Feed, so no new table is
-- needed, just a tighter insert policy: commenting on a job post is a
-- talent-only action (clients read comments and message the commenter
-- instead of replying inline). Comments on other item sources (event,
-- course, aggregated) are untouched.

DROP POLICY IF EXISTS feed_comment_insert ON public.feed_comments;
CREATE POLICY feed_comment_insert ON public.feed_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      item_source <> 'marketplace'
      OR EXISTS (SELECT 1 FROM public.talent_profiles t WHERE t.user_id = auth.uid())
    )
  );
