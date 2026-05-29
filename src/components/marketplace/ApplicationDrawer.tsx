import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";

interface ApplicationDrawerProps {
  job: any;
  user: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplicationDrawer({ job, user, open, onClose, onSuccess }: ApplicationDrawerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [proposal, setProposal] = useState("");
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [rateType, setRateType] = useState<"fixed" | "hourly">("fixed");
  const [proposedRate, setProposedRate] = useState("");
  const [timeline, setTimeline] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [talentProfile, setTalentProfile] = useState<any>(null);

  const generateProposal = async (profile: any) => {
    setGeneratingProposal(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          action: "generate",
          jobTitle: job.title,
          jobDescription: job.description,
          requiredSkills: job.required_skills || [],
          talentBio: profile.bio || "",
          talentSkills: [profile.primary_skill, ...(profile.secondary_skills || [])].filter(Boolean),
          experienceLevel: profile.experience_level || "",
        },
      });
      if (!error && data?.proposal) setProposal(data.proposal);
    } catch {}
    setGeneratingProposal(false);
  };

  const handleRegenerate = () => {
    if (talentProfile) generateProposal(talentProfile);
  };

  useEffect(() => {
    if (!open || !user) return;

    const loadData = async () => {
      const { data: profile } = await (supabase as any)
        .from("talent_profiles")
        .select("id, hourly_rate, bio, primary_skill, secondary_skills, experience_level")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setTalentProfile(profile);
        if (profile.hourly_rate) setProposedRate(String(profile.hourly_rate));

        const { data: items } = await (supabase as any)
          .from("portfolio_items")
          .select("id, title, skill_category")
          .eq("talent_id", profile.id)
          .order("created_at", { ascending: false });

        setPortfolioItems(items || []);
        generateProposal(profile);
      }
    };

    setProposal("");
    setSelectedPortfolio([]);
    loadData();
  }, [open, user]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("job_applications")
        .insert({
          user_id: user.id,
          marketplace_job_id: job.id,
          proposal_text: proposal,
          rate_proposed: proposedRate ? parseFloat(proposedRate) : null,
          rate_type: rateType,
          timeline: timeline || null,
          portfolio_item_ids: selectedPortfolio,
          status: "applied",
          role_title: job.title,
          company_name: job.client_profiles?.company_name || "",
        });
      if (error) throw error;
      toast({
        title: "Application submitted!",
        description: "View your application in the Applications tracker.",
        action: (
          <ToastAction altText="View" onClick={() => navigate("/applications")}>
            View
          </ToastAction>
        ),
      });
      onClose();
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Apply for: {job?.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Your Proposal</Label>
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={generatingProposal}>
                {generatingProposal ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Regenerate
              </Button>
            </div>
            {generatingProposal && !proposal ? (
              <div className="h-40 flex items-center justify-center bg-muted rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Generating proposal...</p>
                </div>
              </div>
            ) : (
              <Textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={8}
                placeholder="Write your proposal..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {proposal.split(/\s+/).filter(Boolean).length} words (ideal: 150–250)
            </p>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Your Terms</Label>
            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                variant={rateType === "fixed" ? "default" : "outline"}
                onClick={() => setRateType("fixed")}
              >
                Fixed Price
              </Button>
              <Button
                size="sm"
                variant={rateType === "hourly" ? "default" : "outline"}
                onClick={() => setRateType("hourly")}
              >
                Hourly Rate
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proposed Rate (₦)</Label>
                <Input
                  type="number"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <Label>Estimated Timeline</Label>
                <Input
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g. 5 days, 2 weeks"
                />
              </div>
            </div>
          </div>

          {portfolioItems.length > 0 && (
            <div>
              <Label className="text-base font-semibold">Portfolio Samples (optional)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {portfolioItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedPortfolio((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((id) => id !== item.id)
                          : [...prev, item.id]
                      )
                    }
                    className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                      selectedPortfolio.includes(item.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium truncate">{item.title}</div>
                    {item.skill_category && (
                      <div className="text-xs text-muted-foreground">{item.skill_category}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-8 flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !proposal}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Application
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
