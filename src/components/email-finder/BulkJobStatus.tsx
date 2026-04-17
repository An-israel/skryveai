import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Job {
  id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  found_count: number;
  progress: number;
  results: { input: any; result: { email: string | null; confidence: number; emailConfidence: string }; success: boolean }[];
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Props {
  jobId: string;
}

export function BulkJobStatus({ jobId }: Props) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchJob = async () => {
      const { data } = await supabase
        .from("email_finder_jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (mounted && data) setJob(data as unknown as Job);
    };
    fetchJob();

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "email_finder_jobs", filter: `id=eq.${jobId}` },
        (payload) => {
          if (mounted) setJob(payload.new as unknown as Job);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  if (!job) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading job…</p>
        </CardContent>
      </Card>
    );
  }

  const downloadCsv = () => {
    const rows = [
      ["First Name", "Last Name", "Domain", "Company", "Email", "Confidence", "Confidence Label", "Success"],
      ...job.results.map((r) => [
        r.input.firstName || "",
        r.input.lastName || "",
        r.input.domain || "",
        r.input.company || "",
        r.result?.email || "",
        r.result?.confidence ?? "",
        r.result?.emailConfidence || "",
        r.success ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-finder-${job.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDone = job.status === "completed";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Bulk job · {job.id.slice(0, 8)}</CardTitle>
          <Badge variant={isDone ? "default" : "secondary"} className="capitalize">
            {isDone ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{job.processed_rows} / {job.total_rows} rows</span>
            <span className="text-muted-foreground">{job.progress}%</span>
          </div>
          <Progress value={job.progress} />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-2xl font-bold">{job.total_rows}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10">
            <p className="text-2xl font-bold text-emerald-500">{job.found_count}</p>
            <p className="text-xs text-muted-foreground">Found</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10">
            <p className="text-2xl font-bold text-orange-500">{job.processed_rows - job.found_count}</p>
            <p className="text-xs text-muted-foreground">Missed</p>
          </div>
        </div>

        {job.error_message && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p>{job.error_message}</p>
          </div>
        )}

        {isDone && (
          <Button onClick={downloadCsv} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download CSV ({job.results.length} rows)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
