#!/usr/bin/env bash
# ============================================================
#  Skryve — one-shot deploy: link + db push + functions deploy
# ------------------------------------------------------------
#  Usage:
#     ./deploy_all.sh sbp_your_access_token
#   or set the token first, then run with no argument:
#     export SUPABASE_ACCESS_TOKEN=sbp_xxx && ./deploy_all.sh
#
#  Flags:
#     --functions-only   Skip "db push" (only redeploy edge functions)
#     --skip-link        Skip "supabase link" (already linked)
#
#  Get a token at: https://supabase.com/dashboard/account/tokens
# ============================================================
set -euo pipefail

# Project ref — matches supabase/config.toml
PROJECT_REF="uwwmwerdfpyekgshkrft"

# ── Parse args ──────────────────────────────────────────────
TOKEN=""
RUN_DB_PUSH=1
RUN_LINK=1
for arg in "$@"; do
  case "$arg" in
    --functions-only) RUN_DB_PUSH=0 ;;
    --skip-link)      RUN_LINK=0 ;;
    sbp_*)            TOKEN="$arg" ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Fall back to env var if no token passed as an argument
TOKEN="${TOKEN:-${SUPABASE_ACCESS_TOKEN:-}}"

# ── Pick the CLI (installed binary, else npx) ───────────────
if command -v supabase >/dev/null 2>&1; then
  SB="supabase"
elif command -v npx >/dev/null 2>&1; then
  SB="npx supabase"
  echo "ℹ  'supabase' not found on PATH — using 'npx supabase' instead."
else
  echo "ERROR: Supabase CLI not found. Install it first:"
  echo "  Windows: irm get.scoop.sh | iex   then   scoop install supabase"
  echo "  Mac:     brew install supabase/tap/supabase"
  exit 1
fi

# ── Token check ─────────────────────────────────────────────
if [ -z "$TOKEN" ]; then
  echo "ERROR: No access token."
  echo "  Pass it:   ./deploy_all.sh sbp_xxxxxxxx"
  echo "  Or set it: export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx"
  exit 1
fi
export SUPABASE_ACCESS_TOKEN="$TOKEN"

echo "============================================================"
echo " Deploying Skryve to project: $PROJECT_REF"
echo "============================================================"

# ── 1. Login ────────────────────────────────────────────────
echo
echo "→ [1/4] Authenticating CLI..."
$SB login --token "$TOKEN"

# ── 2. Link ─────────────────────────────────────────────────
if [ "$RUN_LINK" -eq 1 ]; then
  echo
  echo "→ [2/4] Linking project (you may be asked for your DATABASE password)..."
  $SB link --project-ref "$PROJECT_REF"
else
  echo
  echo "→ [2/4] Skipping link (--skip-link)."
fi

# ── 3. DB migrations ────────────────────────────────────────
if [ "$RUN_DB_PUSH" -eq 1 ]; then
  echo
  echo "→ [3/4] Applying database migrations (supabase db push)..."
  if ! $SB db push; then
    echo "⚠  db push failed. Functions can still deploy without it."
    echo "   Re-run later with migrations only, or apply them in the dashboard."
  fi
else
  echo
  echo "→ [3/4] Skipping db push (--functions-only)."
fi

# ── 4. Deploy all edge functions ────────────────────────────
echo
echo "→ [4/4] Deploying ALL edge functions (verify_jwt comes from config.toml)..."
$SB functions deploy --project-ref "$PROJECT_REF"

# ── Secret sanity check ─────────────────────────────────────
echo
echo "→ Checking required secrets..."
SECRETS="$($SB secrets list 2>/dev/null || true)"
MISSING=""
for key in ANTHROPIC_API_KEY RESEND_API_KEY Paystack_API SITE_URL; do
  if ! echo "$SECRETS" | grep -q "$key"; then
    MISSING="$MISSING $key"
  fi
done
if [ -n "$MISSING" ]; then
  echo "⚠  Possibly missing secrets:$MISSING"
  echo "   Set with:  $SB secrets set KEY=value   then re-run with --functions-only"
else
  echo "✓  All expected secrets are present."
fi

echo
echo "============================================================"
echo " ✅ Done."
echo " Verify: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo " Then test the ATS Checker / CV Builder on your live site."
echo "============================================================"
