-- Studio (blog authoring) is now an admin-only tool. Remove the author
-- self-service policies added for the earlier "any user can write" design, and
-- align the blog write policy with the app's full staff-admin set so every
-- admin role can author (matching the client-side isStaffAdmin check).

DROP POLICY IF EXISTS "Authors can create their own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can view their own posts"   ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.blog_posts;

-- Broaden management to all staff roles (super_admin, content_editor,
-- support_agent, staff). Public still only reads published posts.
DROP POLICY IF EXISTS "Content editors and super admins can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Staff can manage blog posts" ON public.blog_posts;
CREATE POLICY "Staff can manage blog posts"
ON public.blog_posts FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'content_editor'::app_role)
  OR has_role(auth.uid(), 'support_agent'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'content_editor'::app_role)
  OR has_role(auth.uid(), 'support_agent'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);
