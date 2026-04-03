@echo off
REM ============================================================
REM SkryveAI - Deploy All Edge Functions
REM Usage: deploy_functions.bat YOUR_SUPABASE_ACCESS_TOKEN
REM ============================================================

SET TOKEN=%1
IF "%TOKEN%"=="" (
  echo ERROR: Please provide your Supabase access token
  echo Usage: deploy_functions.bat sbp_xxxxxxxxxx
  pause
  exit /b 1
)

SET PROJECT_REF=cxzjdpxpgjupvbwwetne

echo Deploying all SkryveAI edge functions...
echo.

SET SUPABASE_ACCESS_TOKEN=%TOKEN%

supabase.exe login --token %TOKEN%

for %%F in (
  check-ats-score
  build-cv
  paystack-webhook
  email-webhook
  process-followups
  send-team-invite
  generate-linkedin-guide
  search-businesses
  analyze-website
  initialize-payment
  verify-payment
  generate-pitch
  process-email-queue
  send-email
  smtp-auth
) do (
  echo Deploying %%F...
  supabase.exe functions deploy %%F --project-ref %PROJECT_REF%
  if errorlevel 1 (
    echo FAILED: %%F
  ) else (
    echo OK: %%F
  )
  echo.
)

echo.
echo Done! All functions deployed.
pause
