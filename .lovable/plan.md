
Goal: stop the “same email on many jobs” issue by switching from company-level guessing to true per-job employer scraping with strict quality gates.

What is failing now (from current code + logs)
- `search-jobs` caches email by `company` string, then applies one email to all jobs with that parsed company.
- Company parsing is often wrong for job-board titles (especially Wellfound/Indeed formats), so many jobs collapse to platform-like companies.
- “Find Email” currently sends only `job.company`, not the job URL/content, so deep lookup can still target the wrong entity.
- Search-snippet emails are marked `verified: true` too easily, so junk addresses appear as trusted.
- Pattern fallback (`info@domain`) still injects low-quality addresses for job flow.

```text
Current:
job listing -> weak company parse -> company cache key -> one email reused on many jobs

Target:
job listing -> scrape that exact job URL -> resolve employer domain -> find employer email
```

Implementation plan

1) Rebuild email discovery as per-job (not per-company)
- In `supabase/functions/search-jobs/index.ts`, add a job-context resolver:
  - Input: `jobTitle`, `jobUrl`, `description`, `rawCompany`.
  - Step A: scrape the individual job URL first and extract:
    - direct contact emails on the listing page
    - outbound employer website link(s)
    - employer name clues from page text
  - Step B: resolve employer domain from extracted links/content (reject platform domains).
  - Step C: crawl resolved employer site (`/contact`, `/careers`, `/about`, `/team`) for emails.
  - Step D: targeted fallback search using job title + employer name + domain (not just company string).
- Cache only by resolved `employerDomain` (safe reuse for true same employer), never by raw title company text.

2) Remove low-quality fallback for job applications
- Disable synthetic pattern generation (`info@...`) for job search results.
- If no real email is found for a job, return `null` and keep that job actionable via manual lookup/edit.

3) Tighten verification and confidence
- Add stricter output fields per job:
  - `emailSource`: `job_page | employer_site | search_snippet | none`
  - `emailConfidence`: `high | medium | low`
  - `employerDomain`
- Set `emailVerified=true` only when:
  - email came from job page or employer site, and
  - email domain matches resolved employer domain.
- Mark snippet-only results as unverified/low confidence.

4) Fix manual “Find Email” to be truly per-job
- Update `src/components/campaign/JobSelectStep.tsx`:
  - pass full job context (title + url + description + current company) instead of only `findEmailFor: company`.
  - show “Re-find Email” for unverified/low-confidence emails too (not only when email is missing).
- Backend single-job branch in `search-jobs` should use the same per-job resolver as bulk mode.

5) Carry quality metadata through the UI + send flow
- Update `src/types/campaign.ts` (`JobListing`) with `emailSource`, `emailConfidence`, `employerDomain`.
- Update `src/pages/NewCampaign.tsx` to preserve these fields from selection to generated applications.
- In `PitchStep`, display confidence/source and highlight risky addresses.
- In send step, block or warn strongly for `low` confidence/missing email (require manual correction before queueing).

6) Add anti-contamination guard
- During one search run, if the same email appears across many jobs with different resolved employer domains, mark as suspicious and clear it for those mismatches.
- This prevents one bad snippet email from poisoning dozens of listings.

Files to update
- `supabase/functions/search-jobs/index.ts` (major rewrite to per-job resolver + stricter verification)
- `src/components/campaign/JobSelectStep.tsx` (manual re-find with job context; re-find action visibility)
- `src/types/campaign.ts` (new email quality fields)
- `src/pages/NewCampaign.tsx` (propagate metadata + send gating)
- `src/components/campaign/PitchStep.tsx` (confidence/source display and editing UX)

Validation checklist (done before rollout)
- Run a 40–50 job search and confirm no mass reuse of one unrelated email.
- Confirm platform emails (`@wellfound.com`, `@indeed.com`, etc.) are never marked verified.
- Confirm manual re-find on a bad row uses the specific job URL and can return a different result.
- Confirm end-to-end on mobile `/campaigns/new`: search -> select -> generate -> send gating behaves correctly.
