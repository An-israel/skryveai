import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Send,
  Play
} from "lucide-react";
import { useEmailQueueRealtime } from "@/hooks/use-email-queue-realtime";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface EmailQueueStatusProps {
  campaignId?: string;
}

export function EmailQueueStatus({ campaignId }: EmailQueueStatusProps) {
  const { emails, stats, loading } = useEmailQueueRealtime(campaignId);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  const totalEmails = stats.pending + stats.processing + stats.sent + stats.failed;
  const progress = totalEmails > 0 ? ((stats.sent + stats.failed) / totalEmails) * 100 : 0;

  const triggerProcessing = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-email-queue");
      if (error) throw error;
      toast({
        title: "Queue Processing Triggered",
        description: `Processed ${data?.success || 0} emails successfully`,
      });
    } catch (e) {
      console.error("Failed to trigger queue:", e);
      toast({ title: "Failed to trigger processing", variant: "destructive" });
    } finally {
      setTriggering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "processing":
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case "sent":
        return <CheckCircle2 className="w-3 h-3" />;
      case "failed":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Mail className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning border-warning/30";
      case "processing":
        return "bg-primary/10 text-primary border-primary/30";
      case "sent":
        return "bg-success/10 text-success border-success/30";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalEmails === 0) {
    return null;
  }

  const activeEmails = emails.filter(e => e.status === "pending" || e.status === "processing");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Email Queue Status</CardTitle>
          </div>
          {stats.processing > 0 && (
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing
            </Badge>
          )}
        </div>
        <CardDescription>
          Real-time status of your queued emails
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{stats.sent} of {totalEmails} sent</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-warning/5 border border-warning/20">
            <div className="text-lg font-bold text-warning">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-lg font-bold text-primary">{stats.processing}</div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-success/5 border border-success/20">
            <div className="text-lg font-bold text-success">{stats.sent}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="text-lg font-bold text-destructive">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Active emails list */}
        {activeEmails.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">In Progress</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activeEmails.slice(0, 5).map((email) => (
                <div 
                  key={email.id}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30"
                >
                  <span className="truncate flex-1 mr-2">{email.to_email}</span>
                  <Badge variant="outline" className={`${getStatusColor(email.status)} gap-1 text-xs`}>
                    {getStatusIcon(email.status)}
                    {email.status}
                  </Badge>
                </div>
              ))}
              {activeEmails.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{activeEmails.length - 5} more in queue
                </p>
              )}
            </div>
          </div>
        )}

        {/* Send Now button + info */}
        <div className="mt-3 space-y-2">
          {stats.pending > 0 && (
            <Button 
              onClick={triggerProcessing} 
              disabled={triggering}
              size="sm"
              className="w-full"
            >
              {triggering ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Send Now ({stats.pending} pending)
            </Button>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Auto-processing every minute • Updates in real-time
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
