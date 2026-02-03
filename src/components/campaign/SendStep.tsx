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
  FlaskConical
} from "lucide-react";
import type { Business, GeneratedPitch } from "@/types/campaign";
import { EmailSettingsDialog, type UserSettings } from "@/components/settings/EmailSettingsDialog";
import { EmailScheduler, type ScheduleSettings } from "@/components/campaign/EmailScheduler";
import { ABTestingPanel, type ABTestSettings } from "@/components/campaign/ABTestingPanel";
import { supabase } from "@/integrations/supabase/client";

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

  const estimatedTime = approvedBusinesses.length * (userSettings?.delay_between_emails || 30);
  const estimatedMinutes = Math.ceil(estimatedTime / 60);

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
    );
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
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-info/10 flex items-center justify-center"
        >
          <Calendar className="w-12 h-12 text-info" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Emails Queued Successfully! 📅</h2>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Your {queuedCount} emails have been queued and are being sent automatically with {userSettings?.delay_between_emails || 30} second intervals.
        </p>
        
        <Card className="max-w-md mx-auto mb-6 p-4 border-info/30 bg-info/5">
          <div className="flex items-start gap-3 text-left">
            <Clock className="w-5 h-5 text-info shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm mb-1">Delivery Status</h4>
              <p className="text-xs text-muted-foreground">
                Emails are processed automatically every 2 minutes. Estimated completion time: <strong>~{estimatedMinutes} minutes</strong>. 
                You'll see delivery stats in your dashboard once complete.
              </p>
            </div>
          </div>
        </Card>
        
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/dashboard">Track Progress</a>
          </Button>
          <Button asChild>
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
