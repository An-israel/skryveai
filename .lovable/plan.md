The user wants two things:

1. **Smart Business Discovery** — replace random Google Places search with AI-powered need-detection that finds businesses showing pain signals, scores them, lets the user pick the top ones, then deep-analyzes and emails. And this is for autopilot and everything in the campaign except find investor. 
2. **Blog page** — up to 50 SEO blog posts to dominate search for keywords related to what Skryve offers.

I already know from the codebase:

- Campaign flow lives in `src/pages/NewCampaign.tsx` with steps in `src/components/campaign/` (Search → Select → Analyze → Pitch → Send).
- `search-businesses` edge function uses Google Places + Hunter.io.
- `analyze-website` does a single-site audit.
- `Footer.tsx` Already has a "Free AI Tools" column; we can add Blog.
- React Router is used; SEO uses `react-helmet-async` + `SEOHead` component.
- Supabase with Lovable Cloud, Lovable AI Gateway available (Gemini), Firecrawl available for scraping.

## Plan

### Part 1 — Smart Business Discovery (new "Smart Find" mode)

Add a new campaign mode **"Smart Find"** alongside the existing Freelancer/Direct/Investor flows. Don't replace the current search — keep it as an option for users who want broad reach. Smart Find becomes the recommended default.

**New step flow:**

```text
Service → Smart Search → Need-Scored Results → Select → Deep Analyze → Personalized Pitch → Send
```

**1. New step: `ServiceDefinitionStep.tsx**`

- User describes their service in natural language (e.g. "I help Shopify stores fix checkout conversion")
- AI (claude) extracts:
  - Industry vertical
  - Target business profile (platform, size hints)
  - Pain signals to detect (checkbox-editable list)
- Stored in campaign state.

**2. New edge function: `smart-find-businesses**`

- Takes service definition + signals.
- Step A: Broader Google Places search (keep existing infra) → up to 100 candidates.
- Step B: For each candidate website, run lightweight signal detection in parallel (batched 10 at a time):
  - Use Firecrawl `scrape` (already wired) to fetch HTML + screenshot.
  - Use Lovable AI Gemini Flash with the signal checklist to detect: trust badges, mobile responsiveness hints, checkout step count, missing payment options, outdated copyright, no email capture, broken SSL, slow load (from headers), and no blog/social activity.
  - Returns boolean signals + 1-line evidence per signal.
- Step C: Score 0-100 using weighted signal config (per service vertical).
- Returns top 30 with score ≥ 60, sorted descending.

**3. New step: `NeedScoredResultsStep.tsx**`

- Cards showing: business name, score (color-coded HIGH/MED/LOW), bulleted "Problems Found" with evidence snippets, screenshot thumbnail.
- User selects up to 10 to advance.

**4. Enhanced `analyze-website` (deep mode)**

- Add `deep: true` flag.
- When set, also performs:
  - Competitor lookup (Gemini search-grounded query "top competitors of {business} in {industry}").
  - Recent news/funding signal (Gemini grounded search).
  - Estimated dollar impact of fixing the detected problem (rule-based formula by signal type).
- Returns expanded analysis payload.

**5. Enhanced `generate-pitch**`

- Receives the specific signals + evidence + competitor context.
- Prompt includes "Mention the SPECIFIC problem found with evidence" so emails reference the actual issue (e.g. "noticed your checkout doesn't have trust badges").

**6. UI integration**

- `CampaignTypeSelector.tsx` gets a new card: **"Smart Find (Recommended)"** with badge "AI-qualified leads".
- Existing search flow remains as "Broad Search".
- New `FeatureGuide` config for Smart Find.

**Credits & limits**

- Smart Find costs 1 credit per qualified lead returned (vs 0.2/email currently). Reasoning: AI scoring is expensive. Configurable.
- Hunter.io stays as an email-finder layer after selection.

**Database**

- New table `smart_find_signals`: `id, campaign_id, business_id, signals jsonb, score int, evidence jsonb, screenshot_url, created_at`. RLS: user owns campaign.

### Part 2 — Blog page for SEO/GEO

**Routes & pages**

- `/blog` — index page listing all posts with category filters, search, featured post.
- `/blog/:slug` — individual post page with SEO-rich layout, JSON-LD `BlogPosting` schema, related posts, share buttons, CTA to sign up.

**Database**

- New table `blog_posts`:
  - `id, slug (unique), title, excerpt, content (markdown), cover_image, category, tags[], keywords[], meta_title, meta_description, author, read_time, published, published_at, featured, view_count, created_at, updated_at`
