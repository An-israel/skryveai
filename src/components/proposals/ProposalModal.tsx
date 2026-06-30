import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TailorCVButton } from "@/components/cv/TailorCVButton";
import {
  Loader2,
  RefreshCw,
  Minimize2,
  FileText,
  Copy,
  Check,
  BookmarkPlus,
} from "lucide-react";

interface ProposalModalProps {
  open: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    platform: string;
    description: string;
    skill_tags?: string[];
    external_url?: string;
  } | null;
  onTrack?: (jobId: string) => void;
}

function platformBadgeClass(platform?: string): string {
  const map: Record<string, string> = {
    upwork: "bg-green-500 text-white",
    remoteok: "bg-emerald-600 text-white",
    weworkremotely: "bg-gray-800 text-white",
    linkedin: "bg-blue-600 text-white",
    indeed: "bg-blue-500 text-white",
    jobberman: "bg-red-500 text-white",
  };
  return map[platform || ""] || "bg-muted text-muted-foreground";
}

export function ProposalModal({ open, onClose, job, onTrack }: ProposalModalProps) {
  const { toast } = useToast();
  const [proposal, setProposal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (open && job) {
      generate("generate");
    }
  }, [open, job?.id]);

  useEffect(() => {
    setWordCount(proposal.trim().split(/\s+/).filter(Boolean).length);
  }, [proposal]);

  const generate = async (action: "generate" | "regenerate" | "shorter" | "formal") => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: talent } = await (supabase as any)
        .from("talent_profiles")
        .select("full_name, bio, primary_skill, secondary_skills, experience_level")
        .eq("user_id", session?.user?.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          jobTitle: job?.title,
          jobDescription: action === "shorter" || action === "formal" ? proposal : job?.description,
          requiredSkills: job?.skill_tags || [],
          talentName: talent?.full_name || session?.user?.email,
          talentBio: talent?.bio,
          talentSkills: [talent?.primary_skill, ...(talent?.secondary_skills || [])].filter(Boolean),
          experienceLevel: talent?.experience_level,
          action,
        },
      });
      if (error) throw error;
      setProposal(data?.proposal || "");
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(proposal);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrack = async () => {
    if (!job) return;
    const { data: { session } } = await supabase.auth.getSession();
    await (supabase as any).from("job_applications").upsert(
      {
        user_id: session?.user?.id,
        role_title: job.title,
        company_name: job.platform,
        status: "applied",
        proposal_text: proposal,
        job_title: job.title,
        platform: job.platform,
        external_url: job.external_url || null,
        applied_at: new Date().toISOString(),
      },
      { onConflict: "user_id,role_title" }
    );
    toast({ title: "Application tracked!", description: "Added to your Applications." });
    onTrack?.(job.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Proposal</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid md:grid-cols-2 gap-6 p-1">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={platformBadgeClass(job?.platform)}>{job?.platform}</Badge>
                  <h3 className="font-semibold text-sm">{job?.title}</h3>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {job?.description || "No description available"}
                </div>
              </div>
              {job?.skill_tags?.length ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Required Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {job.skill_tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {generating ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Generating proposal...</p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={proposal}
                    onChange={(e) => setProposal(e.target.value)}
                    rows={10}
                    className="resize-none text-sm"
                    placeholder="Your proposal will appear here..."
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{wordCount} words</span>
                    <span
                      className={
                        wordCount > 250
                          ? "text-destructive"
                          : wordCount >= 150
                          ? "text-green-600"
                          : ""
                      }
                    >
                      Ideal: 150–250 words
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generate("regenerate")}
                      disabled={generating}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generate("shorter")}
                      disabled={generating}
                    >
                      <Minimize2 className="w-3 h-3 mr-1" /> Shorter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generate("formal")}
                      disabled={generating}
                    >
                      <FileText className="w-3 h-3 mr-1" /> More Formal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      disabled={!proposal}
                    >
                      {copied ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <Copy className="w-3 h-3 mr-1" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleTrack} disabled={!proposal}>
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      Track This Application
                    </Button>
                    {job && (
                      <TailorCVButton
                        jobTitle={job.title}
                        jobDescription={job.description}
                        requiredSkills={job.skill_tags}
                        variant="outline"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
