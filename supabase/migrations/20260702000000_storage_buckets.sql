-- Create the storage buckets the app uploads to but which were never
-- provisioned on this project ("Bucket not found" on avatar/logo/portfolio/
-- CMS/deliverable uploads). All are read via getPublicUrl, so all are public.

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',      'avatars',      true),
  ('portfolio',    'portfolio',    true),
  ('logos',        'logos',        true),
  ('cms-images',   'cms-images',   true),
  ('deliverables', 'deliverables', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policies: public read, authenticated users write/update/delete their uploads.
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['avatars','portfolio','logos','cms-images','deliverables'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_public_read');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)',
      b || '_public_read', b
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_auth_insert');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND auth.uid() IS NOT NULL)',
      b || '_auth_insert', b
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_owner_update');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE USING (bucket_id = %L AND owner = auth.uid())',
      b || '_owner_update', b
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_owner_delete');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE USING (bucket_id = %L AND owner = auth.uid())',
      b || '_owner_delete', b
    );
  END LOOP;
END $$;
