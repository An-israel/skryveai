import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Mail, 
  RefreshCw, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Trash2,
  RotateCcw,
  Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface QueuedEmail {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  scheduled_for: string;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  campaign_id: string;
  sender_name: string | null;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export function EmailQueueManager() {
  const [emails, setEmails] = useState<QueuedEmail[]>([]);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQueue();
    // Refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      // Get queue stats
      const { data: statsData } = await supabase
        .from("email_queue")
        .select("status");
      
      if (statsData) {
        const newStats = { pending: 0, processing: 0, sent: 0, failed: 0 };
        statsData.forEach((e) => {
          if (e.status in newStats) {
            newStats[e.status as keyof QueueStats]++;
          }
        });
        setStats(newStats);
      }

      // Get recent emails
      const { data: emailsData, error } = await supabase
        .from("email_queue")
        .select("*")
        .order("scheduled_for", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEmails(emailsData || []);
    } catch (error) {
      console.error("Failed to load email queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-email-queue");
      
      if (error) throw error;

      toast({
        title: "Queue Processing Complete",
        description: `Processed ${data?.processed || 0} emails. Success: ${data?.success || 0}, Failed: ${data?.failed || 0}`,
      });

      loadQueue();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to process queue";
      toast({ title: message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const retryFailed = async () => {
    try {
      const { error } = await supabase
        .from("email_queue")
        .update({ status: "pending", error_message: null, processed_at: null })
        .eq("status", "failed");

      if (error) throw error;

      toast({ title: "Failed emails reset to pending" });
      loadQueue();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to retry emails";
      toast({ title: message, variant: "destructive" });
    }
  };

  const deleteProcessed = async () => {
    if (!confirm("Delete all sent emails from the queue?")) return;
    
    try {
      const { error } = await supabase
        .from("email_queue")
        .delete()
        .eq("status", "sent");

      if (error) throw error;

      toast({ title: "Processed emails deleted" });
      loadQueue();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete emails";
      toast({ title: message, variant: "destructive" });
    }
  };

  const notifyAdmins = async () => {
    if (stats.failed === 0) {
      toast({ title: "No failed emails to report" });
      return;
    }
    
    setNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-admin-failed-emails");
      
      if (error) throw error;

      toast({
        title: "Admin Notification Sent",
        description: `Notified ${data?.notifiedAdmins || 0} admin(s) about ${data?.failedCount || 0} failed emails`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send notification";
      toast({ title: message, variant: "destructive" });
    } finally {
      setNotifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "processing":
        return <Badge variant="default" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing</Badge>;
      case "sent":
        return <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3" /> Sent</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Loader2 className="w-4 h-4" />
              <span className="text-xs">Processing</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.processing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">Sent</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Failed</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Queue
            </CardTitle>
            <CardDescription>
              Manage and process queued emails. The cron job runs every 2 minutes automatically.
            </CardDescription>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadQueue}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {stats.failed > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={retryFailed}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Failed ({stats.failed})
                  </Button>
                  <Button variant="outline" size="sm" onClick={notifyAdmins} disabled={notifying}>
                    {notifying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4 mr-2" />
                    )}
                    Notify Admins
                  </Button>
                </>
              )}
              {stats.sent > 0 && (
                <Button variant="outline" size="sm" onClick={deleteProcessed}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Sent
                </Button>
              )}
              <Button onClick={processQueue} disabled={processing || stats.pending === 0}>
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Process Now ({stats.pending})
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No emails in queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {email.to_email}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {email.subject}
                    </TableCell>
                    <TableCell>{email.sender_name || "Default"}</TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(email.scheduled_for), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-destructive text-xs">
                      {email.error_message || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
