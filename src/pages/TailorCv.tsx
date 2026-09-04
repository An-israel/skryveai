import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Wand2, Loader2, FileText, ArrowRight } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { tailorCvToJob, extractFnErrorMessage, type StoredCv } from "@/lib/tailor-cv";
import { useToolLimitDialog } from "@/hooks/useToolLimitDialog";

export default function TailorCv() {
  const navigate = useNavigate();
  const { handle: handleToolLimit, dialog: toolLimitDialog } = useToolLimitDialog();

  const [loading, setLoading] = useState(true);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [cvs, setCvs] = useState<StoredCv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailoredCvId, setTailoredCvId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profile } = await (supabase as any)
        .from("talent_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!profile) { setLoading(false); return; }
      setTalentId(profile.id);

      const { data: rows } = await (supabase as any)
        .from("skryve_cvs")
        .select("id, title, template_name, personal_info, summary, experiences, education, skills, certifications, projects, updated_at")
        .eq("talent_id", profile.id)
        .order("updated_at", { ascending: false });
      setCvs(rows || []);
      if (rows?.length) setSelectedCvId(rows[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTailor = async () => {
    const source = cvs.find((c) => c.id === selectedCvId);
    if (!talentId || !source) return;
    if (jobDescription.trim().length < 30) {
      toast.error("Paste a fuller job description (at least a few sentences).");
      return;
    }
    setTailoring(true);
    try {
      const newId = await tailorCvToJob({
        talentId,
        source,
        jobTitle: jobTitle.trim() || "This role",
        jobDescription: jobDescription.trim(),
      });
      setTailoredCvId(newId);
      toast.success("CV tailored — review it below.");
    } catch (e) {
      if (handleToolLimit(e)) return;
      toast.error(await extractFnErrorMessage(e, "Couldn't tailor your CV. Please try again."));
    } finally {
      setTailoring(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <main className="container mx-auto max-w-2xl px-0 pb-16">
      <SEOHead
        title="Tailor Your CV to a Job — Skryve"
        description="Paste any job description and get your CV tailored to match it, in seconds."
        canonical="https://skryve.app/tailor-cv"
      />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cv-builder")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><Wand2 className="h-6 w-6 text-primary" />Tailor Your CV to a Job</h1>
            <p className="text-sm text-muted-foreground">
              Paste any job description — from anywhere, not just Skryve listings — and we'll rewrite one of your saved CVs to match it.
            </p>
          </div>
        </div>

        {cvs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">You don't have a saved CV yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create one first — then come back here to tailor it to any job.</p>
              <Button className="mt-4" onClick={() => navigate("/cv-builder/new")}>Create a CV</Button>
            </CardContent>
          </Card>
        ) : tailoredCvId ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-400/15">
                <Wand2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold">Your CV is tailored</h2>
              <p className="mt-1 text-sm text-muted-foreground">Review it, tweak anything, then download.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" onClick={() => { setTailoredCvId(null); setJobTitle(""); setJobDescription(""); }}>
                  Tailor another
                </Button>
                <Button onClick={() => navigate(`/cv-builder/${tailoredCvId}`)}>
                  Open in CV Builder<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Which CV should we tailor?</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cvs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCvId(c.id)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        selectedCvId === c.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {c.title || "Untitled CV"}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">The job</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="jt">Job title <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="jt" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Product Designer" />
                </div>
                <div>
                  <Label htmlFor="jd">Job description</Label>
                  <Textarea
                    id="jd" rows={10} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here — copy it from wherever you found the listing."
                  />
                </div>
                <Button onClick={handleTailor} disabled={tailoring || !selectedCvId} className="w-full">
                  {tailoring ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Tailoring…</> : <><Wand2 className="mr-2 h-4 w-4" />Tailor my CV to this job</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
      {toolLimitDialog}
    </main>
  );
}
