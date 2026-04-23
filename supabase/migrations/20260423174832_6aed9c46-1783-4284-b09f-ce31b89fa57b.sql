CREATE TABLE IF NOT EXISTS public.lesson_video_status (
  url text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('ok','broken','unknown')),
  provider text,
  reason text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_video_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read video status"
  ON public.lesson_video_status FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS lesson_video_status_status_idx ON public.lesson_video_status(status);