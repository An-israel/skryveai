-- "tiptip" — Skryve growth control center (admin-only, owner-locked).
-- Builds the 3 Growth docs into one workspace: content library (AI-generated),
-- keyword map, 3-month calendar, brand-mention queue, technical-SEO checklist.
-- Visible ONLY to the owner account (email below); everything is owner-gated
-- via RLS + a SECURITY DEFINER owner check, and the publish RPC pushes a
-- finished piece into the existing blog_posts table.

-- ── Owner gate ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_tiptip_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'aniekaneazy@gmail.com'
  );
$fn$;
GRANT EXECUTE ON FUNCTION public.is_tiptip_owner() TO authenticated, anon;

-- ── Content library ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tiptip_content (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  kind            text NOT NULL DEFAULT 'article',   -- comparison|entity|pillar|listicle|faq|category|feature|data|research|freshness|article
  target_keyword  text,
  keyword_tier    integer,                            -- 1|2|3
  status          text NOT NULL DEFAULT 'idea',       -- idea|drafting|ready|published
  calendar_month  integer,                            -- 1|2|3
  calendar_week   integer,                            -- 1..12
  priority        integer NOT NULL DEFAULT 100,
  meta_title      text,
  meta_description text,
  slug            text,
  excerpt         text,
  body            text,                               -- markdown
  faq             jsonb NOT NULL DEFAULT '[]',        -- [{q,a}]
  internal_links  jsonb NOT NULL DEFAULT '[]',        -- [{anchor,target}]
  schema_type     text NOT NULL DEFAULT 'Article',
  blog_post_id    uuid,                               -- set once published
  published_at    timestamptz,
  generation_meta jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tiptip_content_status ON public.tiptip_content(status);
CREATE INDEX IF NOT EXISTS idx_tiptip_content_cal ON public.tiptip_content(calendar_month, calendar_week);

-- ── Keyword & topic map ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tiptip_keywords (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     text NOT NULL,
  tier        integer NOT NULL DEFAULT 2,             -- 1|2|3
  intent      text,                                   -- high|problem|awareness
  is_question boolean NOT NULL DEFAULT false,
  status      text NOT NULL DEFAULT 'planned',        -- planned|next|covered
  content_id  uuid REFERENCES public.tiptip_content(id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Brand-mention queue ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tiptip_brand_mentions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    text NOT NULL,                          -- reddit|forum|linkedin|x|guest_post
  title       text,
  body        text NOT NULL,
  target      text,                                   -- subreddit / url / handle
  rules_note  text,
  status      text NOT NULL DEFAULT 'draft',          -- draft|ready|posted
  content_id  uuid REFERENCES public.tiptip_content(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Technical-SEO checklist / tasks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tiptip_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc        integer NOT NULL DEFAULT 2,              -- which growth doc
  category   text,
  label      text NOT NULL,
  auto_type  text NOT NULL DEFAULT 'human',           -- auto|prep_send|human
  status     text NOT NULL DEFAULT 'todo',            -- todo|in_progress|done
  notes      text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS — everything is owner-only ───────────────────────────────────────────
ALTER TABLE public.tiptip_content        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiptip_keywords       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiptip_brand_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiptip_tasks          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tiptip_content_owner ON public.tiptip_content;
CREATE POLICY tiptip_content_owner ON public.tiptip_content FOR ALL
  USING (public.is_tiptip_owner()) WITH CHECK (public.is_tiptip_owner());
DROP POLICY IF EXISTS tiptip_keywords_owner ON public.tiptip_keywords;
CREATE POLICY tiptip_keywords_owner ON public.tiptip_keywords FOR ALL
  USING (public.is_tiptip_owner()) WITH CHECK (public.is_tiptip_owner());
DROP POLICY IF EXISTS tiptip_mentions_owner ON public.tiptip_brand_mentions;
CREATE POLICY tiptip_mentions_owner ON public.tiptip_brand_mentions FOR ALL
  USING (public.is_tiptip_owner()) WITH CHECK (public.is_tiptip_owner());
DROP POLICY IF EXISTS tiptip_tasks_owner ON public.tiptip_tasks;
CREATE POLICY tiptip_tasks_owner ON public.tiptip_tasks FOR ALL
  USING (public.is_tiptip_owner()) WITH CHECK (public.is_tiptip_owner());

-- ── Publish RPC — push a finished piece into the live blog ───────────────────
CREATE OR REPLACE FUNCTION public.tiptip_publish(_content_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  c        public.tiptip_content%ROWTYPE;
  v_slug   text;
  v_post   uuid;
  v_read   integer;
BEGIN
  IF NOT public.is_tiptip_owner() THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT * INTO c FROM public.tiptip_content WHERE id = _content_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'content not found'; END IF;
  IF c.body IS NULL OR length(trim(c.body)) = 0 THEN
    RAISE EXCEPTION 'nothing to publish — generate the article first';
  END IF;

  v_slug := COALESCE(NULLIF(trim(c.slug), ''),
                     regexp_replace(lower(c.title), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  v_read := GREATEST(1, round(array_length(regexp_split_to_array(c.body, '\s+'), 1) / 200.0));

  IF c.blog_post_id IS NOT NULL THEN
    UPDATE public.blog_posts SET
      slug = v_slug, title = c.title, excerpt = c.excerpt, content = c.body,
      meta_title = c.meta_title, meta_description = c.meta_description,
      keywords = CASE WHEN c.target_keyword IS NULL THEN keywords ELSE ARRAY[c.target_keyword] END,
      read_time = v_read, published = true,
      published_at = COALESCE(published_at, now()), updated_at = now()
    WHERE id = c.blog_post_id
    RETURNING id INTO v_post;
  END IF;

  IF v_post IS NULL THEN
    INSERT INTO public.blog_posts
      (slug, title, excerpt, content, category, keywords, meta_title, meta_description,
       author, read_time, published, published_at, created_by)
    VALUES
      (v_slug, c.title, c.excerpt, c.body, 'freelancing',
       CASE WHEN c.target_keyword IS NULL THEN '{}'::text[] ELSE ARRAY[c.target_keyword] END,
       c.meta_title, c.meta_description, 'Skryve Team', v_read, true, now(), auth.uid())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
      meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
      keywords = EXCLUDED.keywords, read_time = EXCLUDED.read_time,
      published = true, published_at = COALESCE(public.blog_posts.published_at, now()),
      updated_at = now()
    RETURNING id INTO v_post;
  END IF;

  UPDATE public.tiptip_content
    SET status = 'published', blog_post_id = v_post, published_at = now(),
        slug = v_slug, updated_at = now()
    WHERE id = _content_id;

  RETURN jsonb_build_object('blog_post_id', v_post, 'slug', v_slug);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.tiptip_publish(uuid) TO authenticated;

-- ── Seed: keyword map (Doc 3) ────────────────────────────────────────────────
INSERT INTO public.tiptip_keywords (keyword, tier, intent, is_question)
SELECT * FROM (VALUES
  ('best all-in-one freelance platform 2026', 1, 'high', false),
  ('alternative to Upwork', 1, 'high', false),
  ('alternative to Fiverr', 1, 'high', false),
  ('freelance platform with AI proposal tool', 1, 'high', false),
  ('freelance job aggregator', 1, 'high', false),
  ('all freelance jobs in one place', 1, 'high', false),
  ('Skryve review', 1, 'high', false),
  ('is Skryve legit', 1, 'high', true),
  ('what is Skryve', 1, 'high', true),
  ('how to find freelance work in 2026', 2, 'problem', true),
  ('how to get freelance clients with no experience', 2, 'problem', true),
  ('best websites to find freelance jobs', 2, 'problem', false),
  ('how to write a winning freelance proposal', 2, 'problem', true),
  ('best freelance skills to learn 2026', 2, 'problem', false),
  ('how to start freelancing', 3, 'awareness', true),
  ('how much do freelancers earn', 3, 'awareness', true),
  ('freelancing vs full-time job', 3, 'awareness', false),
  ('how to build a freelance portfolio', 3, 'awareness', true),
  ('freelance tips for beginners', 3, 'awareness', false)
) AS v(keyword, tier, intent, is_question)
WHERE NOT EXISTS (SELECT 1 FROM public.tiptip_keywords);

-- ── Seed: 3-month content calendar (Doc 3) ───────────────────────────────────
INSERT INTO public.tiptip_content (title, kind, target_keyword, keyword_tier, calendar_month, calendar_week, priority)
SELECT * FROM (VALUES
  ('Skryve vs Upwork: honest comparison',                'comparison', 'alternative to Upwork',            1, 1, 1,  10),
  ('What is Skryve? (entity/about page)',                'entity',     'what is Skryve',                   1, 1, 1,  11),
  ('Skryve vs Fiverr: which is better for you',          'comparison', 'alternative to Fiverr',            1, 1, 2,  20),
  ('How to Find Freelance Work in 2026',                 'pillar',     'how to find freelance work 2026',  2, 1, 2,  21),
  ('Best All-in-One Freelance Platforms 2026',           'listicle',   'best all-in-one freelance platform',1,1, 3,  30),
  ('FAQ: Skryve explained (answer-first)',               'faq',        'is Skryve legit',                  1, 1, 3,  31),
  ('How to Get Freelance Clients With No Experience',    'pillar',     'freelance clients no experience',  2, 1, 4,  40),
  ('The Freelance Job Aggregator explained',             'feature',    'freelance job aggregator',         1, 1, 4,  41),
  ('Freelance Design Jobs (category page)',              'category',   'freelance design jobs',            2, 2, 5,  50),
  ('How to Write a Winning Freelance Proposal',          'pillar',     'freelance proposal',               2, 2, 5,  51),
  ('Freelance Development Jobs (category page)',         'category',   'freelance developer jobs',         2, 2, 6,  60),
  ('Best Freelance Skills to Learn in 2026',             'pillar',     'best freelance skills 2026',       2, 2, 6,  61),
  ('Freelance Writing Jobs (category page)',             'category',   'freelance writing jobs',           2, 2, 7,  70),
  ('Best Websites to Find Freelance Jobs 2026',          'listicle',   'websites to find freelance jobs',  2, 2, 7,  71),
  ('How to Build a Freelance Portfolio',                 'pillar',     'build freelance portfolio',        3, 2, 8,  80),
  ('FAQ: Getting hired on Skryve (AEO)',                 'faq',        'how to get hired freelance',       2, 2, 8,  81),
  ('Freelancing vs Full-Time: honest breakdown',         'pillar',     'freelancing vs full-time',         3, 3, 9,  90),
  ('How Much Do Freelancers Earn in 2026?',              'data',       'how much do freelancers earn',     3, 3, 9,  91),
  ('Skryve vs Freelancer.com: honest comparison',        'comparison', 'Freelancer.com alternative',       1, 3, 10, 100),
  ('How to Start Freelancing (beginner pillar)',         'pillar',     'how to start freelancing',         3, 3, 10, 101),
  ('AI Tools Every Freelancer Should Use 2026',          'listicle',   'AI tools for freelancers',         3, 3, 11, 110),
  ('Update + expand Month 1 comparison pages',           'freshness',  'refresh existing',                 NULL, 3, 11, 111),
  ('Original: We analyzed X freelance jobs (report)',    'research',   'freelance market data 2026',       3, 3, 12, 120),
  ('Update + expand top pillar articles',                'freshness',  'refresh existing',                 NULL, 3, 12, 121)
) AS v(title, kind, target_keyword, keyword_tier, calendar_month, calendar_week, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.tiptip_content);

-- ── Seed: technical-SEO checklist (Doc 2) ────────────────────────────────────
INSERT INTO public.tiptip_tasks (doc, category, label, auto_type, sort_order)
SELECT * FROM (VALUES
  (2, 'Schema',   'Organization schema (site-wide) with founder + sameAs',            'auto',      10),
  (2, 'Schema',   'WebSite schema with SearchAction (sitelinks search box)',          'auto',      20),
  (2, 'Schema',   'JobPosting schema on every job listing page',                      'auto',      30),
  (2, 'Schema',   'FAQPage schema on every page with an FAQ block',                   'auto',      40),
  (2, 'Schema',   'Article schema on every blog post',                                'auto',      50),
  (2, 'Schema',   'BreadcrumbList schema on nested pages',                            'auto',      60),
  (2, 'Schema',   'Course schema on learning course pages',                           'auto',      70),
  (2, 'Crawl',    'Dynamic XML sitemap (static, blog, category, job/course pages)',   'auto',      80),
  (2, 'Crawl',    'robots.txt allowing content, disallowing private routes',          'auto',      90),
  (2, 'Crawl',    'SSR/SSG all content meant to rank (no client-only blank pages)',   'human',    100),
  (2, 'Crawl',    'Canonical tags on every page',                                     'auto',     110),
  (2, 'Crawl',    'Clean, readable URL structure',                                    'auto',     120),
  (2, 'Meta',     'Per-page unique title (55-60) + meta description (150-160)',       'auto',     130),
  (2, 'Meta',     'Open Graph + Twitter card tags, branded OG images',                'auto',     140),
  (2, 'Speed',    'next/image, WebP/AVIF, lazy-load, compress + CDN assets',          'human',    150),
  (2, 'Speed',    'LCP < 2.5s (preload hero + fonts, SSR/SSG critical pages)',        'human',    160),
  (2, 'Speed',    'CLS < 0.1 (explicit image dimensions, reserve space)',             'human',    170),
  (2, 'Speed',    'INP < 200ms (code-split, defer non-critical JS)',                  'human',    180),
  (2, 'Verify',   'Set up + verify Google Search Console',                            'human',    190),
  (2, 'Verify',   'Set up Google Analytics (or similar)',                             'human',    200),
  (2, 'Verify',   'Submit the sitemap to Google Search Console',                      'human',    210),
  (2, 'Verify',   'Run Lighthouse / Rich Results tests and fix flagged issues',      'prep_send',220)
) AS v(doc, category, label, auto_type, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.tiptip_tasks);
