@echo off
REM ============================================================
REM Skryve - Deploy ALL edge functions + apply DB migrations
REM Usage: deploy_functions.bat YOUR_SUPABASE_ACCESS_TOKEN
REM ============================================================

SET TOKEN=%1
IF "%TOKEN%"=="" (
  echo ERROR: Please provide your Supabase access token
  echo Usage: deploy_functions.bat sbp_xxxxxxxxxx
  pause
  exit /b 1
)

REM Live project ref (matches supabase/config.toml)
SET PROJECT_REF=uwwmwerdfpyekgshkrft

SET SUPABASE_ACCESS_TOKEN=%TOKEN%

supabase.exe login --token %TOKEN%
supabase.exe link --project-ref %PROJECT_REF%

echo.
echo Applying database migrations...
supabase.exe db push
if errorlevel 1 (
  echo WARNING: db push failed - apply migrations manually if needed.
)

echo.
echo Deploying ALL edge functions (reads supabase/config.toml for verify_jwt)...
supabase.exe functions deploy --project-ref %PROJECT_REF%
if errorlevel 1 (
  echo FAILED: functions deploy
) else (
  echo OK: all functions deployed
)

echo.
echo Done! If auth/notification emails still don't arrive, confirm:
echo   - secret RESEND_API_KEY is set (supabase secrets set RESEND_API_KEY=...)
echo   - skryveai.com is a verified sender domain in Resend (SPF/DKIM)
pause
