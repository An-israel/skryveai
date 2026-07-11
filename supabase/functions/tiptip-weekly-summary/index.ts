// tiptip weekly summary — emails the owner what's ready to publish, what's
// queued, and what needs their input. OWNER-ONLY. Trigger it from the Overview
// tab, or schedule it weekly via pg_cron (see MIGRATION notes).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OWNER_EMAIL = "aniekaneazy@gmail.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await service.auth.getUser(authHeader.replace("Bearer ", ""));
  if ((user?.email || "").toLowerCase() !== OWNER_EMAIL) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [{ data: content }, { data: tasks }, { data: mentions }] = await Promise.all([
    service.from("tiptip_content").select("title, status, target_keyword, published_at"),
    service.from("tiptip_tasks").select("status"),
    service.from("tiptip_brand_mentions").select("status"),
  ]);

  const c = content || [];
  const ready = c.filter((x: any) => x.status === "ready");
  const drafting = c.filter((x: any) => x.status === "drafting" || x.status === "idea");
  const publishedThisWeek = c.filter((x: any) => x.status === "published" && x.published_at && x.published_at >= weekAgo);
  const tasksDone = (tasks || []).filter((t: any) => t.status === "done").length;
  const mentionsQueued = (mentions || []).filter((m: any) => m.status !== "posted").length;

  const list = (rows: any[]) =>
    rows.length
      ? rows.map((r) => `<li style="margin:0 0 6px">${r.title}${r.target_keyword ? ` <span style="color:#888">· ${r.target_keyword}</span>` : ""}</li>`).join("")
      : `<li style="color:#888">Nothing here.</li>`;

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#1E3A5F;margin:0 0 4px">tiptip weekly summary</h2>
    <p style="color:#6b7280;margin:0 0 20px">Your Skryve growth engine — this week's state.</p>
    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:12px"><div style="font-size:12px;color:#6b7280">Ready to publish</div><div style="font-size:22px;font-weight:700">${ready.length}</div></div>
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:12px"><div style="font-size:12px;color:#6b7280">Published (7d)</div><div style="font-size:22px;font-weight:700">${publishedThisWeek.length}</div></div>
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:12px"><div style="font-size:12px;color:#6b7280">Mentions queued</div><div style="font-size:22px;font-weight:700">${mentionsQueued}</div></div>
    </div>
    <h3 style="font-size:14px;margin:0 0 8px">🚀 Ready to publish now</h3>
    <ul style="padding-left:18px;margin:0 0 20px;font-size:14px">${list(ready)}</ul>
    <h3 style="font-size:14px;margin:0 0 8px">✍️ In progress</h3>
    <ul style="padding-left:18px;margin:0 0 20px;font-size:14px">${list(drafting.slice(0, 10))}</ul>
    <p style="font-size:13px;color:#6b7280">Technical SEO checklist: ${tasksDone}/${(tasks || []).length} done.</p>
    <div style="margin-top:24px"><a href="https://skryveai.com/tiptip" style="display:inline-block;background:#2563EB;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open tiptip</a></div>
  </body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Skryve <outreach@skryveai.com>",
      to: [OWNER_EMAIL],
      subject: `tiptip weekly — ${ready.length} ready to publish`,
      html,
    }),
  });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Email failed: ${await res.text()}` }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, ready: ready.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
