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
import type { Business, WebsiteAnalysis, GeneratedPitch, CampaignStep } from "@/types/campaign";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { campaignApi } from "@/lib/api/campaign";
import type { UserSettings } from "@/components/settings/EmailSettingsDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Briefcase, User, Mail } from "lucide-react";

interface ProfileStatus {
  hasBio: boolean;
  hasExpertise: boolean;
  hasCv: boolean;
  hasGmail: boolean;
  isComplete: boolean;
}

export default function NewCampaign() {
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
      
      // Check profile completion and Gmail connection in parallel
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
        isComplete: hasBio && hasExpertise && hasCv && hasGmail,
      });
      setCheckingProfile(false);
    };
    checkAuth();
  }, [navigate]);

  const handleSearch = async (businessType: string, location: string) => {
    setIsLoading(true);
    setSearchParams({ businessType, location });
    try {
      // Ensure we have a fresh session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const result = await campaignApi.searchBusinesses(businessType, location);
      setBusinesses(result.businesses);
      setCompletedSteps([...completedSteps, 'search']);
      setCurrentStep('select');
      toast({
        title: "Search Complete",
        description: `Found ${result.total} businesses matching your criteria.`,
      });
    } catch (error) {
      console.error("Search error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to search businesses";
      
      // If it's an auth error, redirect to login
      if (errorMessage.includes("Session expired") || errorMessage.includes("log in")) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
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
          issues: [{ 
            category: 'design', 
            severity: 'high', 
            title: 'No Website Found', 
            description: 'This business doesn\'t have a website listed' 
          }],
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
          setSelectedBusinesses(prev => 
            prev.map(b => b.id === business.id ? updatedBusiness : b)
          );
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
          issues: [{ 
            category: 'performance', 
            severity: 'medium', 
            title: 'Analysis Failed', 
            description: 'Could not analyze website - it may be offline or blocking scrapers' 
          }],
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

    toast({
      title: "Analysis Complete",
      description: `Analyzed ${selectedBusinesses.length} websites and generated pitches.`,
    });
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
        const pitchResult = await campaignApi.generatePitch(
          business.name,
          business.website,
          analysis.issues
        );
        
        setPitches({ 
          ...pitches, 
          [businessId]: {
            businessId,
            subject: pitchResult.subject,
            body: pitchResult.body,
            edited: false,
            approved: false,
          }
        });
        toast({ title: "Pitch regenerated" });
      } catch (error) {
        toast({ 
          title: "Regeneration failed", 
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive" 
        });
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

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create campaign record
      const campaignName = `${searchParams.businessType} in ${searchParams.location}`;
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: campaignName,
          business_type: searchParams.businessType,
          location: searchParams.location,
          status: "sending",
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setCampaignId(campaign.id);

      // Insert businesses into database
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

      // Create pitch records and queue emails
      for (let i = 0; i < approvedBusinesses.length; i++) {
        const business = approvedBusinesses[i];
        const pitch = pitches[business.id];
        const dbBusiness = insertedBusinesses?.find(b => b.name === business.name);
        
        if (!dbBusiness || !pitch) continue;

        // Create pitch record
        const { data: pitchRecord, error: pitchError } = await supabase
          .from("pitches")
          .insert({
            business_id: dbBusiness.id,
            subject: pitch.subject,
            body: pitch.body,
            edited: pitch.edited,
            approved: true,
          })
          .select()
          .single();

        if (pitchError) {
          console.error("Error creating pitch:", pitchError);
          continue;
        }

        // Calculate scheduled time with delay
        const scheduledFor = new Date(Date.now() + (i * delaySeconds * 1000));

        // Queue the email
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

        if (queueError) {
          console.error("Error queuing email:", queueError);
          continue;
        }

        setSentCount(i + 1);
        setSendProgress(((i + 1) / approvedBusinesses.length) * 100);
      }

      setQueuedCount(approvedBusinesses.length);
      setIsSending(false);
      setCompletedSteps([...completedSteps, 'send']);
      
      toast({
        title: "Emails Scheduled!",
        description: `${approvedBusinesses.length} emails queued with ${delaySeconds}s delays.`,
      });

      // Trigger queue processing
      supabase.functions.invoke("process-email-queue").catch(console.error);

    } catch (error) {
      console.error("Send error:", error);
      setIsSending(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule emails",
        variant: "destructive",
      });
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

  // Show profile completion requirement if not complete
  if (!profileStatus.isComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={true} onLogout={handleLogout} />
        
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-warning/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-warning/10">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <CardTitle>Complete Your Profile First</CardTitle>
                    <CardDescription>
                      To create personalized pitches, we need some information about you
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Our AI uses your profile information to craft personalized outreach emails that highlight your unique skills and experience.
                </p>
                
                <div className="space-y-3 py-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasExpertise ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <Briefcase className={`w-5 h-5 ${profileStatus.hasExpertise ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-medium">Expertise</p>
                      <p className="text-sm text-muted-foreground">Select the services you offer</p>
                    </div>
                    {profileStatus.hasExpertise ? (
                      <span className="text-success text-sm">✓ Complete</span>
                    ) : (
                      <span className="text-warning text-sm">Required</span>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasBio ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <User className={`w-5 h-5 ${profileStatus.hasBio ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-medium">Bio</p>
                      <p className="text-sm text-muted-foreground">Tell us about your experience</p>
                    </div>
                    {profileStatus.hasBio ? (
                      <span className="text-success text-sm">✓ Complete</span>
                    ) : (
                      <span className="text-warning text-sm">Required</span>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasCv ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <FileText className={`w-5 h-5 ${profileStatus.hasCv ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-medium">CV / Resume</p>
                      <p className="text-sm text-muted-foreground">Upload your CV for better pitches</p>
                    </div>
                    {profileStatus.hasCv ? (
                      <span className="text-success text-sm">✓ Complete</span>
                    ) : (
                      <span className="text-warning text-sm">Required</span>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileStatus.hasGmail ? 'bg-success/5 border-success/30' : 'bg-muted/50'}`}>
                    <Mail className={`w-5 h-5 ${profileStatus.hasGmail ? 'text-success' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-medium">Gmail Connection</p>
                      <p className="text-sm text-muted-foreground">Connect Gmail for email delivery</p>
                    </div>
                    {profileStatus.hasGmail ? (
                      <span className="text-success text-sm">✓ Connected</span>
                    ) : (
                      <span className="text-warning text-sm">Required</span>
                    )}
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

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} onLogout={handleLogout} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
        
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {currentStep === 'search' && (
              <SearchStep
                key="search"
                onSearch={handleSearch}
                isLoading={isLoading}
              />
            )}
            {currentStep === 'select' && (
              <SelectStep
                key="select"
                businesses={businesses}
                onSelect={handleSelect}
                onBack={() => setCurrentStep('search')}
              />
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
                onBack={() => setCurrentStep('select')}
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
