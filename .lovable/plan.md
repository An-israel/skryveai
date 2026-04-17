The user wants a comprehensive **Smart Email Finder System** integrated into SkryveAI. Let me think about what we already have and what's actually needed.

**What already exists:**

- `hunter-email` edge function (Hunter.io domain search + email verifier + email finder by name)
- Hunter.io is on Free plan (per memory `mem://tech/hunter-quota`)
- `HUNTER_API_KEY` already configured
- Email discovery is wired into Smart Find and broad search flows
- No Apollo, no NeverBounce, no JSDOM crawler

**What the user is asking for (4 features):**

1. Email Discovery Dashboard — single lookup UI
2. Bulk Email Finder — CSV upload + queue + export
3. Email Verification — standalone verification
4. Pattern Recognition — learn + predict company patterns

**Honest take I need to share before building:**

The user pasted what looks like a generic prompt (mentions Express, Redis, JSDOM, NeverBounce, Apollo, PostgreSQL via `db.query`). Our stack is **React + Vite + Supabase Edge Functions (Deno)** — not Express/Redis. Several things in the prompt don't fit and shouldn't be copied verbatim:

- No Redis needed → use Supabase + a `search_jobs` table polled/realtime-subscribed
- No Express → Supabase edge functions
- No JSDOM → we already use Firecrawl (configured)
- Apollo + NeverBounce require new paid API keys the user hasn't mentioned
- Hunter.io Free plan is **25 searches/month** — bulk finder will burn quota in one CSV

I need to ask before building. The plan also needs to fit cleanly beside Smart Find (not duplicate it).

## Plan: Email Finder Tool (standalone feature)

Add a new top-level tool **"Email Finder"** at `/email-finder`, separate from campaigns, alongside CV Builder / ATS Checker / LinkedIn Analyzer in the "Free AI Tools" suite.

### Scope (Phase 1 — ship this now)

**1. Database**

- `email_finder_searches` — single-search history per user (input, result, confidence, sources, created_at)
- `email_finder_jobs` — bulk CSV jobs (status, progress, input_rows, results jsonb, error, created_at, completed_at)
- `email_patterns` — learned `domain → pattern` cache (e.g. `acme.com → {first}.{last}`) with confidence + sample_count, updated whenever we find emails on a domain
- All RLS scoped to `user_id = auth.uid()`

**2. Edge functions (extend, don't duplicate)**

- **Reuse `hunter-email**` for Hunter.io domain-search + verify (already built, working)
- **New `email-finder-search**` — single lookup orchestrator:
  - Inputs: `firstName?, lastName?, domain | website | company`
  - Pipeline: Hunter `email-finder` (name+domain) → Hunter `domain-search` → Firecrawl scrape `/about /team /contact` → pattern prediction → Hunter `email-verifier` to verify
  - Returns merged result with confidence + sources array
  - Updates `email_patterns` table when ≥2 matching pattern emails are found on a domain
- **New `email-finder-bulk**` — async CSV processor:
  - Insert job row → return `jobId` immediately
  - Process serially in background (Deno `EdgeRuntime.waitUntil`), update `progress` and `results` after each row
  - Hard cap: 50 rows per job (Hunter Free limit safety) with clear UI warning
- **New `email-finder-verify**` — thin wrapper around Hunter verifier (separate endpoint per the spec)

**3. Frontend**

- `src/pages/EmailFinder.tsx` — tabbed UI: **Find Email** | **Bulk Find** | **Verify Email** | **History**
- Components in `src/components/email-finder/`:
  - `EmailSearchForm.tsx` — single lookup (firstName, lastName, domain/website/company)
  - `EmailResultCard.tsx` — confidence badge (green ≥90, yellow 70–89, orange <70), source chips, copy button, "Add to Campaign" button
  - `BulkUploader.tsx` — CSV drag-drop + column mapper + 50-row preview
  - `BulkJobStatus.tsx` — Realtime progress bar via Supabase channel on `email_finder_jobs`
  - `VerifyForm.tsx` — single-email verification panel
  - `SearchHistory.tsx` — table of past searches with re-run button
- Add route in `App.tsx` + nav entry in Footer "Free AI Tools" + Header tools menu
- "Add to Campaign" → push contact into a chosen draft campaign's `businesses` table

**4. Credits**

- 0.5 credit per single search (Hunter call cost)
- 0.5 credit per bulk row
- 0.2 credit per standalone verification
- Same trial/lifetime exemption rules as existing tools

**5. SEO landing page**

- `/tools/email-finder` public landing (linked from blog + footer) — JSON-LD `SoftwareApplication`, free-tier CTA, comparison table vs Hunter/Apollo. Targets keyword "free email finder tool".

### What I'm NOT building (and why)

- **Apollo.io integration** — needs paid key the user hasn't provided. Hunter + Firecrawl + pattern matching covers ~80% of cases.
- **NeverBounce** — Hunter's verifier is included in the same API; adding NeverBounce duplicates cost. Can swap later.
- **Redis queue** — Supabase + `EdgeRuntime.waitUntil` + realtime subscription handles this without new infra.
- **JSDOM crawler** — Firecrawl already does this better and is already wired.
- `**companies` + `emails` global cache table from spec** — not needed yet; patterns table covers the learning use case. Would create privacy concerns (one user's discovered emails leaking to another).

### Honest take on the user's prompt

The pasted spec is solid in intent but written for a generic Node/Express/Postgres/Redis stack. We'd be wasting effort copying it literally. The Lovable-native version above gives the same 4 features with our existing infrastructure (Hunter + Firecrawl + Supabase) and one-third the moving parts. The big real-world constraint is **Hunter Free plan = 25 searches/month** — at that quota, bulk finder is a demo, not a product. The user needs to upgrade Hunter or add a second provider before bulk is genuinely useful.

### Open questions

1. **Hunter quota.** Bulk finder + global discovery already share the 25/month Free tier. Should I (a) ship with a 50-row CSV cap and a "you've used X of 25 monthly Hunter calls" banner, (b) wait until you upgrade Hunter, or (c) add a second provider (Apollo) — which needs its API key?  
remove hunter entirely and build something that does same thing that hunter does
2. **"Add to Campaign"** button — should it create a brand-new campaign with the found contact, or append to an existing draft campaign chosen from a dropdown?  
when a user creates campaign, the email finder works in the background the find correct email for the select businesses, also for auto pilot, works hand in hand to ensure the emails the autopilot is sending to is correct and confirmed
3. **Standalone tool vs inside campaigns.** Build at `/email-finder` as its own free tool (my recommendation, helps SEO + lead-gen), or embed inside the campaign flow only?  
both of them
4. **Pattern learning privacy.** Should the `email_patterns` table be (a) per-user (each user builds their own cache), or (b) global (everyone benefits, faster results)? Global is faster but means one user's research helps competitors. (b) global