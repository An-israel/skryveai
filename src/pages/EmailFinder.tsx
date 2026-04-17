import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailSearchForm, type SearchInput } from "@/components/email-finder/EmailSearchForm";
import { EmailResultCard, type EmailFinderResult } from "@/components/email-finder/EmailResultCard";
import { BulkUploader } from "@/components/email-finder/BulkUploader";
import { BulkJobStatus } from "@/components/email-finder/BulkJobStatus";
import { VerifyForm } from "@/components/email-finder/VerifyForm";
import { SearchHistory } from "@/components/email-finder/SearchHistory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Search, ShieldCheck, Upload, History } from "lucide-react";

export default function EmailFinder() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailFinderResult | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const handleSearch = async (input: SearchInput) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("email-finder-search", { body: input });
      if (error) throw error;
      setResult(data as EmailFinderResult);
      if (!data?.email) toast.warning("No email found — try a different domain or add a name.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free Email Finder Tool — SkryveAI"
        description="Find any business email by domain or company name. Free email finder with AI-powered pattern detection, MX verification, and bulk CSV processing."
        keywords="email finder, find email by domain, free email finder tool, email lookup, bulk email finder, email verifier"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Mail className="h-3.5 w-3.5" />
            Free AI Tool
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Email Finder</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover and verify business emails. AI-powered pattern detection across the open web — no Hunter or Apollo subscription needed.
          </p>
        </div>

        <Tabs defaultValue="find" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-auto">
            <TabsTrigger value="find" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2"><Search className="h-4 w-4" /><span className="text-xs sm:text-sm">Find</span></TabsTrigger>
            <TabsTrigger value="bulk" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2"><Upload className="h-4 w-4" /><span className="text-xs sm:text-sm">Bulk</span></TabsTrigger>
            <TabsTrigger value="verify" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2"><ShieldCheck className="h-4 w-4" /><span className="text-xs sm:text-sm">Verify</span></TabsTrigger>
            <TabsTrigger value="history" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2"><History className="h-4 w-4" /><span className="text-xs sm:text-sm">History</span></TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="space-y-4">
            <EmailSearchForm onSearch={handleSearch} loading={loading} />
            {result && <EmailResultCard result={result} />}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <BulkUploader onJobCreated={setActiveJobId} />
            {activeJobId && <BulkJobStatus jobId={activeJobId} />}
          </TabsContent>

          <TabsContent value="verify">
            <VerifyForm />
          </TabsContent>

          <TabsContent value="history">
            <SearchHistory />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