- RLS: public read where `published = true`; admin write.

**Admin UI**

- New tab in `Admin.tsx` → **Blog Manager** (`AdminBlogManager.tsx`).
- Create/edit posts with markdown editor, slug auto-gen, image upload, SEO field overrides, category dropdown, publish toggle.
- Bulk import seed function to load 10 starter posts.

**Seed content** (10 high-quality posts at launch, not 50 thin ones — per the user's own honest assessment):

1. "How to Find Businesses That Actually Need Your Service (2026 Guide)"
2. "Why 90% of Cold Emails Fail — And the Signal-Based Fix"
3. "AI Cold Email vs Manual Outreach: Real Reply Rate Data"
4. "Cold Email Templates for Freelancers in Africa That Get 18% Reply Rates"
5. "Free AI CV Builder vs Paid Tools: Honest Comparison"
6. "How an AI LinkedIn Analyzer Can 3x Your Profile Views"
7. "ATS Score Checker: Why 75% of CVs Get Auto-Rejected"
8. "SkryveAI vs Instantly vs Apollo: Which Cold Email Tool Wins for Solopreneurs"
9. "How to Get Your First 10 Clients as a Freelancer Using Cold Email"
10. "The Complete Guide to AI-Powered Outreach for Startup Founders"

Each post: 1500-2500 words, original framing, includes internal links to `/cv-builder`, `/ats-checker`, `/linkedin-analyzer`, `/pricing`, screenshots, FAQ section, CTA.

**SEO infrastructure**

- Add `BlogPost` JSON-LD per post + `Blog` schema on index.
- Update `public/sitemap.xml` generation: add edge function `generate-sitemap` that regenerates including all published blog slugs (cron daily).
- Add `/blog` to footer "Resources" column.
- Each post uses `SEOHead` with unique title/description/keywords/OG image.

**Programmatic SEO (Phase 2 — flagged for later)**

- Stub the `/tools/[tool-slug]` template route for future expansion (10 tool landing pages — CV builder, ATS checker, LinkedIn analyzer, cold email generator, etc.).

### Technical summary


| Area               | Files / Functions                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Smart Find UI      | `src/components/campaign/ServiceDefinitionStep.tsx`, `NeedScoredResultsStep.tsx`, update `CampaignTypeSelector.tsx`, `NewCampaign.tsx` |
| Smart Find backend | `supabase/functions/smart-find-businesses/index.ts` (new), enhance `analyze-website/index.ts`, enhance `generate-pitch/index.ts`       |
| Blog UI            | `src/pages/Blog.tsx`, `src/pages/BlogPost.tsx`, `src/components/blog/BlogCard.tsx`, `src/components/blog/MarkdownRenderer.tsx`         |
| Blog admin         | `src/components/admin/AdminBlogManager.tsx`, add tab to `Admin.tsx`                                                                    |
| Blog backend       | `supabase/functions/generate-sitemap/index.ts` (new), seed migration with 10 posts                                                     |
| DB                 | Migrations: `blog_posts`, `smart_find_signals` tables + RLS                                                                            |
| Routing            | Add `/blog` and `/blog/:slug` to `App.tsx`; add to footer + sitemap                                                                    |
| Dependencies       | `react-markdown`, `remark-gfm`, `rehype-raw` for blog rendering                                                                        |


### Honest take on user's two ideas

**Smart Find: 10/10.** This IS your moat. Every other tool searches; nobody scores need. The pseudo-code architecture you shared is exactly the right approach — we'll implement it with Firecrawl + Gemini + a configurable signal weights table per industry.

**Blog: agree with the strategist's reframe.** 50 thin AI-generated posts will hurt rather than help (Google penalizes low-quality AI content in 2026). Ship **10 exceptional posts** at launch, build the CMS so you can publish more weekly, and add the programmatic SEO `/tools/[slug]` template later once we have authority signals. This is exactly what was recommended to you.

### Open questions before I build

1. For Smart Find scoring, should signal weights be: (a) preset per industry vertical (e.g. e-commerce, SaaS, agency), or (b) user-customizable in the UI, or (c) both — preset defaults the user can override?  
answer: C both
2. For the blog, do you want me to write all 10 seed posts in full at launch (longer build), or scaffold the CMS + write 3 flagship posts first and you/I add the rest over time (faster ship)?  
write it and ensure is rich in SEO,GEO and AEO
3. Should Smart Find replace the current "Find Clients" mode entirely, or sit beside it as the recommended option?  
replace entirely please