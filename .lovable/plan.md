

# Fix LinkedIn Analyzer & Build Errors

## Problem
1. The LinkedIn Analyzer fails with "Failed to send a request to the Edge Function" — the `check-ats-score` function needs redeployment
2. Multiple TypeScript build errors across edge functions (mainly `autopilot-run/index.ts`, `admin-user-auth-actions/index.ts`, `hunter-email/index.ts`, `process-confirmation-reminders/index.ts`) are blocking the build

## Plan

### Step 1: Fix build errors in edge functions

**`admin-user-auth-actions/index.ts`** (line 143): Cast `error` to `Error` type
```ts
(error as Error).message
```

**`autopilot-run/index.ts`**: The `never` type errors indicate the Supabase client is typed against an outdated schema that doesn't include `autopilot_sessions`, `autopilot_activity`, and `contacted_businesses` tables. Fix by casting the supabase client or using `.from()` with explicit `any` typing throughout the function.

**`hunter-email/index.ts`** (line 161): Remove the non-existent `getClaims` call — replace with `getUser` which is the correct Supabase auth method.

**`process-confirmation-reminders/index.ts`** (line 128): Cast `error` to `Error` type.

### Step 2: Redeploy `check-ats-score` edge function

Deploy the function so the LinkedIn Analyzer can call it successfully.

### Step 3: Verify the LinkedIn Analyzer works

Test the `check-ats-score` function with LinkedIn mode to confirm it responds correctly.

## Technical Details
- The LinkedIn Analyzer page (`src/pages/LinkedInAnalyzer.tsx`) calls `supabase.functions.invoke("check-ats-score", { body: { mode: "linkedin", ... } })` — the edge function code is correct but needs deployment
- The `autopilot-run` type errors are caused by tables (`autopilot_sessions`, `autopilot_activity`, `contacted_businesses`) not being reflected in the generated TypeScript types — fix with `as any` casts on the supabase client in the edge function
- All other edge function errors are minor `unknown` type casts on catch blocks

