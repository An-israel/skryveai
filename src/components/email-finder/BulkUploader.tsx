import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_ROWS = 100;

interface Props {
  onJobCreated: (jobId: string) => void;
}

type Row = Record<string, string>;

export function BulkUploader({ onJobCreated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    firstName: "",
    lastName: "",
    domain: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (file: File) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as Row[]).slice(0, MAX_ROWS);
        const fields = results.meta.fields || [];
        setRows(parsed);
        setHeaders(fields);
        // Auto-detect column names
        const auto: typeof mapping = { firstName: "", lastName: "", domain: "", company: "" };
        for (const f of fields) {
          const lower = f.toLowerCase().trim();
          if (!auto.firstName && /first.?name|fname|given/.test(lower)) auto.firstName = f;
          if (!auto.lastName && /last.?name|lname|surname|family/.test(lower)) auto.lastName = f;
          if (!auto.domain && /domain|website|url|site/.test(lower)) auto.domain = f;
          if (!auto.company && /company|organization|employer|business/.test(lower)) auto.company = f;
        }
        setMapping(auto);
      },
      error: (err) => toast.error(`CSV parse failed: ${err.message}`),
    });
  };

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    if (!mapping.domain && !mapping.company) {
      toast.error("Map at least the domain or company column");
      return;
    }
    setSubmitting(true);
    try {
      const searches = rows.map((r) => ({
        firstName: mapping.firstName ? r[mapping.firstName] : undefined,
        lastName: mapping.lastName ? r[mapping.lastName] : undefined,
        domain: mapping.domain ? r[mapping.domain] : undefined,
        website: mapping.domain ? r[mapping.domain] : undefined,
        company: mapping.company ? r[mapping.company] : undefined,
      }));

      const { data, error } = await supabase.functions.invoke("email-finder-bulk", {
        body: { searches },
      });
      if (error) throw error;
      toast.success(`Job started: ${searches.length} rows queued`);
      onJobCreated(data.jobId);
      // Reset
      setRows([]);
      setHeaders([]);
      setMapping({ firstName: "", lastName: "", domain: "", company: "" });
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk email finder</CardTitle>
        <CardDescription>
          Upload a CSV with company domains, names, or both. We'll process up to {MAX_ROWS} rows in
          the background and update progress in real time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-medium">Drop a CSV or click to upload</p>
            <p className="text-sm text-muted-foreground mt-1">First row should be column headers</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">{rows.length} rows loaded</p>
                <p className="text-xs text-muted-foreground">{headers.length} columns detected</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setHeaders([]); }}>
                Clear
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Map your columns</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColumnMapper label="First name" value={mapping.firstName} headers={headers} onChange={(v) => setMapping({ ...mapping, firstName: v })} />
                <ColumnMapper label="Last name" value={mapping.lastName} headers={headers} onChange={(v) => setMapping({ ...mapping, lastName: v })} />
                <ColumnMapper label="Domain / Website *" value={mapping.domain} headers={headers} onChange={(v) => setMapping({ ...mapping, domain: v })} />
                <ColumnMapper label="Company name" value={mapping.company} headers={headers} onChange={(v) => setMapping({ ...mapping, company: v })} />
              </div>
            </div>

            {rows.length >= MAX_ROWS && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Capped at {MAX_ROWS} rows per job. Split larger files.</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSubmit} disabled={submitting || (!mapping.domain && !mapping.company)} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitting ? "Starting…" : `Find ${rows.length} emails`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ColumnMapper({ label, value, headers, onChange }: { label: string; value: string; headers: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="— skip —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— skip —</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
