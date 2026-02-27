import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2 } from "lucide-react";

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

export function StaffReports({ userRole, isSuperAdmin }: StaffReportsProps) {
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Weekly Reports</CardTitle>
          <CardDescription>
            {isSuperAdmin ? "All staff weekly reports" : "Submit your weekly performance report"}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
