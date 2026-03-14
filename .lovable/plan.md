

# Fix Job Email Discovery — Real Email Scraping Agent

## Problem
The current system guesses emails like `careers@{companyname}.com` by checking MX records. These are almost never real, deliverable addresses. No actual scraping of company websites happens.

## Solution
Replace the guessing logic with a multi-step email discovery agent that uses Firecrawl (already connected) to find real emails from company websites. The agent runs in parallel for each unique company during the search.

## Discovery Pipeline (per company)

```text
Step 1: Find company website
  → Firecrawl search: "{company name} official website contact"
  → Extract the company's real domain (filter out job platforms)

Step 2: Scrape contact pages
  → Use Firecrawl map to find /contact, /about, /careers, /team URLs
  → Scrape those pages for email addresses via regex on HTML/markdown

Step 3: Targeted web search fallback
  → Firecrawl search: "{company name} email contact HR hiring"
  → Extract emails from search result snippets

Step 4: Pattern fallback (last resort, marked unverified)
  → Only if steps 1-3 fail, use info@/hello@/careers@ with MX check
```

## Technical Changes

### 1. Rewrite `supabase/functions/search-jobs/index.ts`

Replace `discoverEmailForCompany` and `buildCandidateDomains` with a new `discoverRealEmail` function that:

- **Step 1 — Find website**: Firecrawl search for `"{company}" website contact email` (limit: 3). Pick the first non-platform-domain result URL as the company domain.
- **Step 2 — Scrape for emails**: Use Firecrawl scrape on the company domain's contact/careers page. Extract all emails via regex, filter out noreply/platform emails, prioritize HR-related prefixes (hr@, careers@, hiring@, jobs@, recruit@, info@, hello@, contact@).
- **Step 3 — Search fallback**: If no email found, Firecrawl search `"{company}" HR email contact` and extract emails from markdown results.
- **Step 4 — Pattern fallback**: Only as absolute last resort, generate `info@{domain}` with MX verification, marked as unverified.

Processing: Batch 5 companies in parallel. Each company's pipeline has a 10-second timeout to keep total search under 30 seconds.

### 2. Email quality scoring

Each discovered email gets a `discoveryMethod` field:
- `scraped` — found on company website (highest confidence)
- `searched` — found via web search results
- `pattern` — generated from company name (lowest confidence)

The UI already shows verified/unverified badges — we'll map `scraped`/`searched` → verified, `pattern` → unverified.

### 3. Email validation improvements

- Expanded platform domain blacklist to reject emails like `jobs@indeed.com`
- Filter out noreply@, no-reply@, donotreply@ addresses
- Prefer emails with HR-related prefixes over generic ones

## No frontend changes needed
The existing UI already handles `email` and `emailVerified` fields. The only change is backend logic that produces better data.

## Estimated impact
- Current: ~0% real emails (all guessed patterns)
- After: Majority of companies with websites will have real scraped emails

