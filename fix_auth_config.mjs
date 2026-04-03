// Fixes:
// 1. Site URL → https://skryveai.vercel.app (stops redirect to localhost)
// 2. SMTP via Resend → emails come from "SkryveAI" not "Supabase Auth"
// 3. Email template subject lines updated

const PAT = "sbp_c3a489e75d8b43b66e242be618c41de67f715dd9"
const PROJECT_REF = "uwwmwerdfpyekgshkrft"
const RESEND_API_KEY = "re_acv8KJJk_HKoJkWGHzadRvGybqnrPgtyQ"

const BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`
const HEADERS = {
  Authorization: `Bearer ${PAT}`,
  "Content-Type": "application/json",
}

// ── 1. Fix Site URL + SMTP ──────────────────────────────────────────────────
console.log("Fixing Site URL and SMTP settings...")
const authRes = await fetch(`${BASE}/config/auth`, {
  method: "PATCH",
  headers: HEADERS,
  body: JSON.stringify({
    site_url: "https://skryveai.vercel.app",
    uri_allow_list: "https://skryveai.vercel.app,http://localhost:5173,http://localhost:4173",
    smtp_admin_email: "noreply@skryveai.vercel.app",
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: RESEND_API_KEY,
    smtp_sender_name: "SkryveAI",
    smtp_max_frequency: 60,
  }),
})
const authData = await authRes.json()
if (authRes.ok) {
  console.log("✅ Site URL + SMTP configured!")
  console.log("  site_url:", authData.site_url)
  console.log("  smtp_sender_name:", authData.smtp_sender_name)
  console.log("  smtp_host:", authData.smtp_host)
} else {
  console.error("❌ Auth config failed:", JSON.stringify(authData, null, 2))
}

// ── 2. Update email templates ───────────────────────────────────────────────
console.log("\nUpdating email templates...")

const confirmTemplate = `<h2>Confirm your SkryveAI account</h2>
<p>Hi there,</p>
<p>Thanks for signing up for SkryveAI! Click the button below to confirm your email address and get started.</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#882DFF;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Confirm my account</a></p>
<p>If you didn't sign up for SkryveAI, you can safely ignore this email.</p>
<br/>
<p>The SkryveAI Team</p>`

const resetTemplate = `<h2>Reset your SkryveAI password</h2>
<p>Hi there,</p>
<p>We received a request to reset your password. Click the button below to choose a new one.</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#882DFF;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Reset my password</a></p>
<p>This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email.</p>
<br/>
<p>The SkryveAI Team</p>`

const templateUpdates = [
  {
    template: "confirmation",
    subject: "Confirm your SkryveAI account",
    body: confirmTemplate,
  },
  {
    template: "recovery",
    subject: "Reset your SkryveAI password",
    body: resetTemplate,
  },
]

for (const t of templateUpdates) {
  const res = await fetch(`${BASE}/config/auth`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({
      [`mailer_subjects_${t.template}`]: t.subject,
      [`mailer_templates_${t.template}_content`]: t.body,
    }),
  })
  const data = await res.json()
  if (res.ok) {
    console.log(`✅ ${t.template} email template updated`)
  } else {
    console.log(`⚠️  ${t.template} template:`, JSON.stringify(data).slice(0, 120))
  }
}

console.log("\n✅ All auth config fixes applied!")
