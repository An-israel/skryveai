// Content Library — the finished/in-progress pieces. Generate with AI, edit,
// and one-click publish to the live blog.
import { useMemo, useState } from "react";
import { Sparkles, Rocket, Plus, Trash2, ExternalLink, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { TiptipData } from "@/pages/Tiptip";
import {
  type TiptipContent, type ContentStatus,
  updateContent, createContent, deleteContent, generate, publishContent,
} from "@/lib/tiptip/api";
import { StatusPill, CONTENT_STATUSES, STATUS_LABEL } from "./shared";

const KINDS = ["comparison", "entity", "pillar", "listicle", "faq", "category", "feature", "data", "research", "freshness", "article"];

export function ContentTab({ data, loading, reload }: { data: TiptipData; loading: boolean; reload: () => Promise<void> }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<ContentStatus | "all">("all");
  const [editing, setEditing] = useState<TiptipContent | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(
    () => (filter === "all" ? data.content : data.content.filter((c) => c.status === filter)),
    [data.content, filter],
  );

  async function newPiece() {
    const { data: created } = await createContent({ title: "Untitled piece", kind: "article", status: "idea" });
    await reload();
    if (created) setEditing(created);
  }

  async function save() {
    if (!editing) return;
    setBusy("save");
    const { error } = await updateContent(editing.id, {
      title: editing.title, kind: editing.kind, target_keyword: editing.target_keyword,
      meta_title: editing.meta_title, meta_description: editing.meta_description,
      slug: editing.slug, excerpt: editing.excerpt, body: editing.body, status: editing.status,
    });
    setBusy(null);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    await reload();
  }

  async function runGenerate(mode: "article" | "mentions") {
    if (!editing) return;
    setBusy(mode);
    try {
      await generate(editing.id, mode);
      await reload();
      if (mode === "article") {
        const fresh = (await refetchOne(editing.id, data));
        if (fresh) setEditing(fresh);
        toast({ title: "Draft ready", description: "AI wrote the article. Review and publish." });
      } else {
        toast({ title: "Mentions drafted", description: "Check the Brand Mentions tab." });
      }
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!editing) return;
    if (!editing.body) return toast({ title: "Generate the article first", variant: "destructive" });
    setBusy("publish");
    try {
      const res = await publishContent(editing.id);
      await reload();
      setEditing(null);
      toast({ title: "Published to blog", description: `/blog/${res.slug}` });
    } catch (e) {
      toast({ title: "Publish failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this piece?")) return;
    await deleteContent(id);
    setEditing(null);
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...CONTENT_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={newPiece}><Plus className="w-4 h-4 mr-1" /> New piece</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
          {rows.map((c) => (
            <button key={c.id} onClick={() => setEditing(c)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{c.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  <span className="uppercase">{c.kind}</span>
                  {c.target_keyword ? ` · ${c.target_keyword}` : ""}
                  {c.calendar_month ? ` · M${c.calendar_month} W${c.calendar_week}` : ""}
                </p>
              </div>
              {c.blog_post_id && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <StatusPill status={c.status} />
            </button>
          ))}
          {rows.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">No pieces here.</p>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader><DialogTitle className="text-base">Edit piece</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Target keyword / question</Label>
                    <Input value={editing.target_keyword || ""} onChange={(e) => setEditing({ ...editing, target_keyword: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as ContentStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CONTENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-muted-foreground">
                    Let AI research and write this piece — answer-first, structured, FAQ + schema.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runGenerate("mentions")}>
                      {busy === "mentions" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-1" />Mentions</>}
                    </Button>
                    <Button size="sm" disabled={!!busy} onClick={() => runGenerate("article")}>
                      {busy === "article" ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Writing…</> : <><Sparkles className="w-4 h-4 mr-1" />Generate</>}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Meta title</Label>
                    <Input value={editing.meta_title || ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slug</Label>
                    <Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meta description</Label>
                  <Input value={editing.meta_description || ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Body (markdown)</Label>
                  <Textarea className="min-h-[220px] font-mono text-[12px]" value={editing.body || ""}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    placeholder="Generate with AI, or write/paste the article here." />
                </div>
                {editing.faq?.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">{editing.faq.length} FAQ items · {editing.internal_links?.length || 0} internal links generated</p>
                )}
              </div>

              <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(editing.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!!busy} onClick={save}>
                    {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button size="sm" disabled={!!busy || !editing.body} onClick={publish}>
                    {busy === "publish" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Rocket className="w-4 h-4 mr-1" />}
                    {editing.status === "published" ? "Re-publish" : "Publish"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// After a reload the parent data prop is stale within this closure, so re-fetch
// the single row from the freshly-loaded list on the next tick.
async function refetchOne(id: string, _data: TiptipData): Promise<TiptipContent | null> {
  const { fetchContent } = await import("@/lib/tiptip/api");
  const all = await fetchContent();
  return all.find((c) => c.id === id) || null;
}
