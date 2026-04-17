import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/campaign/StepIndicator";
import { ServiceDefinitionStep } from "@/components/campaign/ServiceDefinitionStep";
import { NeedScoredResultsStep } from "@/components/campaign/NeedScoredResultsStep";
import { SelectStep } from "@/components/campaign/SelectStep";
import { AnalyzeStep } from "@/components/campaign/AnalyzeStep";
import { PitchStep } from "@/components/campaign/PitchStep";
import { SendStep } from "@/components/campaign/SendStep";
import { CampaignTypeSelector, type CampaignType } from "@/components/campaign/CampaignTypeSelector";
import { DirectClientStep, type SocialHandles } from "@/components/campaign/DirectClientStep";
import { ExpertiseStep } from "@/components/campaign/ExpertiseStep";
import { InvestorSearchStep, type InvestorPitchData } from "@/components/campaign/InvestorSearchStep";
import { JobSearchStep } from "@/components/campaign/JobSearchStep";
import { JobSelectStep } from "@/components/campaign/JobSelectStep";
import type { Business, WebsiteAnalysis, GeneratedPitch, CampaignStep, JobListing, JobApplication } from "@/types/campaign";
import type { ServiceDefinition, SmartScoredBusiness } from "@/types/smartFind";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { campaignApi } from "@/lib/api/campaign";
import { smartFindApi } from "@/lib/api/smartFind";
import type { UserSettings } from "@/components/settings/EmailSettingsDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, FileText, Briefcase, User, Mail, ArrowLeft, Users, Loader2, Target } from "lucide-react";
import { FeatureGuide } from "@/components/onboarding/FeatureGuide";
import { newCampaignGuide } from "@/components/onboarding/guideConfigs";

interface ProfileStatus {
  hasBio: boolean;
  hasExpertise: boolean;
  hasCv: boolean;
  hasGmail: boolean;
  isComplete: boolean;
}

interface TeamProfile {
  id: string;
  name: string;
  bio: string | null;
  expertise: string[] | null;
  portfolio_url: string | null;
  cv_url: string | null;
}

interface TeamInfo {
  id: string;
  name: string;
  credits: number;
}

