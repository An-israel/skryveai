#!/usr/bin/env bash
# Set all production secrets for Skryve Edge Functions
# Usage: ./scripts/setup-secrets.sh
#
# Fill in every value marked REPLACE_ME before running.
# Get values from:
#   RESEND_API_KEY       → resend.com → API Keys
#   PAYSTACK_SECRET_KEY  → dashboard.paystack.com → Settings → API Keys (use LIVE key)
#   HOOK_SECRET          → generate with: openssl rand -hex 32
#   ANTHROPIC_API_KEY    → console.anthropic.com → API Keys (used by all AI features)
#   GOOGLE_CLIENT_ID/SECRET → console.cloud.google.com (for Gmail OAuth)

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-dgyuafltlpruhdlgwiew}"

echo "→ Setting secrets for project: $PROJECT_REF"
echo ""

supabase secrets set \
  --project-ref "$PROJECT_REF" \
  RESEND_API_KEY="REPLACE_ME_re_xxxx" \
  PAYSTACK_SECRET_KEY="REPLACE_ME_sk_live_xxxx" \
  HOOK_SECRET="REPLACE_ME_$(openssl rand -hex 32 2>/dev/null || echo 'generate-with-openssl-rand-hex-32')" \
  ANTHROPIC_API_KEY="REPLACE_ME_sk-ant-xxxx"

# Optional — only needed if you use Gmail OAuth for outreach
# supabase secrets set \
#   --project-ref "$PROJECT_REF" \
#   GOOGLE_CLIENT_ID="REPLACE_ME" \
#   GOOGLE_CLIENT_SECRET="REPLACE_ME"

echo ""
echo "✓ Secrets set."
echo ""
echo "──────────────────────────────────────────────────────"
echo "IMPORTANT: After setting secrets, configure Supabase:"
echo ""
echo "1. Auth Email Hook:"
echo "   Dashboard → Authentication → Hooks → Send Email"
echo "   Hook URL: https://${PROJECT_REF}.supabase.co/functions/v1/auth-email-hook"
echo "   HTTP Headers:"
echo "     Authorization: Bearer <your HOOK_SECRET value>"
echo ""
echo "2. Paystack Webhook:"
echo "   dashboard.paystack.com → Settings → API → Webhooks"
echo "   Webhook URL: https://${PROJECT_REF}.supabase.co/functions/v1/paystack-webhook"
echo ""
echo "3. Resend Domain Verification:"
echo "   resend.com → Domains → Add domain: skryveai.com"
echo "   Add the SPF / DKIM DNS records Resend shows you"
echo "──────────────────────────────────────────────────────"
