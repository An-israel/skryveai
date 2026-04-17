-- Smart Find signals table
CREATE TABLE public.smart_find_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  business_id UUID NOT NULL,
  service_definition JSONB DEFAULT '{}'::jsonb,
  signals JSONB DEFAULT '{}'::jsonb,
  evidence JSONB DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_find_signals_campaign ON public.smart_find_signals(campaign_id);
CREATE INDEX idx_smart_find_signals_business ON public.smart_find_signals(business_id);
CREATE INDEX idx_smart_find_signals_score ON public.smart_find_signals(score DESC);

ALTER TABLE public.smart_find_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals for their campaigns"
ON public.smart_find_signals FOR SELECT
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = smart_find_signals.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert signals for their campaigns"
ON public.smart_find_signals FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = smart_find_signals.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update signals for their campaigns"
ON public.smart_find_signals FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = smart_find_signals.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete signals for their campaigns"
ON public.smart_find_signals FOR DELETE
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = smart_find_signals.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all signals"
ON public.smart_find_signals FOR SELECT
USING (is_admin(auth.uid()));

-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}'::text[],
  keywords TEXT[] DEFAULT '{}'::text[],
  meta_title TEXT,
  meta_description TEXT,
  author TEXT NOT NULL DEFAULT 'SkryveAI Team',
  read_time INTEGER NOT NULL DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(featured) WHERE featured = true;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts FOR SELECT
USING (published = true);

CREATE POLICY "Admins can view all blog posts"
ON public.blog_posts FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Content editors and super admins can manage blog posts"
ON public.blog_posts FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'content_editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'content_editor'::app_role));

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment blog view count safely
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(post_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE slug = post_slug AND published = true;
END;
$$;