export default function NewCampaign() {
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
  const [currentStep, setCurrentStep] = useState<CampaignStep>('search');
  const [completedSteps, setCompletedSteps] = useState<CampaignStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
    hasBio: false, hasExpertise: false, hasCv: false, hasGmail: false, isComplete: false,
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [smartBusinesses, setSmartBusinesses] = useState<SmartScoredBusiness[]>([]);
  const [serviceDefinition, setServiceDefinition] = useState<ServiceDefinition | null>(null);
  const [smartLocation, setSmartLocation] = useState("");
  const [selectedBusinesses, setSelectedBusinesses] = useState<Business[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, WebsiteAnalysis>>({});
  const [pitches, setPitches] = useState<Record<string, GeneratedPitch>>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalyzing, setCurrentAnalyzing] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [campaignId, setCampaignId] = useState<string>();
  const [searchParams, setSearchParams] = useState({ businessType: "", location: "" });
  const [campaignExpertise, setCampaignExpertise] = useState("");
  const [campaignCta, setCampaignCta] = useState("");
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<TeamProfile | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  
  // Job application state
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<JobListing[]>([]);
  const [jobApplications, setJobApplications] = useState<Record<string, JobApplication>>({});

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const [{ data: subscription }, { data: adminRoles }] = await Promise.all([
        supabase.from("subscriptions").select("status, credits, trial_ends_at, plan").eq("user_id", session.user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);

      const isStaffAdmin = (adminRoles || []).some((r: { role: string }) =>
        ["super_admin", "content_editor", "support_agent", "staff"].includes(r.role)
      );

      if (!isStaffAdmin && subscription) {
        const isExpired = subscription.status === "expired" || subscription.status === "cancelled";
        const isTrialExpired = subscription.status === "trial" && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date();
        const hasNoCredits = (subscription.credits || 0) <= 0 && subscription.plan !== "lifetime";
        if ((isExpired || isTrialExpired) && hasNoCredits) {
          toast({ title: "Subscription Required", description: "Your subscription has expired. Please subscribe to continue.", variant: "destructive" });
          navigate("/pricing");
          return;
        }
      }

      const [profileResult, smtpResult, ownedTeamResult, membershipResult] = await Promise.all([
        supabase.from("profiles").select("bio, expertise, cv_url").eq("user_id", session.user.id).single(),
        supabase.from("smtp_credentials").select("id").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("teams").select("id, name, credits").eq("owner_id", session.user.id).maybeSingle(),
        supabase.from("team_members").select("team_id").eq("user_id", session.user.id).eq("status", "active").maybeSingle(),
      ]);

      const teamId = ownedTeamResult.data?.id || membershipResult.data?.team_id;
      if (teamId) {
        const team = ownedTeamResult.data || (await supabase.from("teams").select("id, name, credits").eq("id", teamId).single()).data;
        if (team) setTeamInfo(team);
        const { data: tProfiles } = await supabase.from("team_profiles").select("*").eq("team_id", teamId).order("created_at");
        if (tProfiles && tProfiles.length > 0) setTeamProfiles(tProfiles);
      }

      const profile = profileResult.data;
      const hasBio = !!(profile?.bio && profile.bio.trim().length > 10);
      const hasExpertise = !!(profile?.expertise && profile.expertise.length > 0);
      const hasCv = !!profile?.cv_url;
      const hasEmail = !!smtpResult.data;

      setProfileStatus({ hasBio, hasExpertise, hasCv, hasGmail: hasEmail, isComplete: hasBio && hasExpertise && hasCv });
      setCheckingProfile(false);
    };
    checkAuth();
  }, [navigate, toast]);

  // ─── Smart Find handler (replaces broad search for freelancer flow) ───
  const handleSmartFind = useCallback(async (def: ServiceDefinition, location: string) => {
    setIsLoading(true);
    setServiceDefinition(def);
    setSmartLocation(location);
    setSearchParams({ businessType: def.industryVertical, location });
    try {
      const result = await smartFindApi.findBusinesses(def, location);
      // Convert to Business[] for downstream flow + keep SmartScoredBusiness for the results card
      setSmartBusinesses(result.businesses);
      const asBusinesses: Business[] = result.businesses.map((b) => ({
        id: b.id, name: b.name, address: b.address, phone: b.phone,
        website: b.website, rating: b.rating, reviewCount: b.reviewCount,
        category: b.category, placeId: b.placeId, email: b.email, selected: false,
      }));
      setBusinesses(asBusinesses);
      setCompletedSteps([...completedSteps, 'search']);
      setCurrentStep('select');
      toast({
        title: `Found ${result.total} qualified leads`,
        description: `Scanned ${result.analyzedTotal} businesses — only the ones showing real pain signals are shown.`,
      });
    } catch (err) {
      toast({ title: "Smart Find failed", description: err instanceof Error ? err.message : "Try a broader location.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [completedSteps, toast]);

  // ─── Direct client flow handler ───
  const handleDirectClient = async (businessName: string, website: string, socialHandles?: SocialHandles) => {
    setIsLoading(true);
    const hasWebsite = !!website.trim();
    const hasSocial = !!(socialHandles && Object.values(socialHandles).some((v) => v?.trim()));
    setSearchParams({ businessType: "Direct Client", location: hasWebsite ? website : "Social Media Analysis" });

    try {
      const business: Business = {
        id: crypto.randomUUID(), name: businessName,
        address: hasWebsite ? website : "Social Media Analysis",
        website: hasWebsite ? (website.startsWith("http") ? website : `https://${website}`) : undefined,
        selected: true,
      };
      if (hasSocial) {
        sessionStorage.setItem("social_only_analysis", JSON.stringify({ socialOnly: !hasWebsite, socialHandles }));
      } else {
        sessionStorage.removeItem("social_only_analysis");
      }
      setBusinesses([business]);
      setSelectedBusinesses([business]);
      setCompletedSteps(["search", "select"]);
      setCurrentStep("analyze");
      toast({ title: "Client Added", description: `Ready to analyze ${businessName}'s online presence.` });
    } catch {
      toast({ title: "Error", description: "Failed to set up client analysis.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Investor flow handler ───
  const handleInvestorSearch = async (data: InvestorPitchData) => {
    setIsLoading(true);
    setSearchParams({ businessType: `${data.industry} Investors`, location: data.businessName });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const result = await campaignApi.searchBusinesses(`${data.industry} venture capital investment firm investor`, "United States");
      sessionStorage.setItem("investor_pitch_data", JSON.stringify(data));
      setBusinesses(result.businesses);
      setCompletedSteps(['search']);
      setCurrentStep('select');
      toast({ title: "Investors Found", description: `Found ${result.total} potential investors in ${data.industry}.` });
    } catch (error) {
      toast({ title: "Search Failed", description: error instanceof Error ? error.message : "Failed to find investors", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerEmailEnrichment = useCallback(async (cId: string | null | undefined) => {
    if (!cId) return;
    try {
      // Fire-and-forget background enrichment for all businesses in this campaign
      supabase.functions.invoke("enrich-campaign-emails", { body: { campaignId: cId } })
        .then(({ error }) => {
          if (error) console.warn("[enrich] invoke error:", error.message);
        });
    } catch (e) {
      console.warn("[enrich] failed to trigger:", e);
    }
  }, []);

  const handleSelect = async (selected: Business[]) => {
    setSelectedBusinesses(selected);

    if (campaignType === "job_application") return;

    if (campaignType === "investor") {
      setCompletedSteps([...completedSteps, 'select']);
      setIsLoading(true);
      const investorDataStr = sessionStorage.getItem("investor_pitch_data");
      const investorData = investorDataStr ? JSON.parse(investorDataStr) : null;
      if (!investorData) {
        toast({ title: "Error", description: "Investor pitch data not found.", variant: "destructive" });
        setCurrentStep('search'); setIsLoading(false); return;
      }
      const newPitches: Record<string, GeneratedPitch> = {};
      for (let i = 0; i < selected.length; i++) {
        const business = selected[i];
        try {
          const pitchResult = await campaignApi.generateInvestorPitch(business.name, investorData);
          newPitches[business.id] = { businessId: business.id, subject: pitchResult.subject, body: pitchResult.body, edited: false, approved: false };
          setPitches({ ...newPitches });
        } catch {
          toast({ title: "Pitch Error", description: `Failed to generate pitch for ${business.name}`, variant: "destructive" });
        }
      }
      setIsLoading(false);
      setCurrentStep('pitch');
      toast({ title: "Pitches Generated", description: `Generated ${Object.keys(newPitches).length} investor pitches.` });
      return;
    }

    setCompletedSteps([...completedSteps, 'select']);
    setCurrentStep('analyze');
  };

  // Smart Find specific: when user selects from need-scored cards
  const handleSmartSelect = (selected: SmartScoredBusiness[]) => {
    const asBusinesses: Business[] = selected.map((s) => ({
      id: s.id, name: s.name, address: s.address, phone: s.phone,
      website: s.website, rating: s.rating, reviewCount: s.reviewCount,
      category: s.category, placeId: s.placeId, email: s.email, emailVerified: s.emailVerified, selected: true,
    }));
    setSelectedBusinesses(asBusinesses);
    setCompletedSteps([...completedSteps, 'select']);
    setCurrentStep('analyze');
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    const newAnalyses: Record<string, WebsiteAnalysis> = {};
    const newPitches: Record<string, GeneratedPitch> = {};

    for (let i = 0; i < selectedBusinesses.length; i++) {
      const business = selectedBusinesses[i];
      setCurrentAnalyzing(business.name);
      setAnalysisProgress((i / selectedBusinesses.length) * 100);

      if (!business.website) {
        newAnalyses[business.id] = {
          businessId: business.id,
          issues: [{ category: 'design', severity: 'high', title: 'No Website Found', description: 'This business doesn\'t have a website listed' }],
          overallScore: 0, analyzed: true, analyzedAt: new Date().toISOString(),
        };
        setAnalyses({ ...newAnalyses });
        continue;
      }

      try {
        const socialOnlyData = sessionStorage.getItem("social_only_analysis");
        const socialOnlyParams = socialOnlyData ? JSON.parse(socialOnlyData) : null;

        // For Smart Find, pass detected signals into the deep analysis as context
        const smartCtx = smartBusinesses.find((s) => s.id === business.id);

        const analysisResult = await campaignApi.analyzeWebsite(
          business.website || "", business.name,
          {
            ...(socialOnlyParams ? { socialOnly: socialOnlyParams.socialOnly, socialHandles: socialOnlyParams.socialHandles } : {}),
            expertise: campaignExpertise, cta: campaignCta,
            ...(smartCtx ? { detectedSignals: smartCtx.signals, evidence: smartCtx.evidence, deep: true } : {}),
          } as Parameters<typeof campaignApi.analyzeWebsite>[2],
        );

        newAnalyses[business.id] = {
          businessId: business.id, issues: analysisResult.issues,
          overallScore: analysisResult.overallScore, analyzed: true,
          analyzedAt: analysisResult.analyzedAt,
        };

        if (analysisResult.email && !business.email) {
          const updatedBusiness = { ...business, email: analysisResult.email };
          setSelectedBusinesses(prev => prev.map(b => b.id === business.id ? updatedBusiness : b));
        }
        setAnalyses({ ...newAnalyses });

        try {
          const pitchResult = await campaignApi.generatePitch(
            business.name, business.website, analysisResult.issues,
            undefined, campaignExpertise, campaignCta,
          );
          newPitches[business.id] = {
            businessId: business.id, subject: pitchResult.subject, body: pitchResult.body,
            edited: false, approved: false,
          };
          setPitches({ ...newPitches });
        } catch (pitchError) {
          console.error(`Pitch generation failed for ${business.name}:`, pitchError);
        }
      } catch (error) {
        console.error(`Analysis failed for ${business.name}:`, error);
        newAnalyses[business.id] = {
          businessId: business.id,
          issues: [{ category: 'performance', severity: 'medium', title: 'Analysis Failed', description: 'Could not analyze — may be offline or blocking scrapers' }],
          overallScore: 0, analyzed: true, analyzedAt: new Date().toISOString(),
        };
        setAnalyses({ ...newAnalyses });
      }
    }

    setAnalysisProgress(100);
    setCurrentAnalyzing(undefined);
    setIsAnalyzing(false);
    toast({ title: "Analysis Complete", description: `Analyzed ${selectedBusinesses.length} online presences.` });
  };

  const handleAnalysisContinue = () => {
    setCompletedSteps([...completedSteps, 'analyze']);
    setCurrentStep('pitch');
  };

  const handleUpdatePitch = (businessId: string, pitch: GeneratedPitch) => {
    setPitches(prev => ({ ...prev, [businessId]: pitch }));
  };

  const handleUpdateBusinessEmail = (businessId: string, email: string, emailVerified?: boolean) => {
    const normalizedEmail = email.trim().toLowerCase();
    setSelectedBusinesses((prev) =>
      prev.map((business) =>
        business.id === businessId
          ? { ...business, email: normalizedEmail || undefined, emailVerified: normalizedEmail ? (emailVerified ?? false) : false }
          : business
      )
    );
    setJobApplications((prev) => {
      const existing = prev[businessId];
      if (!existing) return prev;
      return { ...prev, [businessId]: { ...existing, extractedEmail: normalizedEmail || null } };
    });
  };

  const handleRegeneratePitch = async (businessId: string) => {
    const business = selectedBusinesses.find((b) => b.id === businessId);
    const analysis = analyses[businessId];
    if (business && analysis && business.website) {
      try {
        const pitchResult = await campaignApi.generatePitch(business.name, business.website, analysis.issues, undefined, campaignExpertise, campaignCta);
        setPitches({ ...pitches, [businessId]: { businessId, subject: pitchResult.subject, body: pitchResult.body, edited: false, approved: false } });
        toast({ title: "Pitch regenerated" });
      } catch (error) {
        toast({ title: "Regeneration failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      }
    }
  };

  const handlePitchContinue = () => {
    setCompletedSteps([...completedSteps, 'pitch']);
    setCurrentStep('send');
  };

  const handleSend = async (userSettings: UserSettings | null) => {
    setIsSending(true); setSentCount(0); setQueuedCount(0);
    const approvedBusinesses = selectedBusinesses.filter((b) => pitches[b.id]?.approved);
    const delaySeconds = userSettings?.delay_between_emails || 30;
    const currentCampaignType = campaignType || "freelancer";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: adminRolesForSend } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdminForSend = (adminRolesForSend || []).some((r: { role: string }) =>
        ["super_admin", "content_editor", "support_agent", "staff"].includes(r.role)
      );

      const creditPerEmail = currentCampaignType === "investor" ? 0.5 : 0.2;
      const totalCreditsNeeded = approvedBusinesses.length * creditPerEmail;
      const useTeamCredits = !!selectedTeamProfile && !!teamInfo;

      if (!isAdminForSend && useTeamCredits) {
        const { data: freshTeam } = await supabase.from("teams").select("credits").eq("id", teamInfo!.id).single();
        if (freshTeam && freshTeam.credits < totalCreditsNeeded) {
          toast({ title: "Insufficient Team Credits", description: `Need ${totalCreditsNeeded}, team has ${freshTeam.credits}.`, variant: "destructive" });
          setIsSending(false); return;
        }
      } else if (!isAdminForSend) {
        const { data: subscription } = await supabase.from("subscriptions").select("credits, plan").eq("user_id", user.id).single();
        if (subscription && subscription.plan !== "lifetime" && subscription.credits < totalCreditsNeeded) {
          toast({ title: "Insufficient Credits", description: `Need ${totalCreditsNeeded}, you have ${subscription.credits}.`, variant: "destructive" });
          setIsSending(false); return;
        }
      }

      const campaignName = currentCampaignType === "direct_client"
        ? `Direct: ${searchParams.businessType}`
        : currentCampaignType === "investor"
        ? `Investors: ${searchParams.businessType}`
        : `Smart Find: ${searchParams.businessType} in ${searchParams.location}`;

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id, name: campaignName,
          business_type: searchParams.businessType, location: searchParams.location,
          status: "sending", campaign_type: currentCampaignType,
        })
        .select().single();

      if (campaignError) throw campaignError;
      setCampaignId(campaign.id);

      const businessInserts = approvedBusinesses.map(b => ({
        campaign_id: campaign.id, name: b.name, address: b.address,
        phone: b.phone, website: b.website, rating: b.rating,
        review_count: b.reviewCount, category: b.category, place_id: b.placeId,
        email: b.email, selected: true,
      }));

      const { data: insertedBusinesses, error: businessError } = await supabase
        .from("businesses").insert(businessInserts).select();
      if (businessError) throw businessError;

      for (let i = 0; i < approvedBusinesses.length; i++) {
        const business = approvedBusinesses[i];
        const pitch = pitches[business.id];
        const dbBusiness = insertedBusinesses?.find(b => b.name === business.name);
        if (!dbBusiness || !pitch) continue;

        const { data: pitchRecord, error: pitchError } = await supabase
          .from("pitches")
          .insert({ business_id: dbBusiness.id, subject: pitch.subject, body: pitch.body, edited: pitch.edited, approved: true })
          .select().single();
        if (pitchError) continue;

        const scheduledFor = new Date(Date.now() + (i * delaySeconds * 1000));
        const { error: queueError } = await supabase
          .from("email_queue")
          .insert({
            campaign_id: campaign.id, business_id: dbBusiness.id, pitch_id: pitchRecord.id,
            to_email: business.email || `contact@${business.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}`,
            subject: pitch.subject,
            body: pitch.body + (userSettings?.email_signature ? `\n\n${userSettings.email_signature}` : ''),
            sender_name: userSettings?.sender_name, sender_email: userSettings?.sender_email,
            scheduled_for: scheduledFor.toISOString(),
          });
        if (queueError) continue;
        setSentCount(i + 1);
        setSendProgress(((i + 1) / approvedBusinesses.length) * 100);
      }

      if (!isAdminForSend) {
        if (useTeamCredits) {
          const { data: freshTeam } = await supabase.from("teams").select("credits").eq("id", teamInfo!.id).single();
          if (freshTeam) {
            const newCredits = Math.max(0, freshTeam.credits - totalCreditsNeeded);
            await supabase.from("teams").update({ credits: newCredits }).eq("id", teamInfo!.id);
          }
        } else {
          const { data: sub } = await supabase.from("subscriptions").select("credits, plan").eq("user_id", user.id).single();
          if (sub && sub.plan !== "lifetime") {
            const newCredits = Math.max(0, sub.credits - totalCreditsNeeded);
            await supabase.from("subscriptions").update({ credits: newCredits }).eq("user_id", user.id);
          }
        }
      }

      setQueuedCount(approvedBusinesses.length);
      setIsSending(false);
      setCompletedSteps([...completedSteps, 'send']);
      toast({ title: "Emails Scheduled!", description: `${approvedBusinesses.length} emails queued. ${totalCreditsNeeded} credits used.` });
      supabase.functions.invoke("process-email-queue").catch(console.error);
      supabase.from("tool_usage").insert({ user_id: user.id, tool_name: "campaign_email", metadata: { emails_queued: approvedBusinesses.length, campaign_type: currentCampaignType } } as never).then(() => {});
    } catch (error) {
      setIsSending(false);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to schedule emails", variant: "destructive" });
    }
  };

  // ─── Job Application flow handlers ───
  const handleJobSearch = async (expertise: string, location: string) => {
    setIsLoading(true);
    setSearchParams({ businessType: expertise, location: location || "Remote" });
    try {
      const { data, error } = await supabase.functions.invoke("search-jobs", { body: { expertise, location, limit: 50 } });
      if (error) throw new Error(error.message || "Failed to search jobs");
      if (!data?.jobs) throw new Error("No results returned");
      setJobListings(data.jobs);
      setCompletedSteps([...completedSteps, "search"]);
      setCurrentStep("select");
      toast({ title: "Jobs Found!", description: `Found ${data.total} job postings.` });
    } catch (error) {
      toast({ title: "Search Failed", description: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobSelect = async (selected: JobListing[]) => {
    setSelectedJobs(selected);
    setCompletedSteps([...completedSteps, "select"]);
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name, bio, expertise, portfolio_url, cv_url").eq("user_id", user.id).single();
    const jobBusinesses: Business[] = [];
    const newPitches: Record<string, GeneratedPitch> = {};
    const newApplications: Record<string, JobApplication> = {};
    const BATCH_SIZE = 5;
    let completedCount = 0;

    for (let batchStart = 0; batchStart < selected.length; batchStart += BATCH_SIZE) {
      const batch = selected.slice(batchStart, batchStart + BATCH_SIZE);
      setCurrentAnalyzing(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}`);
      const results = await Promise.allSettled(
        batch.map(async (job) => {
          const { data: appResult, error: appError } = await supabase.functions.invoke("generate-job-application", {
            body: { jobTitle: job.jobTitle, company: job.company, jobDescription: job.fullContent || job.description, jobUrl: job.url, userProfile: profile, email: job.email, emailVerified: job.emailVerified },
          });
          if (appError) throw appError;
          return { job, appResult };
        })
      );
      for (const result of results) {
        completedCount++;
        if (result.status === "fulfilled") {
          const { job, appResult } = result.value;
          const email = job.email || appResult?.extractedEmail;
          const isVerified = job.email ? Boolean(job.emailVerified) : Boolean(appResult?.emailVerified);
          jobBusinesses.push({
            id: job.id, name: `${job.jobTitle} — ${job.company}`, address: job.location, website: job.url,
            email, emailVerified: isVerified, category: job.platform, selected: true,
          });
          newPitches[job.id] = { businessId: job.id, subject: appResult?.subject || `Application for ${job.jobTitle}`, body: appResult?.body || "", edited: false, approved: false };
          newApplications[job.id] = { jobId: job.id, subject: appResult?.subject || "", body: appResult?.body || "", keyMatchingSkills: appResult?.keyMatchingSkills || [], extractedEmail: email, edited: false, approved: false };
        }
      }
      setAnalysisProgress((completedCount / selected.length) * 100);
      setSelectedBusinesses([...jobBusinesses]);
      setPitches({ ...newPitches });
      setJobApplications({ ...newApplications });
    }

    setAnalysisProgress(100);
    setCurrentAnalyzing(undefined);
    setIsLoading(false);
    setCurrentStep("pitch");
    toast({ title: "Applications Generated!", description: `Created ${Object.keys(newPitches).length} tailored applications.` });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasTeamProfile = selectedTeamProfile !== null;
  if (!hasTeamProfile && !profileStatus.isComplete && campaignType && campaignType !== "investor") {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={true} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-warning/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-warning/10"><AlertTriangle className="w-6 h-6 text-warning" /></div>
                  <div>
                    <CardTitle>Complete Your Profile First</CardTitle>
                    <CardDescription>To create personalized pitches, we need some information about you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Our AI uses your profile to craft personalized outreach emails.</p>
                <div className="space-y-3 py-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasExpertise ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <Briefcase className={`w-5 h-5 ${profileStatus.hasExpertise ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">Expertise</p></div>
                    {profileStatus.hasExpertise ? <span className="text-success text-sm">✓ Complete</span> : <span className="text-warning text-sm">Required</span>}
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasBio ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <User className={`w-5 h-5 ${profileStatus.hasBio ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">Bio</p></div>
                    {profileStatus.hasBio ? <span className="text-success text-sm">✓ Complete</span> : <span className="text-warning text-sm">Required</span>}
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasCv ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <FileText className={`w-5 h-5 ${profileStatus.hasCv ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">CV / Resume</p></div>
                    {profileStatus.hasCv ? <span className="text-success text-sm">✓ Complete</span> : <span className="text-warning text-sm">Required</span>}
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasGmail ? 'bg-success/5 border-success/30' : 'bg-muted/30'}`}>
                    <Mail className={`w-5 h-5 ${profileStatus.hasGmail ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">Gmail Connection</p></div>
                    {profileStatus.hasGmail ? <span className="text-success text-sm">✓ Connected</span> : <span className="text-muted-foreground text-sm">Optional</span>}
                  </div>
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link to="/settings">Complete Your Profile</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  if ((campaignType === "freelancer" || campaignType === "direct_client") && !campaignExpertise) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={true} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-3xl mx-auto mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCampaignType(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Change campaign type
            </Button>
          </div>
          <AnimatePresence mode="wait">
            <ExpertiseStep
              key="expertise"
              onProceed={(expertise, cta) => { setCampaignExpertise(expertise); setCampaignCta(cta); }}
              onBack={() => setCampaignType(null)}
            />
          </AnimatePresence>
        </main>
      </div>
    );
  }

  if (!campaignType) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={true} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12">
          {teamProfiles.length > 0 && (
            <div className="max-w-3xl mx-auto mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Team Profile</p>
                      <p className="text-xs text-muted-foreground">Select a team profile to use ({teamInfo?.credits || 0} team credits available)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedTeamProfile?.id || "personal"} onValueChange={(val) => {
                      if (val === "personal") setSelectedTeamProfile(null);
                      else setSelectedTeamProfile(teamProfiles.find(p => p.id === val) || null);
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Use personal profile" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Use personal profile</SelectItem>
                        {teamProfiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.expertise?.length ? `(${p.expertise.slice(0, 2).join(", ")})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <CampaignTypeSelector onSelect={setCampaignType} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      <FeatureGuide featureKey="new-campaign" steps={newCampaignGuide} />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {currentStep === 'search' && (
          <div className="max-w-3xl mx-auto mb-4">
            <Button variant="ghost" size="sm" onClick={() => { setCampaignType(null); setCampaignExpertise(""); setCampaignCta(""); setServiceDefinition(null); setSmartBusinesses([]); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Change campaign type
            </Button>
          </div>
        )}

        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} campaignType={campaignType} />

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {/* Smart Find flow: ServiceDefinition → NeedScoredResults → Analyze → Pitch → Send */}
            {campaignType === "freelancer" && currentStep === 'search' && !isLoading && (
              <ServiceDefinitionStep
                key="service-def"
                expertise={campaignExpertise}
                onProceed={handleSmartFind}
                onBack={() => setCampaignType(null)}
              />
            )}

            {campaignType === "freelancer" && currentStep === 'search' && isLoading && (
              <motion.div key="smart-loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <CardTitle>Finding Qualified Leads</CardTitle>
                    <CardDescription>
                      Searching businesses and scanning each website for pain signals. This usually takes 60–90 seconds.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scoring need across up to 30 businesses...</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Direct Client flow */}
            {campaignType === "direct_client" && currentStep === "search" && (
              <DirectClientStep key="direct-client" onSubmit={handleDirectClient} isLoading={isLoading} />
            )}

            {/* Investor flow */}
            {campaignType === "investor" && currentStep === 'search' && (
              <InvestorSearchStep key="investor-search" onSubmit={handleInvestorSearch} isLoading={isLoading} />
            )}

            {/* Job Application flow */}
            {campaignType === "job_application" && currentStep === 'search' && (
              <JobSearchStep key="job-search" onSearch={handleJobSearch} isLoading={isLoading} />
            )}

            {campaignType === "job_application" && currentStep === 'select' && !isLoading && (
              <JobSelectStep key="job-select" jobs={jobListings} onSelect={handleJobSelect} onBack={() => setCurrentStep('search')} maxSelect={50} />
            )}

            {campaignType === "job_application" && currentStep === 'select' && isLoading && (
              <motion.div key="job-progress" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <CardTitle>Generating Tailored Applications</CardTitle>
                    <CardDescription>AI is crafting personalized cover letters for each job.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(analysisProgress)}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary overflow-hidden">
                        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${analysisProgress}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    </div>
                    {currentAnalyzing && (
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-sm font-medium">Currently processing:</p>
                        <p className="text-sm text-muted-foreground mt-1">{currentAnalyzing}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Smart Find: scored results step */}
            {campaignType === "freelancer" && currentStep === 'select' && (
              <NeedScoredResultsStep
                key="need-scored"
                businesses={smartBusinesses}
                onSelect={handleSmartSelect}
                onBack={() => setCurrentStep('search')}
                maxSelect={10}
              />
            )}

            {/* Investor select step uses generic SelectStep */}
            {campaignType === "investor" && currentStep === 'select' && (
              <SelectStep key="select" businesses={businesses} onSelect={handleSelect} onBack={() => setCurrentStep('search')} />
            )}

            {currentStep === 'analyze' && (
              <AnalyzeStep key="analyze" businesses={selectedBusinesses} analyses={analyses} isAnalyzing={isAnalyzing} progress={analysisProgress} currentBusiness={currentAnalyzing} onStartAnalysis={handleStartAnalysis} onContinue={handleAnalysisContinue} onBack={() => { if (campaignType === "direct_client") setCurrentStep('search'); else setCurrentStep('select'); }} />
            )}
            {currentStep === 'pitch' && (
              <PitchStep key="pitch" businesses={selectedBusinesses} pitches={pitches} isGenerating={isLoading} requireRecipientEmail={campaignType === "job_application"} onUpdatePitch={handleUpdatePitch} onUpdateBusinessEmail={handleUpdateBusinessEmail} onRegeneratePitch={handleRegeneratePitch} onContinue={handlePitchContinue} onBack={() => setCurrentStep(campaignType === "investor" || campaignType === "job_application" ? 'select' : 'analyze')} />
            )}
            {currentStep === 'send' && (
              <SendStep key="send" businesses={selectedBusinesses} pitches={pitches} campaignId={campaignId} onSend={handleSend} onBack={() => setCurrentStep('pitch')} isSending={isSending} sendProgress={sendProgress} sentCount={sentCount} queuedCount={queuedCount} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
