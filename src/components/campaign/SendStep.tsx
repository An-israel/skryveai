import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  Loader2,
  PartyPopper,
  Settings,
  Calendar,
  FlaskConical,
  Play
} from "lucide-react";
import type { Business, GeneratedPitch } from "@/types/campaign";
import { EmailSettingsDialog, type UserSettings } from "@/components/settings/EmailSettingsDialog";
import { EmailScheduler, type ScheduleSettings } from "@/components/campaign/EmailScheduler";
import { ABTestingPanel, type ABTestSettings } from "@/components/campaign/ABTestingPanel";
import { supabase } from "@/integrations/supabase/client";
import { useEmailQueueRealtime } from "@/hooks/use-email-queue-realtime";

interface SendStepProps {
  businesses: Business[];
  pitches: Record<string, GeneratedPitch>;
  campaignId?: string;
  onSend: (settings: UserSettings | null, scheduleSettings?: ScheduleSettings, abTestSettings?: ABTestSettings) => void;
  onBack: () => void;
  isSending: boolean;
  sendProgress: number;
  sentCount: number;
  queuedCount?: number;
}

export function SendStep({
  businesses,
  pitches,
  campaignId,
  onSend,
  onBack,
  isSending,
  sendProgress,
  sentCount,
  queuedCount = 0,
}: SendStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    type: "immediate",
    respectBusinessHours: true,
    businessHoursStart: "09:00",
    businessHoursEnd: "17:00",
    pauseOnWeekends: true,
  });
  const [abTestSettings, setAbTestSettings] = useState<ABTestSettings>({
    enabled: false,
    variants: [],
    testSize: 50,
    winnerCriteria: "opens",
    autoSelectWinner: true,
    testDuration: 24,
  });
  
  const approvedBusinesses = businesses.filter((b) => pitches[b.id]?.approved);
  const isComplete = sentCount === approvedBusinesses.length && sentCount > 0;
  const isQueued = queuedCount > 0 && !isSending;
  const firstPitch = approvedBusinesses[0] ? pitches[approvedBusinesses[0].id] : null;

  // Real-time queue tracking — must be called before any early returns
  const { stats: queueStats } = useEmailQueueRealtime(campaignId);
  const totalQueued = queueStats.pending + queueStats.processing + queueStats.sent + queueStats.failed;
  const deliveryProgress = totalQueued > 0 ? ((queueStats.sent + queueStats.failed) / totalQueued) * 100 : 0;
  const [triggeringQueue, setTriggeringQueue] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setUserSettings(data as UserSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const triggerQueueProcessing = async () => {
    setTriggeringQueue(true);
    try {
      await supabase.functions.invoke("process-email-queue");
    } catch (e) {
      console.error("Failed to trigger queue:", e);
    } finally {
      setTriggeringQueue(false);
    }
  };

  const estimatedTime = approvedBusinesses.length * (userSettings?.delay_between_emails || 30);
  const estimatedMinutes = Math.ceil(estimatedTime / 60);

  // Auto-detect completion from real-time stats
  const allDelivered = isQueued && totalQueued > 0 && queueStats.pending === 0 && queueStats.processing === 0;

  if (allDelivered) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center"
        >
          <PartyPopper className="w-12 h-12 text-success" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">All Emails Delivered! 🎉</h2>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          {queueStats.sent} emails sent successfully{queueStats.failed > 0 ? `, ${queueStats.failed} failed` : ""}.
          You'll be notified when you receive replies.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/dashboard">View Dashboard</a>
          </Button>
          <Button asChild>
            <a href="/campaigns/new">New Campaign</a>
          </Button>
        </div>
      </motion.div>
    );
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center"
        >
          <PartyPopper className="w-12 h-12 text-success" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Campaign Sent! 🎉</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your {sentCount} personalized emails have been sent. You'll be notified when you receive replies.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/dashboard">View Dashboard</a>
          </Button>
          <Button asChild>
            <a href="/campaigns/new">New Campaign</a>
          </Button>
        </div>
      </motion.div>
    )
  }



  if (isQueued) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Sending Emails...</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Your emails are being delivered in real-time
        </p>
        
        {/* Live progress */}
        <Card className="max-w-md mx-auto mb-6 p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Delivery Progress</span>
            <span className="font-bold text-primary">{queueStats.sent} of {totalQueued} sent</span>
          </div>
          <Progress value={deliveryProgress} className="h-3 mb-4" />
          
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-warning/5 border border-warning/20">
              <div className="text-lg font-bold text-warning">{queueStats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-lg font-bold text-primary">{queueStats.processing}</div>
              <div className="text-xs text-muted-foreground">Sending</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-success/5 border border-success/20">
              <div className="text-lg font-bold text-success">{queueStats.sent}</div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="text-lg font-bold text-destructive">{queueStats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {queueStats.pending > 0 && (
            <Button 
              onClick={triggerQueueProcessing} 
              disabled={triggeringQueue}
              size="sm"
              className="w-full"
            >
              {triggeringQueue ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Send Now ({queueStats.pending} remaining)
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Auto-processing every minute • Updates in real-time
          </p>
        </Card>
        
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/dashboard">View Dashboard</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/campaigns/new">New Campaign</a>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold">Send Emails</h2>
        <p className="text-muted-foreground mt-2">
          Ready to send {approvedBusinesses.length} personalized emails
        </p>
      </div>

      {isSending ? (
        <Card className="p-8">
          <div className="text-center mb-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Scheduling Emails...</h3>
            <p className="text-sm text-muted-foreground">
              {sentCount} of {approvedBusinesses.length} queued
            </p>
          </div>
          <Progress value={sendProgress} className="h-3" />
          <p className="text-xs text-muted-foreground text-center mt-3">
            Emails will be sent with {userSettings?.delay_between_emails || 30}s delays
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <Mail className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="abtest" className="gap-2">
              <FlaskConical className="w-4 h-4" />
              A/B Test
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Settings Preview */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">
                      Sending as: {userSettings?.sender_name || "Not configured"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Delay: {userSettings?.delay_between_emails || 30}s • 
                      Estimated time: ~{estimatedMinutes} min
                    </div>
                  </div>
                </div>
                <EmailSettingsDialog 
                  onSettingsSaved={setUserSettings}
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Email Preview Summary
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {approvedBusinesses.map((business, index) => {
                  const pitch = pitches[business.id];
                  const scheduledDelay = index * (userSettings?.delay_between_emails || 30);
                  
                  return (
                    <div
                      key={business.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{business.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {business.email || "Email will be extracted"} • {pitch?.subject}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        +{Math.floor(scheduledDelay / 60)}:{String(scheduledDelay % 60).padStart(2, '0')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 border-warning/50 bg-warning/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Scheduled Sending</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Emails will be sent with {userSettings?.delay_between_emails || 30}s delays
                    </li>
                    <li className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Total time: approximately {estimatedMinutes} minutes
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      Each email includes an unsubscribe link
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Open and click tracking enabled
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <EmailScheduler 
              settings={scheduleSettings}
              onChange={setScheduleSettings}
              emailCount={approvedBusinesses.length}
              delayBetweenEmails={userSettings?.delay_between_emails || 30}
            />
          </TabsContent>

          <TabsContent value="abtest">
            <ABTestingPanel 
              settings={abTestSettings}
              onChange={setAbTestSettings}
              baseSubject={firstPitch?.subject || ""}
              baseBody={firstPitch?.body || ""}
            />
          </TabsContent>
        </Tabs>
      )}

      {!isSending && (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <input
            type="checkbox"
            id="confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4 rounded border-input"
          />
          <label htmlFor="confirm" className="text-sm cursor-pointer">
            I confirm these emails are compliant with anti-spam regulations and recipients have a legitimate interest in my services.
          </label>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSending}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => onSend(userSettings, scheduleSettings, abTestSettings)}
          disabled={!confirmed || isSending || isLoadingSettings}
          size="lg"
          variant="hero"
        >
          <Send className="w-4 h-4 mr-2" />
          {scheduleSettings.type === "immediate" 
            ? `Schedule ${approvedBusinesses.length} Emails`
            : scheduleSettings.type === "scheduled"
              ? `Schedule for ${scheduleSettings.scheduledDate ? scheduleSettings.scheduledDate.toLocaleDateString() : "later"}`
              : `Send at Optimal Time`
          }
        </Button>
      </div>
    </motion.div>
  );
}
