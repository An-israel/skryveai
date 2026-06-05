/**
 * auth-email-hook
 *
 * Supabase "Send Email" auth hook. Receives Supabase auth events,
 * renders branded React Email templates, and delivers via Resend.
 *
 * Configure in Supabase Dashboard:
 *   Authentication → Hooks → Send Email → Hook URL:
 *   https://<project>.supabase.co/functions/v1/auth-email-hook
 *
 * Required secrets (set via: supabase secrets set KEY=value):
 *   RESEND_API_KEY       — from resend.com
 *   HOOK_SECRET          — any random string, set the same value in
 *                          Supabase Dashboard under the hook's "HTTP Headers"
 *                          as: Authorization: Bearer <HOOK_SECRET>
 */

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail }         from '../_shared/email-templates/signup.tsx'
import { InviteEmail }         from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail }      from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail }       from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail }    from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const SITE_NAME   = 'Skryve'
const SITE_URL    = 'https://skryveai.com'
const FROM        = 'Skryve <noreply@skryveai.com>'
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUBJECTS: Record<string, string> = {
  signup:           'Confirm your Skryve account',
  invite:           "You've been invited to Skryve",
  magiclink:        'Your Skryve login link',
  recovery:         'Reset your Skryve password',
  email_change:     'Confirm your new email address',
  reauthentication: 'Your Skryve verification code',
}

// Build the confirmation URL from the token_hash Supabase provides
function buildConfirmUrl(
  supabaseUrl: string,
  tokenHash: string,
  type: string,
  redirectTo: string,
): string {
  const base = `${supabaseUrl}/auth/v1/verify`
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
    redirect_to: redirectTo || SITE_URL,
  })
  return `${base}?${params}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  // ── Auth: verify shared secret set in the Supabase hook "HTTP Headers" ──
  const hookSecret   = Deno.env.get('HOOK_SECRET')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? ''

  if (!hookSecret) {
    console.error('HOOK_SECRET not configured')
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token      = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (token !== hookSecret) {
    console.error('Invalid hook secret')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Parse Supabase "Send Email" hook payload ──
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const user       = body.user       ?? {}
  const emailData  = body.email_data ?? {}
  const actionType: string = emailData.email_action_type ?? ''
  const toEmail:    string = user.email ?? emailData.email ?? ''

  if (!toEmail || !actionType) {
    return new Response(JSON.stringify({ error: 'Missing email or action_type' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Build the confirmation URL
  const confirmationUrl = buildConfirmUrl(
    supabaseUrl,
    emailData.token_hash ?? emailData.token ?? '',
    actionType,
    emailData.redirect_to ?? SITE_URL,
  )

  // Template props
  const props = {
    siteName:        SITE_NAME,
    siteUrl:         SITE_URL,
    recipient:       toEmail,
    confirmationUrl,
    token:           emailData.token ?? '',
    email:           toEmail,
    newEmail:        emailData.new_email ?? '',
  }

  // Template map
  const TEMPLATES: Record<string, React.ComponentType<any>> = {
    signup:           SignupEmail,
    invite:           InviteEmail,
    magiclink:        MagicLinkEmail,
    recovery:         RecoveryEmail,
    email_change:     EmailChangeEmail,
    reauthentication: ReauthenticationEmail,
  }

  const Template = TEMPLATES[actionType]
  if (!Template) {
    console.warn('Unknown email action type:', actionType)
    // Return 200 so Supabase doesn't retry — just skip unknown types
    return new Response(JSON.stringify({ success: true, skipped: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Render HTML
  let html: string
  try {
    html = await renderAsync(React.createElement(Template, props))
  } catch (err) {
    console.error('Template render error:', err)
    return new Response(JSON.stringify({ error: 'Failed to render email template' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Send via Resend
  const resendRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    FROM,
      to:      [toEmail],
      subject: SUBJECTS[actionType] ?? 'Notification from Skryve',
      html,
    }),
  })

  const resendData = await resendRes.json()

  if (!resendRes.ok) {
    console.error('Resend error:', resendData)
    return new Response(JSON.stringify({ error: 'Failed to send email', detail: resendData }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  console.log(`Auth email sent: ${actionType} → ${toEmail} (id=${resendData.id})`)

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
