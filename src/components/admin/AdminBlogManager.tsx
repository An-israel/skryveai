import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Eye, Star, ExternalLink } from "lucide-react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[] | null;
  keywords: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  author: string;
  read_time: number;
  published: boolean;
  published_at: string | null;
  featured: boolean;
  view_count: number;
}

const EMPTY: Partial<BlogPost> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "",
  category: "Cold Email",
  tags: [],
  keywords: [],
  meta_title: "",
  meta_description: "",
  author: "SkryveAI Team",
  read_time: 5,
  published: false,
  featured: false,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 100);

export function AdminBlogManager() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BlogPost>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts((data ?? []) as BlogPost[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const openEdit = (p: BlogPost) => { setEditing(p); setOpen(true); };

  const save = async () => {
    if (!editing.title || !editing.slug || !editing.content) {
      toast({ title: "Missing fields", description: "Title, slug, and content are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      slug: editing.slug,
      title: editing.title,
      excerpt: editing.excerpt || null,
      content: editing.content,
      cover_image: editing.cover_image || null,
      category: editing.category || "Cold Email",
      tags: typeof editing.tags === "string" ? (editing.tags as unknown as string).split(",").map((s) => s.trim()).filter(Boolean) : editing.tags ?? [],
      keywords: typeof editing.keywords === "string" ? (editing.keywords as unknown as string).split(",").map((s) => s.trim()).filter(Boolean) : editing.keywords ?? [],
      meta_title: editing.meta_title || null,
      meta_description: editing.meta_description || null,
      author: editing.author || "SkryveAI Team",
      read_time: Number(editing.read_time) || 5,
      published: !!editing.published,
      featured: !!editing.featured,
      published_at: editing.published && !editing.published_at ? new Date().toISOString() : editing.published_at ?? null,
    };

    const { error } = editing.id
      ? await supabase.from("blog_posts").update(payload as never).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload as never);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Post updated" : "Post created" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Post deleted" });
    load();
  };

  const togglePublished = async (p: BlogPost) => {
    const next = !p.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({ published: next, published_at: next && !p.published_at ? new Date().toISOString() : p.published_at })
      .eq("id", p.id);
    if (!error) load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Blog Manager</CardTitle>
          <CardDescription>Create and publish SEO-rich blog posts. Posts are written in Markdown.</CardDescription>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Post</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">No blog posts yet. Click "New Post" to create one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-md">
                    <div className="flex items-center gap-2">
                      {p.featured && <Star className="w-3 h-3 fill-primary text-primary" />}
                      <span className="truncate">{p.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={p.published ? "default" : "outline"} className="cursor-pointer" onClick={() => togglePublished(p)}>
                      {p.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground"><Eye className="w-3 h-3 inline mr-1" />{p.view_count}</TableCell>
                  <TableCell className="text-right">
                    {p.published && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Post" : "New Post"}</DialogTitle>
              <DialogDescription>SEO fields fall back to title/excerpt if left blank.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Excerpt (1-2 sentences)</Label>
                <Textarea rows={2} value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
              </div>
              <div>
                <Label>Cover image URL</Label>
                <Input value={editing.cover_image || ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
                <div>
                  <Label>Read time (min)</Label>
                  <Input type="number" value={editing.read_time || 5} onChange={(e) => setEditing({ ...editing, read_time: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input value={Array.isArray(editing.tags) ? editing.tags.join(", ") : (editing.tags as unknown as string) || ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value as unknown as string[] })} />
                </div>
                <div>
                  <Label>SEO keywords (comma-separated)</Label>
                  <Input value={Array.isArray(editing.keywords) ? editing.keywords.join(", ") : (editing.keywords as unknown as string) || ""} onChange={(e) => setEditing({ ...editing, keywords: e.target.value as unknown as string[] })} />
                </div>
              </div>
              <div>
                <Label>Meta title (overrides title in &lt;title&gt;)</Label>
                <Input value={editing.meta_title || ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} maxLength={60} />
              </div>
              <div>
                <Label>Meta description</Label>
                <Textarea rows={2} value={editing.meta_description || ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} maxLength={160} />
              </div>
              <div>
                <Label>Content (Markdown) *</Label>
                <Textarea rows={20} className="font-mono text-sm" value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                  <Label>Published</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} />
                  <Label>Featured</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
