

# Fix: Job Emails Always Wrong — Root Cause Found

## The Problem

There are **two separate email discovery systems** fighting each other:

1. **`search-jobs`** — The new Firecrawl-based agent that scrapes real company websites (the one we just built)
2. **`generate-job-application`** — Has its own OLD pattern-guessing logic that generates fake emails like `careers@companyname.com`

**The critical bug:** When calling `generate-job-application`, the frontend **never passes the email** that `search-jobs` already discovered. So `generate-job-application` always runs its own outdated guessing logic and returns a fabricated email. Then the frontend **prefers** this bad email over the good one.

```text
search-jobs finds: hr@realcompany.com (scraped from website) ✅
                     ↓
generate-job-application: doesn't receive it, guesses careers@realcompany.com ❌
                     ↓
Frontend uses: careers@realcompany.com (the wrong one) → "Address not found"
```

## Fix (3 changes)

### 1. Pass the discovered email from frontend to generate-job-application

In `src/pages/NewCampaign.tsx`, add `email: job.email` to the function invocation body so the existing email from search-jobs is forwarded.

### 2. Remove duplicate email discovery from generate-job-application

In `supabase/functions/generate-job-application/index.ts`, strip out the old `discoverCompanyEmail`, `buildCandidateDomains`, and `verifyDomainMX` functions. If a valid email was passed in, use it directly. Only fall back to a simple pattern if absolutely no email exists — and mark it as **unverified**.

### 3. Fix frontend email priority

In `src/pages/NewCampaign.tsx` line 696, flip the priority so the search-jobs email (which was scraped from real websites) takes precedence over any pattern-generated fallback:

```text
Before: const email = appResult?.extractedEmail || job.email;
After:  const email = job.email || appResult?.extractedEmail;
```

Also preserve the `emailVerified` status from search-jobs when using its email.

### 4. Add SMTP-level email validation before sending

Add a lightweight RCPT TO verification step in the send flow — before actually sending an email, connect to the recipient's mail server and check if the address exists. Skip sending to addresses that bounce at verification. This prevents "Address not found" errors entirely.

## Impact

- Emails scraped by the Firecrawl agent will actually be used instead of being thrown away
- The old pattern-guessing code is removed so it can't override real emails
- Users won't see "Address not found" bounces for verified emails
- Unverified pattern emails will be clearly marked so users can edit them before sending

