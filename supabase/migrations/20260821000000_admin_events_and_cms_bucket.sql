-- events RLS had no admin override — an admin trying to edit or delete
-- another organizer's event silently no-op'd (the update/delete matched
-- zero rows since evt_update_own/evt_delete_own only allow the organizer).
DO $$ BEGIN
  CREATE POLICY "evt_admin_update" ON public.events FOR UPDATE
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "evt_admin_delete" ON public.events FOR DELETE
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cms-images was opened up to "any authenticated user can upload" along
-- with avatars/portfolio/logos/deliverables in the bulk bucket-policy
-- migration, but CMS images are rendered on public marketing/blog pages —
-- any signed-in user could push arbitrary images into site content.
-- Restrict inserts on this one bucket to admins only.
DROP POLICY IF EXISTS "cms-images_auth_insert" ON storage.objects;
CREATE POLICY "cms-images_admin_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cms-images' AND public.is_admin(auth.uid()));
