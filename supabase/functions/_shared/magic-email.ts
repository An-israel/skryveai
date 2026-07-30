// Shared HTML for the passwordless "sign in to Skryve" email (magic link),
// used by both send-magic-link and event-register.
export function magicEmailHtml(
  url: string,
  opts: { eventTitle?: string; communityLink?: string; communityType?: string } = {},
) {
  const community = opts.communityLink
    ? `<p style="margin:16px 0 0"><a href="${opts.communityLink}" style="color:#2563EB">Join the ${opts.communityType === "telegram" ? "Telegram" : "WhatsApp"} group</a></p>`
    : "";
  const intro = opts.eventTitle
    ? `You're registered for <strong>${opts.eventTitle}</strong>. Tap below to sign in to your free Skryve account and get vetted for international work.`
    : `Tap the button below to sign in to Skryve. No password needed.`;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;color:#0f172a">Sign in to Skryve</h1>
    <p style="color:#334155;font-size:15px;line-height:1.5">${intro}</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#2563EB;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Sign in to Skryve</a>
    </p>
    <p style="color:#64748b;font-size:13px">Or paste this link into your browser:<br><a href="${url}" style="color:#2563EB;word-break:break-all">${url}</a></p>
    ${community}
    <p style="color:#94a3b8;font-size:12px;margin-top:28px">If you didn't request this, you can ignore this email.</p>
  </div>`;
}
