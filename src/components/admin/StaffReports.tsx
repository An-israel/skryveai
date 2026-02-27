import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2, Eye, ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from "lucide-react";

interface StaffReport {
  id: string;
  user_id: string;
  report_type: string;
  report_period: string;
  role: string;
  metrics: Record<string, string | number>;
  highlights: string | null;
  blockers: string | null;
  notes: string | null;
  created_at: string;
}

interface StaffReportsProps {
  userRole: string;
  isSuperAdmin: boolean;
}

function MetricChange({ current, previous, suffix = "" }: { current: string | number; previous?: string | number; suffix?: string }) {
  if (previous === undefined || previous === null) return <span>{String(current)}{suffix}</span>;
  
  const cur = typeof current === "string" ? parseFloat(current) : current;
  const prev = typeof previous === "string" ? parseFloat(previous) : previous;
  
  if (isNaN(cur) || isNaN(prev)) return <span>{String(current)}{suffix}</span>;
  
  const diff = cur - prev;
  const pctChange = prev !== 0 ? ((diff / prev) * 100).toFixed(0) : diff > 0 ? "∞" : "0";
  
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold">{String(current)}{suffix}</span>
      {diff > 0 && (
        <span className="text-green-600 text-xs flex items-center">
          <ArrowUpRight className="w-3 h-3" />+{pctChange}%
        </span>
      )}
      {diff < 0 && (
        <span className="text-red-500 text-xs flex items-center">
          <ArrowDownRight className="w-3 h-3" />{pctChange}%
        </span>
      )}
      {diff === 0 && (
        <span className="text-muted-foreground text-xs flex items-center">
          <Minus className="w-3 h-3" />0%
        </span>
      )}
    </div>
  );
}

const METRIC_LABELS: Record<string, string> = {
  new_signups: "New Signups",
  cost_per_signup: "Cost Per Signup (₦)",
  ad_spend: "Ad Spend (₦)",
  engagement_rate: "Engagement Rate",
  posts_published: "Posts Published",
  activation_rate: "Activation Rate",
  conversions: "Free→Paid Conversions",
  reply_rate: "Reply Rate",
  testimonials_collected: "Testimonials Collected",
};

