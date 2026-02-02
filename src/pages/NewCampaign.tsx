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

// Mock data for demo purposes (will be replaced with real API calls)
function generateMockBusinesses(type: string, location: string): Business[] {
  const names = [
    `${type} Pro`, `Elite ${type}`, `${location} ${type}`, `Premier ${type}`,
    `${type} Plus`, `Best ${type}`, `Top ${type}`, `${type} Masters`,
    `Quality ${type}`, `${type} Experts`, `The ${type} Co`, `${type} Hub`,
    `Local ${type}`, `${type} Direct`, `${type} Central`, `Metro ${type}`,
    `${type} Works`, `${type} Solutions`, `${type} Group`, `Prime ${type}`,
    `${type} Nation`, `${type} First`, `City ${type}`, `${type} One`,
    `${type} Pros`, `Superior ${type}`, `${type} Connect`, `Express ${type}`,
    `${type} Now`, `Smart ${type}`
  ];

  return names.map((name, i) => ({
    id: `business-${i}`,
    name,
    address: `${100 + i * 12} Main Street, ${location}`,
    phone: `(555) ${100 + i}-${1000 + i}`,
    website: `www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    reviewCount: Math.floor(10 + Math.random() * 200),
    category: type,
  }));
}

function generateMockAnalysis(businessId: string): WebsiteAnalysis {
  const issues = [
    { category: 'seo' as const, severity: 'high' as const, title: 'Missing Meta Description', description: 'No meta description found, hurting search visibility' },
    { category: 'seo' as const, severity: 'medium' as const, title: 'No H1 Tag', description: 'Primary heading is missing from the page' },
    { category: 'performance' as const, severity: 'high' as const, title: 'Slow Page Load', description: 'Page takes over 4 seconds to load' },
    { category: 'design' as const, severity: 'medium' as const, title: 'Not Mobile Responsive', description: 'Website doesn\'t adapt to mobile screens' },
    { category: 'copywriting' as const, severity: 'low' as const, title: 'Weak Headlines', description: 'Headlines lack compelling value propositions' },
    { category: 'cta' as const, severity: 'high' as const, title: 'No Clear CTA', description: 'Missing call-to-action buttons' },
    { category: 'social' as const, severity: 'low' as const, title: 'Missing Social Links', description: 'No social media presence linked' },
  ];

  const selectedIssues = issues.filter(() => Math.random() > 0.4);
  
  return {
    businessId,
    issues: selectedIssues.slice(0, Math.floor(2 + Math.random() * 4)),
    overallScore: Math.round(40 + Math.random() * 40),
    analyzed: true,
    analyzedAt: new Date().toISOString(),
  };
}

function generateMockPitch(business: Business, analysis: WebsiteAnalysis): GeneratedPitch {
  const topIssue = analysis.issues[0];
  
  return {
    businessId: business.id,
    subject: `Quick win for ${business.name}'s website`,
    body: `Hi there,

I came across ${business.name}'s website and noticed a few areas where I could help improve your online presence.

Specifically, I noticed ${topIssue?.title.toLowerCase() || 'some optimization opportunities'} that could be affecting your visibility and customer conversions.

I specialize in helping ${business.category?.toLowerCase() || 'businesses'} improve their websites to attract more customers. I'd love to share a few quick recommendations - no strings attached.

Would you have 15 minutes this week for a quick call?

Best regards`,
    approved: false,
    edited: false,
  };
}

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
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1500));
    const results = generateMockBusinesses(businessType, location);
    setBusinesses(results);
    setIsLoading(false);
    setCompletedSteps([...completedSteps, 'search']);
    setCurrentStep('select');
  };

  const handleSelect = (selected: Business[]) => {
    setSelectedBusinesses(selected);
    setCompletedSteps([...completedSteps, 'select']);
    setCurrentStep('analyze');
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    const newAnalyses: Record<string, WebsiteAnalysis> = {};

    for (let i = 0; i < selectedBusinesses.length; i++) {
      const business = selectedBusinesses[i];
      setCurrentAnalyzing(business.name);
      setAnalysisProgress((i / selectedBusinesses.length) * 100);
      
      // Simulate analysis time
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
      
      newAnalyses[business.id] = generateMockAnalysis(business.id);
      setAnalyses({ ...newAnalyses });
    }

    setAnalysisProgress(100);
    setCurrentAnalyzing(undefined);
    setIsAnalyzing(false);

    // Auto-generate pitches
    const newPitches: Record<string, GeneratedPitch> = {};
    for (const business of selectedBusinesses) {
      newPitches[business.id] = generateMockPitch(business, newAnalyses[business.id]);
    }
    setPitches(newPitches);

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
    if (business && analysis) {
      await new Promise((r) => setTimeout(r, 500));
      const newPitch = generateMockPitch(business, analysis);
      setPitches({ ...pitches, [businessId]: { ...newPitch, body: newPitch.body + "\n\n(Regenerated)" } });
      toast({ title: "Pitch regenerated" });
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
