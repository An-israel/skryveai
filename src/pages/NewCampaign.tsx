import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/campaign/StepIndicator";
import { SearchStep } from "@/components/campaign/SearchStep";
import { SelectStep } from "@/components/campaign/SelectStep";
import { AnalyzeStep } from "@/components/campaign/AnalyzeStep";
import { PitchStep } from "@/components/campaign/PitchStep";
import { SendStep } from "@/components/campaign/SendStep";
import { CampaignTypeSelector, type CampaignType } from "@/components/campaign/CampaignTypeSelector";
import { DirectClientStep } from "@/components/campaign/DirectClientStep";
import { InvestorSearchStep, type InvestorPitchData } from "@/components/campaign/InvestorSearchStep";
import type { Business, WebsiteAnalysis, GeneratedPitch, CampaignStep } from "@/types/campaign";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { campaignApi } from "@/lib/api/campaign";
import type { UserSettings } from "@/components/settings/EmailSettingsDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Briefcase, User, Mail, ArrowLeft } from "lucide-react";

interface ProfileStatus {
  hasBio: boolean;
  hasExpertise: boolean;
  hasCv: boolean;
  hasGmail: boolean;
  isComplete: boolean;
}

export default function NewCampaign() {
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
  const [currentStep, setCurrentStep] = useState<CampaignStep>('search');
  const [completedSteps, setCompletedSteps] = useState<CampaignStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
    hasBio: false,
    hasExpertise: false,
    hasCv: false,
    hasGmail: false,
    isComplete: false,
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
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

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      
      const [profileResult, gmailResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("bio, expertise, cv_url")
          .eq("user_id", session.user.id)
          .single(),
        supabase
          .from("gmail_tokens")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle()
      ]);

      const profile = profileResult.data;
      const hasBio = !!(profile?.bio && profile.bio.trim().length > 10);
      const hasExpertise = !!(profile?.expertise && profile.expertise.length > 0);
      const hasCv = !!profile?.cv_url;
      const hasGmail = !!gmailResult.data;

      setProfileStatus({
        hasBio,
        hasExpertise,
        hasCv,
        hasGmail,
        isComplete: hasBio && hasExpertise && hasCv,
      });
      setCheckingProfile(false);
    };
    checkAuth();
  }, [navigate]);

  // ─── Freelancer flow handlers ───

  const handleSearch = async (businessType: string, location: string) => {
    setIsLoading(true);
    setSearchParams({ businessType, location });
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
        navigate("/login");
        return;
      }

      const result = await campaignApi.searchBusinesses(businessType, location);
      setBusinesses(result.businesses);
      setCompletedSteps([...completedSteps, 'search']);
      setCurrentStep('select');
      toast({ title: "Search Complete", description: `Found ${result.total} businesses.` });
    } catch (error) {
      console.error("Search error:", error);
      const msg = error instanceof Error ? error.message : "Failed to search businesses";
      if (msg.includes("Session expired") || msg.includes("log in")) {
        navigate("/login");
        return;
      }
      toast({ title: "Search Failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Direct client flow handler ───

  const handleDirectClient = async (businessName: string, website: string) => {
    setIsLoading(true);
    setSearchParams({ businessType: "Direct Client", location: website });
    
    try {
      // Create a mock business entry
      const business: Business = {
        id: crypto.randomUUID(),
        name: businessName,
        address: website,
        website: website.startsWith("http") ? website : `https://${website}`,
        selected: true,
      };
      
      setBusinesses([business]);
      setSelectedBusinesses([business]);
      
      // Go directly to analyze step
      setCompletedSteps(['search', 'select']);
      setCurrentStep('analyze');
      
      toast({ title: "Client Added", description: `Ready to analyze ${businessName}'s online presence.` });
    } catch (error) {
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
      if (!session) {
        navigate("/login");
        return;
      }

      // Search for investors using Google Places (VCs, investment firms)
      const result = await campaignApi.searchBusinesses(
        `${data.industry} venture capital investment firm investor`,
        "United States" // Default to US for investor searches
      );
      
      // Store investor pitch data in session for pitch generation
      sessionStorage.setItem("investor_pitch_data", JSON.stringify(data));
      
      setBusinesses(result.businesses);
      setCompletedSteps(['search']);
      setCurrentStep('select');
      toast({ title: "Investors Found", description: `Found ${result.total} potential investors in ${data.industry}.` });
    } catch (error) {
      console.error("Investor search error:", error);
      toast({ title: "Search Failed", description: error instanceof Error ? error.message : "Failed to find investors", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (selected: Business[]) => {
    setSelectedBusinesses(selected);
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
          overallScore: 0,
          analyzed: true,
          analyzedAt: new Date().toISOString(),
        };
        setAnalyses({ ...newAnalyses });
        continue;
      }

      try {
        const analysisResult = await campaignApi.analyzeWebsite(business.website, business.name);
        
        newAnalyses[business.id] = {
          businessId: business.id,
          issues: analysisResult.issues,
          overallScore: analysisResult.overallScore,
          analyzed: true,
          analyzedAt: analysisResult.analyzedAt,
        };
        
        if (analysisResult.email && !business.email) {
          const updatedBusiness = { ...business, email: analysisResult.email };
          setSelectedBusinesses(prev => prev.map(b => b.id === business.id ? updatedBusiness : b));
        }

        setAnalyses({ ...newAnalyses });

        try {
          const pitchResult = await campaignApi.generatePitch(
            business.name,
            business.website,
            analysisResult.issues
          );
          
          newPitches[business.id] = {
            businessId: business.id,
            subject: pitchResult.subject,
            body: pitchResult.body,
            edited: false,
            approved: false,
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
          overallScore: 0,
          analyzed: true,
          analyzedAt: new Date().toISOString(),
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
    setPitches({ ...pitches, [businessId]: pitch });
  };

  const handleRegeneratePitch = async (businessId: string) => {
    const business = selectedBusinesses.find((b) => b.id === businessId);
    const analysis = analyses[businessId];
    
    if (business && analysis && business.website) {
      try {
        const pitchResult = await campaignApi.generatePitch(business.name, business.website, analysis.issues);
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
    setIsSending(true);
    setSentCount(0);
    setQueuedCount(0);
    
    const approvedBusinesses = selectedBusinesses.filter((b) => pitches[b.id]?.approved);
    const delaySeconds = userSettings?.delay_between_emails || 30;
    const currentCampaignType = campaignType || "freelancer";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check credits before sending
      const creditPerEmail = currentCampaignType === "investor" ? 0.5 : 0.2;
      const totalCreditsNeeded = approvedBusinesses.length * creditPerEmail;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credits, plan")
        .eq("user_id", user.id)
        .single();

      if (subscription && subscription.plan !== "lifetime" && subscription.credits < totalCreditsNeeded) {
        toast({
          title: "Insufficient Credits",
          description: `You need ${totalCreditsNeeded} credits but only have ${subscription.credits}. Upgrade your plan for more credits.`,
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      // Create campaign record
      const campaignName = currentCampaignType === "direct_client"
        ? `Direct: ${searchParams.businessType}`
        : currentCampaignType === "investor"
        ? `Investors: ${searchParams.businessType}`
        : `${searchParams.businessType} in ${searchParams.location}`;
      
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: campaignName,
          business_type: searchParams.businessType,
          location: searchParams.location,
          status: "sending",
          campaign_type: currentCampaignType,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setCampaignId(campaign.id);

      // Insert businesses
      const businessInserts = approvedBusinesses.map(b => ({
        campaign_id: campaign.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        website: b.website,
        rating: b.rating,
        review_count: b.reviewCount,
        category: b.category,
        place_id: b.placeId,
        email: b.email,
        selected: true,
      }));

      const { data: insertedBusinesses, error: businessError } = await supabase
        .from("businesses")
        .insert(businessInserts)
        .select();

      if (businessError) throw businessError;

      // Queue emails
      for (let i = 0; i < approvedBusinesses.length; i++) {
        const business = approvedBusinesses[i];
        const pitch = pitches[business.id];
        const dbBusiness = insertedBusinesses?.find(b => b.name === business.name);
        
        if (!dbBusiness || !pitch) continue;

        const { data: pitchRecord, error: pitchError } = await supabase
          .from("pitches")
          .insert({ business_id: dbBusiness.id, subject: pitch.subject, body: pitch.body, edited: pitch.edited, approved: true })
          .select()
          .single();

        if (pitchError) { console.error("Error creating pitch:", pitchError); continue; }

        const scheduledFor = new Date(Date.now() + (i * delaySeconds * 1000));

        const { error: queueError } = await supabase
          .from("email_queue")
          .insert({
            campaign_id: campaign.id,
            business_id: dbBusiness.id,
            pitch_id: pitchRecord.id,
            to_email: business.email || `contact@${business.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}`,
            subject: pitch.subject,
            body: pitch.body + (userSettings?.email_signature ? `\n\n${userSettings.email_signature}` : ''),
            sender_name: userSettings?.sender_name,
            sender_email: userSettings?.sender_email,
            scheduled_for: scheduledFor.toISOString(),
          });

        if (queueError) { console.error("Error queuing email:", queueError); continue; }

        setSentCount(i + 1);
        setSendProgress(((i + 1) / approvedBusinesses.length) * 100);
      }

      // Deduct credits
      if (subscription && subscription.plan !== "lifetime") {
        const newCredits = Math.max(0, subscription.credits - totalCreditsNeeded);
        await supabase
          .from("subscriptions")
          .update({ credits: newCredits })
          .eq("user_id", user.id);
      }

      setQueuedCount(approvedBusinesses.length);
      setIsSending(false);
      setCompletedSteps([...completedSteps, 'send']);
      
      toast({
        title: "Emails Scheduled!",
        description: `${approvedBusinesses.length} emails queued. ${totalCreditsNeeded} credits used.`,
      });

      supabase.functions.invoke("process-email-queue").catch(console.error);
    } catch (error) {
      console.error("Send error:", error);
      setIsSending(false);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to schedule emails", variant: "destructive" });
    }
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

  // Profile completion gate (only for freelancer/direct_client)
  if (!profileStatus.isComplete && campaignType && campaignType !== "investor") {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={true} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-warning/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-warning/10">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Complete Your Profile First</CardTitle>
                    <CardDescription>To create personalized pitches, we need some information about you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Our AI uses your profile to craft personalized outreach emails highlighting your unique skills.</p>
                <div className="space-y-3 py-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasExpertise ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <Briefcase className={`w-5 h-5 ${profileStatus.hasExpertise ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">Expertise</p><p className="text-sm text-muted-foreground">Select the services you offer</p></div>
                    {profileStatus.hasExpertise ? <span className="text-success text-sm">✓ Complete</span> : <span className="text-warning text-sm">Required</span>}
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasBio ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <User className={`w-5 h-5 ${profileStatus.hasBio ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">Bio</p><p className="text-sm text-muted-foreground">Tell us about your experience</p></div>
                    {profileStatus.hasBio ? <span className="text-success text-sm">✓ Complete</span> : <span className="text-warning text-sm">Required</span>}
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasCv ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <FileText className={`w-5 h-5 ${profileStatus.hasCv ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">CV / Resume</p><p className="text-sm text-muted-foreground">Upload your CV for better pitches</p></div>
                    {profileStatus.hasCv ? <span className="text-success text-sm">✓ Complete</span> : <span className="text-warning text-sm">Required</span>}
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasGmail ? 'bg-success/5 border-success/30' : 'bg-muted/30'}`}>
                    <Mail className={`w-5 h-5 ${profileStatus.hasGmail ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1"><p className="font-medium">Gmail Connection</p><p className="text-sm text-muted-foreground">Connect Gmail for better deliverability</p></div>
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

  // Campaign type selection screen
  if (!campaignType) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={true} onLogout={handleLogout} />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <CampaignTypeSelector onSelect={setCampaignType} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Back to campaign type selector */}
        {currentStep === 'search' && (
          <div className="max-w-3xl mx-auto mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCampaignType(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Change campaign type
            </Button>
          </div>
        )}
        
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
        
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {/* Freelancer flow: Search → Select → Analyze → Pitch → Send */}
            {campaignType === "freelancer" && currentStep === 'search' && (
              <SearchStep key="search" onSearch={handleSearch} isLoading={isLoading} />
            )}
            
            {/* Direct Client flow: DirectClientStep → Analyze → Pitch → Send */}
            {campaignType === "direct_client" && currentStep === 'search' && (
              <DirectClientStep key="direct-client" onSubmit={handleDirectClient} isLoading={isLoading} />
            )}
            
            {/* Investor flow: InvestorSearchStep → Select → Analyze → Pitch → Send */}
            {campaignType === "investor" && currentStep === 'search' && (
              <InvestorSearchStep key="investor-search" onSubmit={handleInvestorSearch} isLoading={isLoading} />
            )}
            
            {currentStep === 'select' && (
              <SelectStep key="select" businesses={businesses} onSelect={handleSelect} onBack={() => setCurrentStep('search')} />
            )}
            {currentStep === 'analyze' && (
              <AnalyzeStep
                key="analyze"
                businesses={selectedBusinesses}
                analyses={analyses}
                isAnalyzing={isAnalyzing}
                progress={analysisProgress}
                currentBusiness={currentAnalyzing}
                onStartAnalysis={handleStartAnalysis}
                onContinue={handleAnalysisContinue}
                onBack={() => {
                  if (campaignType === "direct_client") setCurrentStep('search');
                  else setCurrentStep('select');
                }}
              />
            )}
            {currentStep === 'pitch' && (
              <PitchStep
                key="pitch"
                businesses={selectedBusinesses}
                pitches={pitches}
                isGenerating={false}
                onUpdatePitch={handleUpdatePitch}
                onRegeneratePitch={handleRegeneratePitch}
                onContinue={handlePitchContinue}
                onBack={() => setCurrentStep('analyze')}
              />
            )}
            {currentStep === 'send' && (
              <SendStep
                key="send"
                businesses={selectedBusinesses}
                pitches={pitches}
                campaignId={campaignId}
                onSend={handleSend}
                onBack={() => setCurrentStep('pitch')}
                isSending={isSending}
                sendProgress={sendProgress}
                sentCount={sentCount}
                queuedCount={queuedCount}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
