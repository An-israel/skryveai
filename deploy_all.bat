@echo off
REM ============================================================
REM  Skryve - one-shot deploy: link + db push + functions deploy
REM ------------------------------------------------------------
REM  Usage:   deploy_all.bat sbp_your_access_token
REM           deploy_all.bat sbp_xxx --functions-only   (skip db push)
REM  Token:   https://supabase.com/dashboard/account/tokens
REM ============================================================
setlocal

SET PROJECT_REF=uwwmwerdfpyekgshkrft
SET TOKEN=%1
SET MODE=%2

IF "%TOKEN%"=="" (
  echo ERROR: No access token.
  echo   Usage: deploy_all.bat sbp_xxxxxxxx
  pause
  exit /b 1
)

REM Pick CLI: prefer installed 'supabase', else 'npx supabase'
where supabase >nul 2>nul
IF %ERRORLEVEL%==0 (
  SET SB=supabase
) ELSE (
  SET SB=npx supabase
  echo INFO: 'supabase' not found - using 'npx supabase'.
)

SET SUPABASE_ACCESS_TOKEN=%TOKEN%

echo ============================================================
echo  Deploying Skryve to project: %PROJECT_REF%
echo ============================================================

echo.
echo [1/4] Authenticating CLI...
%SB% login --token %TOKEN% || goto :err

echo.
echo [2/4] Linking project (may prompt for DATABASE password)...
%SB% link --project-ref %PROJECT_REF% || goto :err

IF "%MODE%"=="--functions-only" (
  echo.
  echo [3/4] Skipping db push (--functions-only).
) ELSE (
  echo.
  echo [3/4] Applying database migrations...
  %SB% db push || echo WARNING: db push failed - functions can still deploy.
)

echo.
echo [4/4] Deploying ALL edge functions...
%SB% functions deploy --project-ref %PROJECT_REF% || goto :err

echo.
echo ============================================================
echo  DONE. Verify at:
echo  https://supabase.com/dashboard/project/%PROJECT_REF%/functions
echo  Then test the ATS Checker / CV Builder on your live site.
echo ============================================================
pause
exit /b 0

:err
echo.
echo ERROR: a step failed above. Read the message, fix it, and re-run.
pause
exit /b 1
