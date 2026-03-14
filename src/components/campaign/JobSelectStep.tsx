import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Building2, Globe, CheckCircle2, ShieldCheck, AlertTriangle, Mail, Search, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { JobListing } from "@/types/campaign";

interface JobSelectStepProps {
  jobs: JobListing[];
  onSelect: (selected: JobListing[]) => void;
  onBack: () => void;
  maxSelect?: number;
}

const platformColors: Record<string, string> = {
  LinkedIn: "bg-blue-500/10 text-blue-600 border-blue-200",
  Indeed: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  Glassdoor: "bg-green-500/10 text-green-600 border-green-200",
  Wellfound: "bg-orange-500/10 text-orange-600 border-orange-200",
  "Remote.co": "bg-purple-500/10 text-purple-600 border-purple-200",
  WeWorkRemotely: "bg-teal-500/10 text-teal-600 border-teal-200",
  Dice: "bg-red-500/10 text-red-600 border-red-200",
  ZipRecruiter: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Other: "bg-muted text-muted-foreground",
};

const confidenceBadge: Record<string, { label: string; className: string }> = {
  high: { label: "High", className: "bg-green-500/10 text-green-600 border-green-200" },
  medium: { label: "Medium", className: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  low: { label: "Low", className: "bg-red-500/10 text-red-600 border-red-200" },
};

const sourceLabel: Record<string, string> = {
  job_page: "From job listing",
  employer_site: "From company site",
  search_snippet: "From web search",
  none: "",
};

export function JobSelectStep({ jobs: initialJobs, onSelect, onBack, maxSelect = 50 }: JobSelectStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<JobListing[]>(initialJobs);
  const [searchingIds, setSearchingIds] = useState<Set<string>>(new Set());
  const [bulkSearching, setBulkSearching] = useState(false);

  const toggleJob = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxSelect) next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(jobs.slice(0, maxSelect).map((j) => j.id)));
  const deselectAll = () => setSelectedIds(new Set());
  const handleContinue = () => onSelect(jobs.filter((j) => selectedIds.has(j.id)));

  const handleFindEmail = async (e: React.MouseEvent, job: JobListing) => {
    e.stopPropagation();
    setSearchingIds((prev) => new Set(prev).add(job.id));

    try {
      const { data, error } = await supabase.functions.invoke("search-jobs", {
        body: {
          findEmailFor: job.company,
          jobUrl: job.url,
          jobTitle: job.jobTitle,
          jobDescription: job.description,
        },
      });

      if (error) throw error;

      if (data?.email) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  email: data.email,
                  emailVerified: data.emailVerified ?? false,
                  emailSource: data.emailSource ?? "search_snippet",
                  emailConfidence: data.emailConfidence ?? "low",
                  employerDomain: data.employerDomain ?? null,
                }
              : j
          )
        );
        toast({
          title: "Email found",
          description: `${data.email} (${data.emailConfidence || "unknown"} confidence)`,
        });
      } else {
        toast({
          title: "No email found",
          description: `Could not find a contact email for ${job.company}`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Find email error:", err);
      toast({ title: "Search failed", description: "Could not search for email.", variant: "destructive" });
    } finally {
      setSearchingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const showFindButton = (job: JobListing) =>
    !job.email || job.emailConfidence === "low" || !job.emailVerified;

  const jobsNeedingEmails = jobs.filter(showFindButton);

  const handleFindAllEmails = async () => {
    if (bulkSearching || jobsNeedingEmails.length === 0) return;
    setBulkSearching(true);
    let found = 0;
    const total = jobsNeedingEmails.length;
    const batchSize = 3;

    for (let i = 0; i < total; i += batchSize) {
      const batch = jobsNeedingEmails.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (job) => {
          setSearchingIds((prev) => new Set(prev).add(job.id));
          try {
            const { data, error } = await supabase.functions.invoke("search-jobs", {
              body: {
                findEmailFor: job.company,
                jobUrl: job.url,
                jobTitle: job.jobTitle,
                jobDescription: job.description,
              },
            });
            if (!error && data?.email) {
              found++;
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === job.id
                    ? {
                        ...j,
                        email: data.email,
                        emailVerified: data.emailVerified ?? false,
                        emailSource: data.emailSource ?? "search_snippet",
                        emailConfidence: data.emailConfidence ?? "low",
                        employerDomain: data.employerDomain ?? null,
                      }
                    : j
                )
              );
            }
          } catch (err) {
            console.error("Bulk find email error for", job.company, err);
          } finally {
            setSearchingIds((prev) => {
              const next = new Set(prev);
              next.delete(job.id);
              return next;
            });
          }
        })
      );
    }

    setBulkSearching(false);
    toast({
      title: "Bulk email search complete",
      description: `Found ${found} of ${total} emails`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Select Jobs to Apply</h2>
          <p className="text-muted-foreground">
            {selectedIds.size} of {jobs.length} jobs selected (max {maxSelect})
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
          {jobsNeedingEmails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFindAllEmails}
              disabled={bulkSearching}
              className="gap-1.5"
            >
              {bulkSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Finding Emails…
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <Search className="w-3.5 h-3.5 -ml-1" />
                  Find All Emails ({jobsNeedingEmails.length})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedIds.has(job.id) ? "border-primary ring-1 ring-primary/30" : ""
              }`}
              onClick={() => toggleJob(job.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(job.id)}
                    onCheckedChange={() => toggleJob(job.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base truncate">{job.jobTitle}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{job.company}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={platformColors[job.platform] || platformColors.Other}>
                        {job.platform}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {job.postedDate}
                      </span>
                    </div>

                    {/* Email display with confidence */}
                    {job.email ? (
                      <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{job.email}</span>
                        {job.emailVerified ? (
                          <span className="inline-flex items-center gap-0.5 text-green-600">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-yellow-600">
                            <AlertTriangle className="w-3 h-3" />
                            Unverified
                          </span>
                        )}
                        {job.emailConfidence && confidenceBadge[job.emailConfidence] && (
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${confidenceBadge[job.emailConfidence].className}`}>
                            {confidenceBadge[job.emailConfidence].label}
                          </Badge>
                        )}
                        {job.emailSource && sourceLabel[job.emailSource] && (
                          <span className="text-[10px] text-muted-foreground">
                            · {sourceLabel[job.emailSource]}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* Find / Re-find email button */}
                    {showFindButton(job) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs gap-1.5"
                        disabled={searchingIds.has(job.id)}
                        onClick={(e) => handleFindEmail(e, job)}
                      >
                        {searchingIds.has(job.id) ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Searching…
                          </>
                        ) : job.email ? (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Re-find Email
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            Find Email
                          </>
                        )}
                      </Button>
                    )}

                    {job.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    )}
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View original posting
                      </a>
                    )}
                  </div>
                  {selectedIds.has(job.id) && (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={selectedIds.size === 0}>
          Generate Applications ({selectedIds.size})
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
