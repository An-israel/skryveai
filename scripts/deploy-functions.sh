#!/usr/bin/env bash
# Deploy all Skryve Edge Functions to production Supabase
# Usage: SUPABASE_PROJECT_REF=your-project-ref ./scripts/deploy-functions.sh
#
# Prerequisites:
#   npm install -g supabase
#   supabase login
#
# This used to hardcode a project ref and a hand-maintained function list —
# both had drifted from the actual project/functions and would have
# silently deployed to the wrong project while skipping ~20 real functions
# (including auth, payment-verification and cron endpoints). Deploys every
# directory under supabase/functions instead, so it can't go stale again.

set -euo pipefail

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "ERROR: SUPABASE_PROJECT_REF is not set." >&2
  echo "  Find it at: Supabase Dashboard → Project Settings → General → Reference ID" >&2
  echo "  Usage: SUPABASE_PROJECT_REF=your-project-ref ./scripts/deploy-functions.sh" >&2
  exit 1
fi
PROJECT_REF="$SUPABASE_PROJECT_REF"

echo "→ Deploying Edge Functions to project: $PROJECT_REF"
echo ""

cd "$(dirname "$0")/../supabase/functions"

for dir in */; do
  fn="${dir%/}"
  [[ "$fn" == "_shared" ]] && continue
  echo "  deploying $fn..."
  # Per-function verify_jwt is set in supabase/config.toml and read
  # automatically — not passed here, since most functions do their own
  # inline auth and a small number still rely on gateway JWT verification;
  # a blanket --no-verify-jwt would have silently disabled that for them.
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1 | tail -1
done

echo ""
echo "✓ All functions deployed."
echo ""
echo "Next: run ./scripts/setup-secrets.sh to set production secrets"
