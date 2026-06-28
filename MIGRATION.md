# Migrating Skryve to your own Supabase + Vercel

This moves the backend off the Lovable-managed Supabase project
(`dgyuafltlpruhdlgwiew`) onto a project **you fully control**
(`uwwmwerdfpyekgshkrft`), and the frontend onto Vercel with your domain.

You run these steps (they need your credentials on both projects). The repo is
already repointed to the new project ref in `config.toml`, the deploy scripts,
and the cron migration.

Prerequisites: the [Supabase CLI](https://supabase.com/docs/guides/cli),
`psql`/`pg_dump` (ships with Postgres), and your Supabase access token.

---

## 1. Prepare the new project

In the new project's dashboard (`uwwmwerdfpyekgshkrft`):

1. **Database → Extensions**: enable `pg_cron`, `pg_net`, `uuid-ossp`, `pg_trgm`.
2. **Storage → Buckets**: create the same buckets used by the app:
   `avatars`, `cv-uploads`, `deliverables`, `portfolio`
   (match the public/private + size settings from the old project's Storage).

---

## 2. Migrate users + data from the old project

Get both connection strings from **Database → Connection string → URI**
(use the **session/direct** connection, and the database password) for the old
and new projects. Then, following Supabase's
[migrate-between-projects guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore):

```bash
# From the OLD project — roles, schema, and data (includes auth.users with
# password hashes, and the supabase_migrations history).
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --data-only --use-copy

# Restore into the NEW project, in order:
psql "$NEW_DB_URL" -f roles.sql
psql "$NEW_DB_URL" -f schema.sql
psql "$NEW_DB_URL" -f data.sql
```

This reproduces the current live state (all users + data) on the new project.

> Tip: if the data restore complains about triggers firing (e.g. duplicate
> profiles from `handle_new_user`), restore with
> `psql "$NEW_DB_URL" -c "SET session_replication_role = replica;" -f data.sql`
> to suppress triggers during the load.

---

## 3. Apply the newer migrations

The Lovable project was stuck at an older state, so several migrations in
`supabase/migrations/` were never applied (RLS hardening, `aggregated_jobs.platform`
→ text, the hardened scrape-jobs cron, `notifications.link`). Bring the new
project fully up to date:

```bash
supabase login
supabase link --project-ref uwwmwerdfpyekgshkrft
supabase db push          # applies any migrations not yet in supabase_migrations
```

If `db push` reports nothing pending (because the dump's migration history was
already current), apply the four newest migration files manually in the SQL editor:
`20260627000000_security_advisor_fixes.sql`,
`20260627010000_aggregated_jobs_platform_text.sql`,
`20260627020000_harden_scrape_jobs_cron.sql`,
`20260627030000_notifications_link.sql`.

---

## 4. Set the edge-function secrets

The functions read these (Supabase auto-provides `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — you do **not** set those).
Set the rest with values from the old project / your providers:

```bash
supabase secrets set \
  RESEND_API_KEY=... \
  SITE_URL=https://skryveai.com \
  ANTHROPIC_API_KEY=... \
  GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_PLACES_API_KEY=... \
  PAYSTACK_SECRET_KEY=... Paystack_API=... \
  FIRECRAWL_API_KEY=... HUNTER_API_KEY=... APOLLO_API_KEY=... ZEROBOUNCE_API_KEY=... \
  AUTOPILOT_CRON_SECRET=... ADMIN_EMAIL=... \
  --project-ref uwwmwerdfpyekgshkrft
```

`RESEND_API_KEY` is the one that gates auth + notification emails — it's required.
(`LOVABLE_API_KEY` is only needed if you keep using the old `auth-email-hook`;
the new `send-auth-email` flow doesn't need it.)

---

## 5. Deploy the edge functions

```bash
supabase functions deploy --project-ref uwwmwerdfpyekgshkrft
```

This deploys **all** functions and honours `verify_jwt` from `config.toml`
(including the public `send-auth-email`, `send-notification`, `scrape-jobs`).
Or just run `./deploy_functions.sh <access-token>` (or `deploy_functions.bat`),
which links, pushes migrations, and deploys everything.

---

## 6. Configure Auth

In the new project: **Authentication → URL Configuration**
- **Site URL**: `https://skryveai.com`
- **Redirect URLs**: add `https://skryveai.com/login`, `/dashboard`,
  `/reset-password` (and your Vercel preview domain if you want previews to work).

**Authentication → Providers → Email**: keep "Confirm email" ON, but you can
leave Supabase's built-in template alone — confirmation/reset emails are now sent
by the `send-auth-email` function via Resend, not by Supabase. (You can disable
the Supabase "Send Email Hook" entirely; it's no longer used.)

**Google**: under Providers → Google, set the same Client ID/Secret and add the
new project's callback URL to the Google Cloud console authorised redirect URIs.

---

## 7. Verify the sender domain in Resend

In Resend, verify **`skryveai.com`** (add the SPF + DKIM DNS records). Until this
is done, emails from `noreply@skryveai.com` / `outreach@skryveai.com` will fail
or land in spam. This is the single most common cause of "no email received".

---

## 8. Point the frontend at the new project + deploy to Vercel

Update these to the new project's values (URL + **anon key** from
**Settings → API**). Set them as Vercel **Environment Variables** (Production +
Preview), and mirror them in the local `.env`:

```
VITE_SUPABASE_PROJECT_ID="uwwmwerdfpyekgshkrft"
VITE_SUPABASE_URL="https://uwwmwerdfpyekgshkrft.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<new project's anon key>"
```

In Vercel: import the GitHub repo, framework **Vite**, build `npm run build`,
output `dist` (already in `vercel.json`), add the three env vars, deploy.

---

## 9. Move the domain

1. In Lovable, disconnect `skryveai.com`.
2. In Vercel → Project → Domains, add `skryveai.com` (and `www`) and set the DNS
   records Vercel shows at your registrar.
3. Re-check that the Auth redirect URLs (step 6) and Resend domain (step 7) use
   the final domain.

---

## 10. Smoke test

- Sign up with a fresh email → confirmation email arrives (check spam) → link
  activates the account.
- Forgot password → reset email arrives → reset works.
- Admin → **Refresh jobs now** → `/jobs` fills; cron keeps it fresh every 4h.
- Send a message / offer → recipient gets in-app + email notification.

If any email fails after step 7, open the function's logs
(**Edge Functions → send-auth-email / send-notification → Logs**) — the Resend
error there names the exact problem.

---

### Note on other crons
The original `send-digest` cron (migration `20260529000003`) still calls the
function via `current_setting('app.supabase_url')`. If you want the daily digest
to run on the new project, either set those DB settings
(`ALTER DATABASE postgres SET app.supabase_url = '...';` etc.) or tell me and I'll
harden it the same way as `scrape-jobs`.
