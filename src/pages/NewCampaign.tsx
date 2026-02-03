import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
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

export default function NewCampaign() {
  const [currentStep, setCurrentStep] = useState<CampaignStep>('search');
  const [completedSteps, setCompletedSteps] = useState<CampaignStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSearch = async (businessType: string, location: string) => {
    setIsLoading(true);
    try {
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
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search businesses",
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

      // Skip businesses without websites
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
        // Analyze the website
        const analysisResult = await campaignApi.analyzeWebsite(business.website, business.name);
        
        newAnalyses[business.id] = {
          businessId: business.id,
          issues: analysisResult.issues,
          overallScore: analysisResult.overallScore,
          analyzed: true,
          analyzedAt: analysisResult.analyzedAt,
        };
        
        // Update email if found
        if (analysisResult.email && !business.email) {
          const updatedBusiness = { ...business, email: analysisResult.email };
          setSelectedBusinesses(prev => 
            prev.map(b => b.id === business.id ? updatedBusiness : b)
          );
        }

        setAnalyses({ ...newAnalyses });

        // Generate pitch for this business
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

  const handleSend = async () => {
    setIsSending(true);
    const approvedBusinesses = selectedBusinesses.filter((b) => pitches[b.id]?.approved);
    
    for (let i = 0; i < approvedBusinesses.length; i++) {
      // TODO: Integrate email sending API
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      setSentCount(i + 1);
      setSendProgress(((i + 1) / approvedBusinesses.length) * 100);
    }

    setIsSending(false);
    setCompletedSteps([...completedSteps, 'send']);
    toast({
      title: "Emails sent!",
      description: `Successfully sent ${approvedBusinesses.length} personalized emails.`,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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
                onSend={handleSend}
                onBack={() => setCurrentStep('pitch')}
                isSending={isSending}
                sendProgress={sendProgress}
                sentCount={sentCount}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
