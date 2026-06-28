#!/usr/bin/env bash
# One-shot database migration: copies schema + ALL data (incl. auth users with
# their password hashes) from the OLD Supabase project to the NEW one.
#
# Usage:
#   ./scripts/migrate-db.sh "<OLD_DB_URL>" "<NEW_DB_URL>"
#
# Where each *_DB_URL is the "Connection string (URI)" from
#   Project Settings -> Database -> Connection string -> URI
# with [YOUR-PASSWORD] replaced by that project's database password.
#
# Requires: the Supabase CLI and psql (PostgreSQL client) on your PATH.
set -euo pipefail

OLD_DB_URL="${1:?Provide the OLD project DB URL as the 1st argument}"
NEW_DB_URL="${2:?Provide the NEW project DB URL as the 2nd argument}"

echo "==> Dumping from OLD project..."
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql  --role-only
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql
supabase db dump --db-url "$OLD_DB_URL" -f data.sql   --data-only --use-copy

echo "==> Restoring into NEW project..."
psql "$NEW_DB_URL" -f roles.sql
psql "$NEW_DB_URL" -f schema.sql
# session_replication_role=replica stops triggers (e.g. handle_new_user) from
# firing during the data load, which would otherwise create duplicate rows.
psql "$NEW_DB_URL" -c "SET session_replication_role = replica;" -f data.sql

echo "==> Database migration complete."
echo "    Next: supabase link --project-ref uwwmwerdfpyekgshkrft && supabase db push && supabase functions deploy"
