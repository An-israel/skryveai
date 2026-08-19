# Skryve

Skryve is a freelance marketplace: talent profiles, job listings and
applications, a learning hub with courses/quizzes/certificates, an AI
career toolkit (CV builder, ATS checker, LinkedIn analyzer, cover letters),
messaging, events, and billing — plus an admin panel and a set of Supabase
Edge Functions and scheduled jobs that power all of it.

## Stack

- **Frontend**: Vite + React + TypeScript, shadcn-ui, Tailwind CSS
- **Backend**: Supabase (Postgres + Row Level Security, Auth, Storage,
  Edge Functions on Deno, pg_cron)
- **Payments**: Paystack

## Getting started

```sh
git clone <this-repo-url>
cd skryveai
npm install
cp .env.example .env   # then fill in your Supabase project's values
npm run dev
```

The dev server runs at `http://localhost:8080`.

### Environment variables

Copy `.env.example` to `.env` and fill in your own Supabase project's
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and
`VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase Dashboard → Project Settings →
API). `.env` is git-ignored — never commit real values.

### Database & Edge Functions

Migrations live in `supabase/migrations/`; Edge Functions live in
`supabase/functions/`. With the [Supabase CLI](https://supabase.com/docs/guides/cli)
installed and linked to your project:

```sh
supabase db push                          # apply migrations
SUPABASE_PROJECT_REF=your-ref ./scripts/deploy-functions.sh
SUPABASE_PROJECT_REF=your-ref ./scripts/setup-secrets.sh
```

`scripts/setup-secrets.sh` prints the follow-up Dashboard steps (auth email
hook, Paystack webhook, Resend domain verification) once secrets are set.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the frontend |
| `npm run test` | Run the test suite |
| `npm run preview` | Preview a production build locally |

## Project structure

- `src/` — the React app (pages, components, hooks, lib)
- `supabase/functions/` — Edge Functions (Deno)
- `supabase/migrations/` — database schema & RLS policies
- `scripts/` — deploy/ops scripts
