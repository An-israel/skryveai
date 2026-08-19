-- gmail_tokens.access_token/refresh_token and smtp_credentials.app_password
-- are plaintext secrets. Both tables let the owning user SELECT the raw row
-- directly through PostgREST, so any client-side compromise (XSS, a leaked
-- session, a malicious browser extension) could exfiltrate live OAuth
-- tokens / mailbox app-passwords, not just app state. Neither table is
-- currently read by any frontend code or edge function (verified via
-- repo-wide search) — but the exposure exists the moment any future
-- integration writes a row, so it's fixed at the RLS layer now rather than
-- left for whoever builds that integration to notice.
--
-- Replace direct table SELECT with a status-only view exposing just enough
-- for a "connected as X" UI, never the secret itself.

-- (smtp_credentials' equivalent "Admins can view all smtp credentials" raw-row
-- policy was already dropped in 20260428152458; gmail_tokens' was not.)
DROP POLICY IF EXISTS "Users can view their own gmail tokens" ON public.gmail_tokens;
DROP POLICY IF EXISTS "Admins can view all gmail tokens" ON public.gmail_tokens;
CREATE OR REPLACE VIEW public.gmail_connection_status AS
  SELECT id, user_id, gmail_email, token_expiry, created_at, updated_at
  FROM public.gmail_tokens
  WHERE user_id = auth.uid();
GRANT SELECT ON public.gmail_connection_status TO authenticated;

DROP POLICY IF EXISTS "Users can view their own SMTP credentials" ON public.smtp_credentials;
CREATE OR REPLACE VIEW public.smtp_connection_status AS
  SELECT id, user_id, email_address, smtp_host, smtp_port, imap_host, imap_port,
         provider_type, is_verified, last_verified_at, created_at, updated_at
  FROM public.smtp_credentials
  WHERE user_id = auth.uid();
GRANT SELECT ON public.smtp_connection_status TO authenticated;
