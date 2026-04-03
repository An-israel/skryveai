import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, ImageIcon } from "lucide-react";

interface CMSImageUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: () => void;
}

export function CMSImageUploader({ open, onOpenChange, onUpload }: CMSImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [altText, setAltText] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.split(".")[0]);
      }
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !name) {
      toast({ title: "Please select a file and provide a name", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${name.replace(/\s+/g, "-").toLowerCase()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("cms-images")
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from("cms-images")
        .getPublicUrl(fileName);

      // Insert into cms_images table
      const { error } = await supabase
        .from("cms_images")
        .insert({
          name,
          url: imageUrl,
          alt_text: altText || null,
          category: category || null,
          uploaded_by: user?.id,
        });

      if (error) throw error;

      toast({ title: "Image uploaded successfully" });
      onUpload();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setAltText("");
    setCategory("");
    setFile(null);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
          <DialogDescription>
            Add a new image to the CMS library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload Area */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="w-10 h-10" />
                <p>Click to select an image</p>
                <p className="text-xs">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageName">Name *</Label>
            <Input
              id="imageName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Image name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="altText">Alt Text</Label>
            <Input
              id="altText"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hero">Hero Images</SelectItem>
                <SelectItem value="feature">Feature Images</SelectItem>
                <SelectItem value="blog">Blog Images</SelectItem>
                <SelectItem value="icon">Icons</SelectItem>
                <SelectItem value="background">Backgrounds</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={loading || !file}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
