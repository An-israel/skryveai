-- Let writers author their own blog posts from the in-app Studio. Existing
-- admin/content-editor and public-read policies stay; these add self-service:
-- an author can create, read (incl. their own drafts), edit and delete only
-- the posts they created. Published posts remain publicly readable as before.

DROP POLICY IF EXISTS "Authors can create their own posts" ON public.blog_posts;
CREATE POLICY "Authors can create their own posts"
ON public.blog_posts FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authors can view their own posts" ON public.blog_posts;
CREATE POLICY "Authors can view their own posts"
ON public.blog_posts FOR SELECT
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;
CREATE POLICY "Authors can update their own posts"
ON public.blog_posts FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.blog_posts;
CREATE POLICY "Authors can delete their own posts"
ON public.blog_posts FOR DELETE
USING (auth.uid() = created_by);
