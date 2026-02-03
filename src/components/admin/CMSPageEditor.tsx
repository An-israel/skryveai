import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  content: unknown;
  is_published: boolean | null;
}

interface CMSPageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: CMSPage | null;
  onSave: () => void;
}

export function CMSPageEditor({ open, onOpenChange, page, onSave }: CMSPageEditorProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [contentJson, setContentJson] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setMetaTitle(page.meta_title || "");
      setMetaDescription(page.meta_description || "");
      setContentJson(JSON.stringify(page.content || {}, null, 2));
      setIsPublished(page.is_published ?? true);
    } else {
      setTitle("");
      setSlug("");
      setMetaTitle("");
      setMetaDescription("");
      setContentJson("{}");
      setIsPublished(true);
    }
  }, [page, open]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!page) {
      // Auto-generate slug from title for new pages
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleSave = async () => {
    if (!title || !slug) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }

    let parsedContent = {};
    try {
      parsedContent = JSON.parse(contentJson);
    } catch {
      toast({ title: "Invalid JSON content", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (page) {
        // Update existing page
        const { error } = await supabase
          .from("cms_pages")
          .update({
            title,
            slug,
            meta_title: metaTitle || null,
            meta_description: metaDescription || null,
            content: parsedContent,
            is_published: isPublished,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", page.id);

        if (error) throw error;
        toast({ title: "Page updated successfully" });
      } else {
        // Create new page
        const { error } = await supabase
          .from("cms_pages")
          .insert({
            title,
            slug,
            meta_title: metaTitle || null,
            meta_description: metaDescription || null,
            content: parsedContent,
            is_published: isPublished,
            created_by: user?.id,
            updated_by: user?.id,
          });

        if (error) throw error;
        toast({ title: "Page created successfully" });
      }

      onSave();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save page";
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{page ? "Edit Page" : "Create New Page"}</DialogTitle>
          <DialogDescription>
            {page ? "Update the page content and settings" : "Create a new CMS page"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Page Title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="page-slug"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="SEO title (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO description (optional)"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (JSON)</Label>
            <Textarea
              id="content"
              value={contentJson}
              onChange={(e) => setContentJson(e.target.value)}
              placeholder="{}"
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter page content as JSON. This can include sections, text blocks, images, etc.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">
                Make this page publicly visible
              </p>
            </div>
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {page ? "Update Page" : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
