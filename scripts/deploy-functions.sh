#!/usr/bin/env bash
# Deploy all Skryve Edge Functions to production Supabase
# Usage: ./scripts/deploy-functions.sh
#
# Prerequisites:
#   npm install -g supabase
#   supabase login
#   Set SUPABASE_PROJECT_REF below (or export it before running)

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-dgyuafltlpruhdlgwiew}"

echo "→ Deploying Edge Functions to project: $PROJECT_REF"
echo ""

# Critical functions — deploy these first
CRITICAL=(
  auth-email-hook
  initialize-payment
  verify-payment
  paystack-webhook
  send-welcome-email
)

# Supporting functions
SUPPORTING=(
  send-email
  send-admin-email
  send-digest
  send-daily-encouragement
  send-team-invite
  send-push-notifications
  event-reminders
  learning-coach-reminders
  learning-coach-chat
  learning-review-assignment
  generate-ai-coach
  generate-cover-letter
  generate-cv-summary
  generate-job-application
  generate-proposal
  generate-pitch
  generate-linkedin-guide
  check-ats-score
  build-cv
  improve-description
  search-jobs
  admin-stats
  admin-user-auth-actions
  process-daily-credits
  process-trial-reminders
  chat-notify
  manage-push
  get-exchange-rates
  generate-sitemap
)

echo "── Critical functions ────────────────────────────────"
for fn in "${CRITICAL[@]}"; do
  echo "  deploying $fn..."
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt 2>&1 | tail -1
done

echo ""
echo "── Supporting functions ──────────────────────────────"
for fn in "${SUPPORTING[@]}"; do
  echo "  deploying $fn..."
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt 2>&1 | tail -1
done

echo ""
echo "✓ All functions deployed."
echo ""
echo "Next: run ./scripts/setup-secrets.sh to set production secrets"
