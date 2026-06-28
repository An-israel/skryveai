#!/usr/bin/env bash
# ============================================================
# Skryve - Deploy ALL edge functions + apply DB migrations
# Usage: ./deploy_functions.sh YOUR_SUPABASE_ACCESS_TOKEN
# ============================================================
set -euo pipefail

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: Please provide your Supabase access token"
  echo "Usage: ./deploy_functions.sh sbp_xxxxxxxxxx"
  exit 1
fi

# Live project ref (matches supabase/config.toml)
PROJECT_REF="uwwmwerdfpyekgshkrft"
export SUPABASE_ACCESS_TOKEN="$TOKEN"

supabase login --token "$TOKEN"
supabase link --project-ref "$PROJECT_REF"

echo
echo "Applying database migrations..."
supabase db push || echo "WARNING: db push failed - apply migrations manually if needed."

echo
echo "Deploying ALL edge functions (reads supabase/config.toml for verify_jwt)..."
supabase functions deploy --project-ref "$PROJECT_REF"

echo
echo "Done! If auth/notification emails still don't arrive, confirm:"
echo "  - secret RESEND_API_KEY is set (supabase secrets set RESEND_API_KEY=...)"
echo "  - skryveai.com is a verified sender domain in Resend (SPF/DKIM)"