export function StaffReports({ userRole, isSuperAdmin }: StaffReportsProps) {
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReport, setSelectedReport] = useState<StaffReport | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareReportId, setCompareReportId] = useState<string>("");
  const { toast } = useToast();

  // Form state
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return weekStart.toISOString().split("T")[0];
  });
  const [highlights, setHighlights] = useState("");
  const [blockers, setBlockers] = useState("");
  const [notes, setNotes] = useState("");

  // Marketing metrics
  const [newSignups, setNewSignups] = useState("");
  const [costPerSignup, setCostPerSignup] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  const [postsPublished, setPostsPublished] = useState("");

  // CS metrics
  const [activationRate, setActivationRate] = useState("");
  const [conversions, setConversions] = useState("");
  const [replyRate, setReplyRate] = useState("");
  const [testimonials, setTestimonials] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setReports((data as StaffReport[]) || []);
    setLoading(false);
  };

  // Find previous report for the same role (for comparison)
  const getPreviousReport = (report: StaffReport): StaffReport | undefined => {
    const idx = reports.findIndex(r => r.id === report.id);
    // Find the next report in the list (older) with the same role
    return reports.slice(idx + 1).find(r => r.role === report.role);
  };

  const compareReport = useMemo(() => {
    if (!compareReportId) return undefined;
    return reports.find(r => r.id === compareReportId);
  }, [compareReportId, reports]);

  // Reports for comparison dropdown (same role, different period)
  const comparableReports = useMemo(() => {
    if (!selectedReport) return [];
    return reports.filter(r => r.id !== selectedReport.id && r.role === selectedReport.role);
  }, [selectedReport, reports]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const metrics: Record<string, string | number> =
        userRole === "content_editor"
          ? {
              new_signups: Number(newSignups) || 0,
              cost_per_signup: Number(costPerSignup) || 0,
              ad_spend: Number(adSpend) || 0,
              engagement_rate: engagementRate,
              posts_published: Number(postsPublished) || 0,
            }
          : {
              activation_rate: activationRate,
              conversions: Number(conversions) || 0,
              reply_rate: replyRate,
              testimonials_collected: Number(testimonials) || 0,
            };

      const { error } = await supabase.from("staff_reports").insert({
        user_id: user.id,
        report_type: "weekly",
        report_period: period,
        role: userRole,
        metrics,
        highlights: highlights || null,
        blockers: blockers || null,
        notes: notes || null,
      });

      if (error) throw error;

      toast({ title: "Report submitted!" });
      setShowDialog(false);
      resetForm();
      loadReports();
    } catch (error) {
      toast({
        title: "Failed to submit report",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setHighlights("");
    setBlockers("");
    setNotes("");
    setNewSignups("");
    setCostPerSignup("");
    setAdSpend("");
    setEngagementRate("");
    setPostsPublished("");
    setActivationRate("");
    setConversions("");
    setReplyRate("");
    setTestimonials("");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Weekly Reports</CardTitle>
            <CardDescription>
              {isSuperAdmin ? "All staff weekly reports — click a row to view details & compare" : "Submit your weekly performance report"}
            </CardDescription>
          </div>
          {!isSuperAdmin && (
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> New Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit Weekly Report</DialogTitle>
                  <DialogDescription>
                    {userRole === "content_editor" ? "Marketing Manager" : "Customer Success"} — Week of {period}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Report Week Starting</Label>
                    <Input type="date" value={period} onChange={(e) => setPeriod(e.target.value)} />
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-3">Key Metrics</p>
                    {userRole === "content_editor" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">New Signups</Label>
                          <Input type="number" value={newSignups} onChange={(e) => setNewSignups(e.target.value)} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cost Per Signup (₦)</Label>
                          <Input type="number" value={costPerSignup} onChange={(e) => setCostPerSignup(e.target.value)} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Ad Spend (₦)</Label>
                          <Input type="number" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Engagement Rate</Label>
                          <Input value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)} placeholder="e.g. 4.2%" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Posts Published</Label>
                          <Input type="number" value={postsPublished} onChange={(e) => setPostsPublished(e.target.value)} placeholder="0" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Activation Rate</Label>
                          <Input value={activationRate} onChange={(e) => setActivationRate(e.target.value)} placeholder="e.g. 65%" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Free→Paid Conversions</Label>
                          <Input type="number" value={conversions} onChange={(e) => setConversions(e.target.value)} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Reply Rate</Label>
                          <Input value={replyRate} onChange={(e) => setReplyRate(e.target.value)} placeholder="e.g. 55%" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Testimonials Collected</Label>
                          <Input type="number" value={testimonials} onChange={(e) => setTestimonials(e.target.value)} placeholder="0" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Highlights / Wins</Label>
                    <Textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="What went well this week?" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Blockers / Issues</Label>
                    <Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder="Any blockers or problems?" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else to note..." rows={2} />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Submit Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No reports submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Key Metrics</TableHead>
                  <TableHead>Highlights</TableHead>
                  <TableHead>Blockers</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const prev = getPreviousReport(report);
                  return (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedReport(report);
                        setCompareMode(false);
                        setCompareReportId(prev?.id || "");
                      }}
                    >
                      <TableCell className="font-medium">{report.report_period}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.role === "content_editor" ? "Marketing" : report.role === "support_agent" ? "Customer Success" : report.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(report.metrics || {}).slice(0, 3).map(([key, val]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key.replace(/_/g, " ")}: {String(val)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">{report.highlights || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">{report.blockers || "—"}</TableCell>
                      <TableCell className="text-sm">{new Date(report.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Weekly Report — {selectedReport.report_period}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="outline" className="mr-2">
                    {selectedReport.role === "content_editor" ? "Marketing Manager" : selectedReport.role === "support_agent" ? "Customer Success" : selectedReport.role}
                  </Badge>
                  Submitted {new Date(selectedReport.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              {/* Compare toggle */}
              {comparableReports.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Compare with:</span>
                  <Select
                    value={compareReportId}
                    onValueChange={(val) => {
                      setCompareReportId(val);
                      setCompareMode(!!val);
                    }}
                  >
                    <SelectTrigger className="w-[220px] h-8">
                      <SelectValue placeholder="Select a past week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No comparison</SelectItem>
                      {comparableReports.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          Week of {r.report_period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Metrics Grid */}
              <div>
                <p className="text-sm font-semibold mb-3">Key Metrics</p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedReport.metrics || {}).map(([key, val]) => (
                    <div key={key} className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">{METRIC_LABELS[key] || key.replace(/_/g, " ")}</p>
                      {compareMode && compareReport ? (
                        <MetricChange
                          current={val}
                          previous={compareReport.metrics?.[key]}
                        />
                      ) : (
                        <p className="font-semibold text-lg">{String(val)}</p>
                      )}
                      {compareMode && compareReport && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Previous: {String(compareReport.metrics?.[key] ?? "N/A")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Highlights */}
              <div>
                <p className="text-sm font-semibold mb-2">✨ Highlights / Wins</p>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.highlights || "No highlights reported."}</p>
                </div>
                {compareMode && compareReport && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground mb-1">Previous week:</p>
                    <p className="text-sm whitespace-pre-wrap">{compareReport.highlights || "No highlights."}</p>
                  </div>
                )}
              </div>

              {/* Blockers */}
              <div>
                <p className="text-sm font-semibold mb-2">🚫 Blockers / Issues</p>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.blockers || "No blockers reported."}</p>
                </div>
                {compareMode && compareReport && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground mb-1">Previous week:</p>
                    <p className="text-sm whitespace-pre-wrap">{compareReport.blockers || "No blockers."}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(selectedReport.notes || (compareMode && compareReport?.notes)) && (
                <div>
                  <p className="text-sm font-semibold mb-2">📝 Additional Notes</p>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.notes || "No notes."}</p>
                  </div>
                  {compareMode && compareReport?.notes && (
                    <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">Previous week:</p>
                      <p className="text-sm whitespace-pre-wrap">{compareReport.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
