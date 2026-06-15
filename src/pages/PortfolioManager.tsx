import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
      <div className="text-center py-20">
        <p className="text-muted-foreground">You need to set up your talent profile first.</p>
        <Button className="mt-4" asChild>
          <a href="/profile">Set up profile</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">Showcase your best work to attract clients.</p>
        </div>
        <div className="flex gap-2">
          {username && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/profile/${username}`, "_blank")}>
              <ExternalLink className="w-4 h-4 mr-1" /> View Live Portfolio
            </Button>
          )}
          <Button size="sm" onClick={openAddSheet}>
            <Plus className="w-4 h-4 mr-1" /> Add Portfolio Item
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No portfolio items yet. Add your first project!</p>
          <Button onClick={openAddSheet}>
            <Plus className="w-4 h-4 mr-1" /> Add Portfolio Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                )}
                {item.is_featured && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-950 text-[10px]">
                    <Star className="w-3 h-3 mr-0.5 fill-current" /> Featured
                  </Badge>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {item.skill_category && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">{item.skill_category}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => toggleFeatured(item)}
                      title={item.is_featured ? "Unfeature" : "Feature"}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.is_featured ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSheet(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Portfolio Item" : "Add Portfolio Item"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Project Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="My awesome project" />
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">({form.description.length}/300)</span></Label>
              <Textarea
                value={form.description}
                maxLength={300}
                rows={3}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe what you built and your role..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Skill Category</Label>
              <Select value={form.skillCategory} onValueChange={v => setForm(p => ({ ...p, skillCategory: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Project Image</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button" size="sm"
                  variant={form.imageMode === "url" ? "default" : "outline"}
                  onClick={() => setForm(p => ({ ...p, imageMode: "url" }))}
                >Use URL</Button>
                <Button
                  type="button" size="sm"
                  variant={form.imageMode === "upload" ? "default" : "outline"}
                  onClick={() => setForm(p => ({ ...p, imageMode: "upload" }))}
                >Upload File</Button>
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
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    {uploadingImage ? "Uploading..." : form.imageUrl ? "Change image" : "Choose image"}
                  </Button>
                  {form.imageUrl && !uploadingImage && (
                    <p className="text-xs text-green-500 mt-1">Image uploaded</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Project Link <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={form.projectUrl}
                onChange={e => setForm(p => ({ ...p, projectUrl: e.target.value }))}
                placeholder="https://yourproject.com"
                type="url"
              />
            </div>

            <Button onClick={saveItem} disabled={saving || !form.title.trim()} className="w-full">
              {saving ? "Saving..." : editingId ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
