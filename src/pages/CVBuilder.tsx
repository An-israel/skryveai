import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My CVs</h1>
            <p className="text-muted-foreground mt-1">Build and manage your professional CVs</p>
          </div>
          <Button
            onClick={() => navigate("/cv-builder/new")}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New CV
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        )}

        {/* Empty state */}
        {!loading && cvs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-[#2563EB]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No CVs yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first CV and land your next role with a professionally crafted resume.
            </p>
            <Button
              onClick={() => navigate("/cv-builder/new")}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create your first CV
            </Button>
          </div>
        )}

        {/* CV Grid */}
        {!loading && cvs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cvs.map(cv => (
              <Card key={cv.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                      {cv.title || "Untitled CV"}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                      {templateLabel[cv.template_name] || cv.template_name}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updated{" "}
                    {cv.updated_at
                      ? formatDistanceToNow(new Date(cv.updated_at), { addSuffix: true })
                      : cv.created_at
                      ? formatDistanceToNow(new Date(cv.created_at), { addSuffix: true })
                      : "recently"}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  {/* Mini preview strip */}
                  <div className="h-24 rounded-lg bg-muted/40 border mb-4 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full p-3 opacity-40 pointer-events-none scale-[0.6] origin-top">
                      <div className="h-2 bg-[#1E3A5F] rounded mb-1 w-1/2" />
                      <div className="h-1.5 bg-[#2563EB] rounded mb-2 w-1/3" />
                      <div className="h-1 bg-gray-400 rounded mb-1 w-full" />
                      <div className="h-1 bg-gray-400 rounded mb-1 w-5/6" />
                      <div className="h-1 bg-gray-400 rounded w-4/6" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
                      onClick={() => navigate(`/cv-builder/${cv.id}`)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/cv-builder/${cv.id}?download=1`)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
