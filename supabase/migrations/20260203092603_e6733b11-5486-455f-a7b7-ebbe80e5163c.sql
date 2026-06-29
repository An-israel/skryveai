-- Create storage bucket for CVs (idempotent — bucket may already exist on Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for CV storage (drop-then-create so re-runs don't conflict)
DROP POLICY IF EXISTS "Users can upload their own CV" ON storage.objects;
CREATE POLICY "Users can upload their own CV"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own CV" ON storage.objects;
CREATE POLICY "Users can view their own CV"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own CV" ON storage.objects;
CREATE POLICY "Users can update their own CV"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own CV" ON storage.objects;
CREATE POLICY "Users can delete their own CV"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins can view all CVs" ON storage.objects;
CREATE POLICY "Admins can view all CVs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cv-uploads' AND public.is_admin(auth.uid()));