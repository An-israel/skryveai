import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Plus, Copy, Check, Download, Users, TrendingUp,
  CalendarDays, Power, Link2, ShieldCheck, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  listWebinars, upsertWebinar, toggleWebinar, fetchRegistrants,
  fetchDashboardStats, fetchWaitlistPeople, downloadCsv,
  type Webinar, type DashboardStats,
} from "@/lib/events/api";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function WebinarManager() {
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState("");
  const [host, setHost] = useState("");
  const [cover, setCover] = useState("");
  const [communityLink, setCommunityLink] = useState("");
  const [communityType, setCommunityType] = useState("whatsapp");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ISO → value for <input type="datetime-local"> (local time, no seconds).
  const toLocalInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };

  const resetForm = () => {
    setTitle(""); setSlug(""); setSlugEdited(false); setDescription(""); setDatetime("");
    setHost(""); setCover(""); setCommunityLink(""); setCommunityType("whatsapp"); setEditingId(null);
  };

  const startEdit = (w: Webinar) => {
    setEditingId(w.id);
    setTitle(w.title || ""); setSlug(w.slug || ""); setSlugEdited(true);
    setDescription(w.description || ""); setDatetime(toLocalInput(w.event_datetime));
    setHost(w.host_name || ""); setCover(w.cover_image_url || "");
    setCommunityLink(w.community_link || ""); setCommunityType(w.community_type || "whatsapp");
    setCreating(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reload = async () => {
    const [w, s] = await Promise.all([listWebinars(), fetchDashboardStats()]);
    setWebinars(w); setStats(s);
  };

  useEffect(() => {
    (async () => {
      const s = await fetchDashboardStats().catch(() => null);
      if (s === null) { setDenied(true); setLoading(false); return; }
      setStats(s);
      setWebinars(await listWebinars());
      setLoading(false);
    })();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (s: string) => `${origin}/e/${s}`;

  const copyLink = async (s: string) => {
    try { await navigator.clipboard.writeText(linkFor(s)); setCopied(s); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Add a title."); return; }
    const finalSlug = slug.trim() || slugify(title);
    setSaving(true);
    const res = await upsertWebinar({
      id: editingId,
      title: title.trim(), slug: finalSlug, description, event_type: "webinar",
      event_datetime: datetime ? new Date(datetime).toISOString() : null,
      host_name: host, cover_image_url: cover, community_link: communityLink, community_type: communityType,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.reason === "slug_taken" ? "That link is already taken — pick another." : "Couldn't save.");
      return;
    }
    toast.success(editingId ? "Event updated" : "Event created", { description: linkFor(res.slug || finalSlug) });
    resetForm();
    setCreating(false);
    await reload();
  };

  const exportRegistrants = async (w: Webinar) => {
    const rows = await fetchRegistrants(w.id);
    if (!rows.length) { toast.info("No registrants yet."); return; }
    downloadCsv(`${w.slug}-registrants.csv`, rows);
  };

  const exportWaitlist = async () => {
    const rows = await fetchWaitlistPeople(5000);
    if (!rows.length) { toast.info("Waitlist is empty."); return; }
    downloadCsv("skryve-waitlist.csv", rows);
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (denied) {
    return (
      <div className="container mx-auto max-w-lg py-24 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin")}>Back to Admin</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-0 pb-16">
      <div className="mb-6 flex items-center justify-between gap-3 pt-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Events & Waitlist</h1>
            <p className="text-sm text-muted-foreground">Run webinars that fill the waitlist automatically.</p>
          </div>
        </div>
        <Button onClick={() => { if (creating) { setCreating(false); resetForm(); } else { resetForm(); setCreating(true); } }}>
          <Plus className="mr-1 h-4 w-4" />New event
        </Button>
      </div>

      {/* The big numbers */}
      {stats && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "On waitlist", value: stats.waitlist_total, icon: Users },
            { label: "This week", value: stats.last_7_days, icon: TrendingUp },
            { label: "From events", value: stats.from_events, icon: CalendarDays },
            { label: "Community clicks", value: stats.community_clicks, icon: Link2 },
          ].map((t) => (
            <Card key={t.label}><CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><t.icon className="h-3.5 w-3.5" />{t.label}</div>
              <div className="mt-1 text-2xl font-bold">{t.value.toLocaleString()}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Create form */}
      {creating && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-base">{editingId ? "Edit event" : "New event"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }}
                placeholder="How to Land London Clients as a Freelancer" />
            </div>
            <div>
              <Label>Registration link</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{origin}/e/</span>
                <Input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }} placeholder="london-clients" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Date & time</Label><Input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} /></div>
              <div><Label>Host</Label><Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Aniekan" /></div>
            </div>
            <div><Label>Cover image URL <span className="text-muted-foreground">(optional)</span></Label><Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Community group link</Label>
                <Input value={communityLink} onChange={(e) => setCommunityLink(e.target.value)} placeholder="https://chat.whatsapp.com/…" />
              </div>
              <div>
                <Label>Type</Label>
                <select value={communityType} onChange={(e) => setCommunityType(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editingId ? "Save changes" : "Create event & get link"}
              </Button>
              <Button variant="ghost" onClick={() => { setCreating(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events list */}
      <div className="mb-6 space-y-3">
        {webinars.length === 0 && !creating && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No events yet. Create one to get a registration link.</CardContent></Card>
        )}
        {webinars.map((w) => (
          <Card key={w.id} className={w.is_active ? "" : "opacity-60"}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{w.title}</p>
                  <button onClick={() => copyLink(w.slug)} className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline">
                    {copied === w.slug ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />{linkFor(w.slug)}</>}
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.registration_count} registered · {w.community_clicks ?? 0} joined group
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" title="Edit" onClick={() => startEdit(w)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" title="Export registrants" onClick={() => exportRegistrants(w)}><Download className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" title={w.is_active ? "Deactivate" : "Activate"}
                    onClick={async () => { await toggleWebinar(w.id, !w.is_active); await reload(); }}>
                    <Power className={`h-4 w-4 ${w.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdowns + export */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">The data</CardTitle>
              <Button size="sm" variant="outline" onClick={exportWaitlist}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-4 w-4" />Vetting</div>
              <div className="flex justify-between"><span>Vetted</span><span className="font-medium">{stats.by_vetting.vetted}</span></div>
              <div className="flex justify-between"><span>Pending</span><span className="font-medium">{stats.by_vetting.pending}</span></div>
              <div className="flex justify-between"><span>Rejected</span><span className="font-medium">{stats.by_vetting.rejected}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top skills</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {stats.by_skill.slice(0, 6).map((r) => (
                <div key={r.skill ?? "—"} className="flex justify-between"><span className="truncate">{r.skill ?? "—"}</span><span className="font-medium">{r.count}</span></div>
              ))}
              {stats.by_skill.length === 0 && <p className="text-muted-foreground">No data yet.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
