# How to Run Skryve

A step-by-step setup guide for running Skryve locally, aimed at someone
new to the project.

## 1. Install Node.js (once)

Go to **https://nodejs.org**, download the LTS installer, and run it.

## 2. Install dependencies

```sh
git clone <this-repo-url>
cd skryveai
npm install
```

## 3. Set up Supabase

1. Go to **https://supabase.com** → sign up free → **New Project**
2. Once it's initialized: **Project Settings → API**, copy the **Project
   URL** and **anon public** key
3. Copy `.env.example` to `.env` and paste those two values in, along
   with the project ref (the part of the URL before `.supabase.co`)
4. Apply the schema with the [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
   This runs every migration in `supabase/migrations/` — tables, RLS
   policies, and functions.

## 4. Start the app

```sh
npm run dev
```

Open **http://localhost:8080**. Frontend-only features (browsing, most UI)
work at this point. AI tools, payments, and scheduled jobs need the Edge
Functions deployed too (step 6).

## 5. Get API keys for the features you want to run

Only needed once you deploy Edge Functions in step 6:

- **Anthropic** (AI features — CV builder, ATS checker, cover letters,
  proposals, learning coach, etc.): https://console.anthropic.com/settings/keys
- **Paystack** (payments): https://dashboard.paystack.com → Settings → API Keys
- **Resend** (transactional email): https://resend.com → API Keys

## 6. Deploy Edge Functions

```sh
npm install -g supabase
SUPABASE_PROJECT_REF=your-project-ref ./scripts/deploy-functions.sh
SUPABASE_PROJECT_REF=your-project-ref ./scripts/setup-secrets.sh
```

`setup-secrets.sh` prompts you to fill in the API keys from step 5 before
running, and prints the Dashboard steps it can't automate afterward:
wiring the Auth email hook, the Paystack webhook, and Resend domain
verification.

## 7. Deploy the frontend

**Vercel** (recommended):
1. Push this repo to GitHub
2. https://vercel.com → Import Project → select the repo
3. Add the three `VITE_*` variables from your `.env` in Vercel's project
   settings
4. Deploy

**Netlify**: `npm run build`, then drag the `dist/` folder onto
https://app.netlify.com/drop.

## Troubleshooting

- **"Missing Supabase environment variables"** → `.env` isn't filled in,
  or you're missing `VITE_` prefixes
- **Blank/broken pages after `db push`** → check the Supabase Dashboard's
  SQL Editor logs for a failed migration
- **AI tools return errors** → check `ANTHROPIC_API_KEY` is set via
  `supabase secrets list --project-ref YOUR_PROJECT_REF`
- **Payments don't complete** → confirm the Paystack webhook is pointed at
  `https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook`
