import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/use-entitlements";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Bold, Italic, Heading2, Heading3, Link2, Image as ImageIcon, List,
  ListOrdered, Quote, Code, Eye, PenSquare, Plus, Trash2, Globe, FileText,
  Loader2, X, ExternalLink,
} from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  updated_at: string;
}

const CATEGORIES = ["general", "career", "freelancing", "remote-work", "tech", "guides", "africa"];

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}
function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function BlogStudio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: entLoading } = useEntitlements();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  // editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishedState, setPublishedState] = useState(false);

  // link dialog
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkMode, setLinkMode] = useState<"link" | "image">("link");

  const taRef = useRef<HTMLTextAreaElement>(null);

  const loadPosts = useCallback(async (uid: string) => {
    const { data } = await (supabase as any)
      .from("blog_posts").select("*").eq("created_by", uid).order("updated_at", { ascending: false });
    setPosts(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) { setUserId(data.user.id); await loadPosts(data.user.id); }
      setLoading(false);
    });
  }, [loadPosts]);

  const resetEditor = () => {
    setEditingId(null); setTitle(""); setCover(""); setContent(""); setExcerpt("");
    setCategory("general"); setTags([]); setTagInput(""); setPreview(false); setPublishedState(false);
  };

  const loadIntoEditor = (p: Post) => {
    setEditingId(p.id); setTitle(p.title); setCover(p.cover_image || ""); setContent(p.content);
    setExcerpt(p.excerpt || ""); setCategory(p.category); setTags(p.tags || []);
    setPublishedState(p.published); setPreview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Insert markdown around the current selection.
  const wrap = (before: string, after = before, placeholder = "") => {
    const ta = taRef.current;
    if (!ta) { setContent((c) => c + before + placeholder + after); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + sel + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + sel.length;
    });
  };
  const linePrefix = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) { setContent((c) => c + "\n" + prefix); return; }
    const start = ta.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    setContent(content.slice(0, lineStart) + prefix + content.slice(lineStart));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + prefix.length; });
  };

  const openLinkDialog = (mode: "link" | "image") => {
    const ta = taRef.current;
    setLinkMode(mode);
    setLinkText(ta ? content.slice(ta.selectionStart, ta.selectionEnd) : "");
    setLinkUrl("");
    setLinkOpen(true);
  };
  const insertLink = () => {
    if (!linkUrl.trim()) { setLinkOpen(false); return; }
    const md = linkMode === "image"
      ? `![${linkText || "image"}](${linkUrl.trim()})`
      : `[${linkText || linkUrl.trim()}](${linkUrl.trim()})`;
    const ta = taRef.current;
    if (ta) {
      const start = ta.selectionStart, end = ta.selectionEnd;
      setContent(content.slice(0, start) + md + content.slice(end));
    } else setContent((c) => c + md);
    setLinkOpen(false);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const save = async (publish: boolean) => {
    if (!userId) return;
    if (!title.trim()) { toast({ title: "Add a title", variant: "destructive" }); return; }
    if (!content.trim()) { toast({ title: "Write some content", variant: "destructive" }); return; }
    setSaving(true);

    const payload: any = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || content.replace(/[#*>[\]()!`_-]/g, "").slice(0, 160).trim(),
      cover_image: cover.trim() || null,
      category,
      tags,
      read_time: Math.max(1, Math.round(wordCount(content) / 200)),
      published: publish,
      updated_at: new Date().toISOString(),
    };
    if (publish) payload.published_at = new Date().toISOString();

    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("blog_posts").update(payload).eq("id", editingId));
    } else {
      payload.slug = `${slugify(title) || "post"}-${Math.random().toString(36).slice(2, 7)}`;
      payload.created_by = userId;
      ({ error } = await (supabase as any).from("blog_posts").insert(payload));
    }
    setSaving(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: publish ? "Published 🎉" : "Draft saved", description: publish ? "Your post is live on the blog." : "Saved to your drafts." });
    setPublishedState(publish);
    await loadPosts(userId);
    if (!editingId) resetEditor();
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    await (supabase as any).from("blog_posts").delete().eq("id", p.id);
    if (editingId === p.id) resetEditor();
    if (userId) await loadPosts(userId);
  };

  if (loading || entLoading) return <div className="max-w-6xl mx-auto"><Skeleton className="h-96 rounded-xl" /></div>;

  // Studio is an admin-only authoring tool.
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <PenSquare className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold">Studio is for admins</h1>
          <p className="text-sm text-muted-foreground mt-1">The blog authoring tool is restricted to the Skryve team.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/blog")}>Read the blog</Button>
      </div>
    );
  }

  const tools = [
    { icon: Bold, label: "Bold", run: () => wrap("**", "**", "bold text") },
    { icon: Italic, label: "Italic", run: () => wrap("*", "*", "italic text") },
    { icon: Heading2, label: "Heading", run: () => linePrefix("## ") },
    { icon: Heading3, label: "Subheading", run: () => linePrefix("### ") },
    { icon: Link2, label: "Insert link", run: () => openLinkDialog("link") },
    { icon: ImageIcon, label: "Insert image", run: () => openLinkDialog("image") },
    { icon: List, label: "Bullet list", run: () => linePrefix("- ") },
    { icon: ListOrdered, label: "Numbered list", run: () => linePrefix("1. ") },
    { icon: Quote, label: "Quote", run: () => linePrefix("> ") },
    { icon: Code, label: "Code", run: () => wrap("`", "`", "code") },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <PenSquare className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">Studio</h1>
          <p className="text-sm text-muted-foreground">Write and publish blog posts — attach links, images and format as you go.</p>
        </div>
        {editingId && <Button variant="outline" size="sm" onClick={resetEditor}><Plus className="w-4 h-4 mr-1.5" /> New post</Button>}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Input
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold h-12"
          />

          <Input placeholder="Cover image URL (optional)" value={cover} onChange={(e) => setCover(e.target.value)} />

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 flex-wrap border rounded-lg p-1 bg-muted/30">
            {tools.map((t) => (
              <Button key={t.label} type="button" variant="ghost" size="icon" className="h-8 w-8" title={t.label} onClick={t.run}>
                <t.icon className="w-4 h-4" />
              </Button>
            ))}
            <div className="w-px h-6 bg-border mx-1" />
            <Button type="button" variant={preview ? "default" : "ghost"} size="sm" className="h-8" onClick={() => setPreview((p) => !p)}>
              <Eye className="w-4 h-4 mr-1.5" /> Preview
            </Button>
          </div>

          {preview ? (
            <div className="border rounded-lg p-5 min-h-[420px] bg-card">
              {content.trim()
                ? <MarkdownRenderer content={content} />
                : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
            </div>
          ) : (
            <Textarea
              ref={taRef}
              placeholder="Write your story… Markdown supported. Use the toolbar to add links, images and formatting."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[420px] font-mono text-sm leading-relaxed"
            />
          )}
          <p className="text-xs text-muted-foreground">{wordCount(content)} words · ~{Math.max(1, Math.round(wordCount(content) / 200))} min read</p>
        </div>

        {/* Sidebar: meta + actions + my posts */}
        <div className="space-y-4">
          <div className="border rounded-xl p-4 space-y-4 bg-card">
            <div>
              <Label className="text-sm">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("-", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Tags</Label>
              <div className="flex gap-2 mt-1.5">
                <Input placeholder="Add tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
                <Button type="button" variant="outline" size="icon" onClick={addTag}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">{t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">Excerpt (optional)</Label>
              <Textarea placeholder="Short summary for the blog card…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="mt-1.5 h-20 text-sm" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => save(false)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-1.5" /> Save draft</>}
              </Button>
              <Button className="flex-1" onClick={() => save(true)} disabled={saving}>
                <Globe className="w-4 h-4 mr-1.5" /> {publishedState ? "Update" : "Publish"}
              </Button>
            </div>
          </div>

          {/* My posts */}
          <div className="border rounded-xl p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3">Your posts</h3>
            {posts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No posts yet. Write your first one!</p>
            ) : (
              <div className="space-y-2">
                {posts.map((p) => (
                  <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${editingId === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                    <button className="flex-1 min-w-0 text-left" onClick={() => loadIntoEditor(p)}>
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground">{p.published ? "Published" : "Draft"} · {p.category}</p>
                    </button>
                    {p.published && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary" title="View live">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => remove(p)} className="text-muted-foreground hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link / image dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{linkMode === "image" ? "Insert image" : "Insert link"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{linkMode === "image" ? "Alt text" : "Link text"}</Label>
              <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder={linkMode === "image" ? "Describe the image" : "Text to show"} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm">URL</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="mt-1.5"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertLink(); } }} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={insertLink}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
