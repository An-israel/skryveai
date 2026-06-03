import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Star, Plus, ExternalLink, ImageIcon } from "lucide-react";

const ALL_SKILLS = [
  "Web Development", "UI/UX Design", "Copywriting", "Video Editing", "Graphic Design",
  "Social Media Management", "Data Analysis", "Mobile App Development", "SEO", "Virtual Assistant",
  "Content Writing", "Translation", "Photography", "Animation", "3D Modeling",
  "WordPress", "E-commerce", "Email Marketing", "Brand Identity", "Logo Design",
  "JavaScript", "Python", "React", "Node.js", "Flutter",
  "iOS Development", "Android Development", "DevOps", "Cloud Computing", "Cybersecurity",
  "Blockchain", "AI/ML", "Data Science", "Business Analysis", "Project Management",
  "Product Management", "Agile/Scrum", "Technical Writing", "Research", "Legal Writing",
  "Accounting", "Bookkeeping", "Financial Modeling", "HR & Recruitment", "Sales",
  "Customer Support", "Community Management", "Podcast Editing", "Music Production", "Voice Over",
  "Illustration", "Infographics", "Presentation Design", "Print Design", "Packaging Design",
];

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  skill_category: string | null;
  is_featured: boolean;
  created_at: string;
}

interface ItemForm {
  title: string;
  description: string;
  skillCategory: string;
  imageMode: "upload" | "url";
  imageUrl: string;
  projectUrl: string;
}

const EMPTY_FORM: ItemForm = {
  title: "",
  description: "",
  skillCategory: "",
  imageMode: "url",
  imageUrl: "",
  projectUrl: "",
};

export default function PortfolioManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUser(session.user);

      const [{ data: tp }, { data: profile }] = await Promise.all([
        (supabase as any).from("talent_profiles").select("id").eq("user_id", session.user.id).maybeSingle(),
        (supabase as any).from("profiles").select("username").eq("id", session.user.id).maybeSingle(),
      ]);

      if (tp) {
        setTalentId(tp.id);
        setUsername(profile?.username || session.user.id);
        await loadItems(tp.id);
      }
      setLoading(false);
    });
  }, []);

  async function loadItems(tid: string) {
    const { data } = await (supabase as any)
      .from("portfolio_items")
      .select("*")
      .eq("talent_id", tid)
      .order("is_featured", { ascending: false });
    setItems(data || []);
  }

  function openAddSheet() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEditSheet(item: PortfolioItem) {
    setEditingId(item.id);
    setForm({
      title:         item.title,
      description:   item.description || "",
      skillCategory: item.skill_category || "",
      imageMode:     "url",
      imageUrl:      item.image_url || "",
      projectUrl:    item.project_url || "",
    });
    setSheetOpen(true);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingImage(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("portfolio").getPublicUrl(path);
    setForm(p => ({ ...p, imageUrl: publicUrl }));
    setUploadingImage(false);
  }

  async function saveItem() {
    if (!talentId || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      talent_id:      talentId,
      title:          form.title.trim(),
      description:    form.description || null,
      image_url:      form.imageUrl || null,
      project_url:    form.projectUrl || null,
      skill_category: form.skillCategory || null,
    };
    let error: any;
    if (editingId) {
      ({ error } = await (supabase as any).from("portfolio_items").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("portfolio_items").insert({ ...payload, is_featured: false }));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Item updated" : "Item added" });
      setSheetOpen(false);
      await loadItems(talentId);
    }
  }

  async function deleteItem(id: string) {
    await (supabase as any).from("portfolio_items").delete().eq("id", id);
    toast({ title: "Item deleted" });
    setDeleteId(null);
    if (talentId) await loadItems(talentId);
  }

  async function toggleFeatured(item: PortfolioItem) {
    await (supabase as any).from("portfolio_items").update({ is_featured: !item.is_featured }).eq("id", item.id);
    if (talentId) await loadItems(talentId);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!talentId) {
    return (
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="text-center py-20 px-6">
          <p className="text-[13px] text-muted-foreground mb-4">You need to set up your talent profile first.</p>
          <a
            href="/profile"
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Set up profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Showcase your best work to attract clients.</p>
        </div>
        <div className="flex gap-2">
          {username && (
            <button
              className="px-4 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors"
              onClick={() => window.open(`/profile/${username}`, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Live
            </button>
          )}
          <button
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 flex items-center gap-2 transition-colors"
            onClick={openAddSheet}
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-4">No portfolio items yet. Add your first project!</p>
            <button
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 flex items-center gap-2 transition-colors"
              onClick={openAddSheet}
            >
              <Plus className="w-4 h-4" /> Add Portfolio Item
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="border border-border rounded-xl bg-card overflow-hidden hover:border-primary/30 transition-colors">
              {/* Image */}
              <div className="relative aspect-video bg-muted flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
                {item.is_featured && (
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-amber-500/90 text-amber-950 rounded-md font-semibold flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" /> Featured
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">{item.title}</p>
                  {item.skill_category && (
                    <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md mt-1 inline-block">
                      {item.skill_category}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
                    onClick={() => toggleFeatured(item)}
                    title={item.is_featured ? "Unfeature" : "Feature"}
                  >
                    <Star className={`w-3.5 h-3.5 ${item.is_featured ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                  </button>
                  <button
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => openEditSheet(item)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Portfolio Item" : "Add Portfolio Item"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Project Title *
              </label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="My awesome project" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Description ({form.description.length}/300)
              </label>
              <Textarea
                value={form.description}
                maxLength={300}
                rows={3}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe what you built and your role..."
                className="text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Skill Category</label>
              <Select value={form.skillCategory} onValueChange={v => setForm(p => ({ ...p, skillCategory: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Project Image</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${form.imageMode === "url" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setForm(p => ({ ...p, imageMode: "url" }))}
                >
                  Use URL
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${form.imageMode === "upload" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setForm(p => ({ ...p, imageMode: "upload" }))}
                >
                  Upload File
                </button>
              </div>
              {form.imageMode === "url" ? (
                <Input
                  value={form.imageUrl}
                  onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.png"
                  type="url"
                />
              ) : (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                  <button
                    type="button"
                    className="w-full py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? "Uploading..." : form.imageUrl ? "Change image" : "Choose image"}
                  </button>
                  {form.imageUrl && !uploadingImage && (
                    <p className="text-[12px] text-primary mt-1">Image uploaded</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Project Link (optional)</label>
              <Input
                value={form.projectUrl}
                onChange={e => setForm(p => ({ ...p, projectUrl: e.target.value }))}
                placeholder="https://yourproject.com"
                type="url"
              />
            </div>

            <button
              className="w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              onClick={saveItem}
              disabled={saving || !form.title.trim()}
            >
              {saving ? "Saving..." : editingId ? "Update Item" : "Add Item"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this portfolio item?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteItem(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
