import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, Edit, Trash2, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CVRecord {
  id: string;
  title: string;
  template_name: string;
  updated_at: string | null;
  created_at: string | null;
}

export default function CVBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cvs, setCvs] = useState<CVRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return;
      setProfileId(profile.id);

      const { data, error } = await (supabase as any)
        .from("skryve_cvs")
        .select("id, title, template_name, updated_at, created_at")
        .eq("talent_id", profile.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setCvs(data || []);
    } catch (err) {
      toast({ title: "Failed to load CVs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteCV = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("skryve_cvs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setCvs(prev => prev.filter(cv => cv.id !== id));
      toast({ title: "CV deleted" });
    } catch {
      toast({ title: "Failed to delete CV", variant: "destructive" });
    }
  };

  const templateLabel: Record<string, string> = {
    classic: "Classic",
    modern: "Modern",
    creative: "Creative",
    minimal: "Minimal",
    professional: "Professional",
    bold: "Bold",
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My CVs</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Build and manage your professional CVs</p>
          </div>
          <button
            onClick={() => navigate("/cv-builder/new")}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New CV
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && cvs.length === 0 && (
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-[14px] font-semibold text-foreground mb-2">No CVs yet</h2>
              <p className="text-[13px] text-muted-foreground mb-6 max-w-xs">
                Create your first CV and land your next role with a professionally crafted resume.
              </p>
              <button
                onClick={() => navigate("/cv-builder/new")}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create your first CV
              </button>
            </div>
          </div>
        )}

        {/* CV list panel */}
        {!loading && cvs.length > 0 && (
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-semibold text-foreground">
                {cvs.length} CV{cvs.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => navigate("/cv-builder/new")}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
            <div className="divide-y divide-border">
              {cvs.map(cv => (
                <div key={cv.id} className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center gap-4">
                  {/* CV icon */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-bold text-primary shrink-0">
                    {(cv.title || "U")[0].toUpperCase()}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {cv.title || "Untitled CV"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-muted-foreground">
                        Updated{" "}
                        {cv.updated_at
                          ? formatDistanceToNow(new Date(cv.updated_at), { addSuffix: true })
                          : cv.created_at
                          ? formatDistanceToNow(new Date(cv.created_at), { addSuffix: true })
                          : "recently"}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md capitalize">
                        {templateLabel[cv.template_name] || cv.template_name}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                      onClick={() => navigate(`/cv-builder/${cv.id}`)}
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                      onClick={() => navigate(`/cv-builder/${cv.id}?download=1`)}
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete CV?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{cv.title || "this CV"}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteCV(cv.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
