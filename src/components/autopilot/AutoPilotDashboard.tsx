import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { AutoPilotConfig } from "@/types/autopilot";
import {
  Pause,
  Play,
  Settings,
  BarChart2,
  CheckCircle2,
  XCircle,
  SkipForward,
  Zap,
  MapPin,
  Clock,
  Mail,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutoPilotSession {
  id: string;
  user_id: string;
  date: string;
  emails_sent: number;
  emails_failed: number;
  emails_skipped: number;
  status: string;
  current_location: string | null;
  current_activity: string | null;
  started_at: string;
  updated_at: string;
}

interface ActivityItem {
  id: string;
  business_name: string | null;
  business_location: string | null;
  contact_email: string | null;
  email_subject: string | null;
  status: string;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  created_at: string;
}

interface AutoPilotDashboardProps {
  config: AutoPilotConfig;
  onSettingsClick: () => void;
  onViewActivityLog: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "paused":
      return "bg-yellow-500";
    case "quota_reached":
      return "bg-blue-500";
    case "idle":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}

function getStatusLabel(status: string, isActive: boolean): string {
  if (!isActive) return "PAUSED";
  switch (status) {
    case "active":
      return "ACTIVE";
    case "quota_reached":
      return "QUOTA REACHED";
    case "paused":
      return "PAUSED";
    default:
      return "IDLE";
  }
}

function getStatusTextColor(status: string, isActive: boolean): string {
  if (!isActive) return "text-yellow-500";
  switch (status) {
    case "active":
      return "text-green-500";
    case "quota_reached":
      return "text-blue-500";
    case "paused":
      return "text-yellow-500";
    default:
      return "text-gray-400";
  }
}

function ActivityStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
    case "skipped":
      return <SkipForward className="w-4 h-4 text-muted-foreground shrink-0" />;
    default:
      return <Mail className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoPilotDashboard({
  config,
  onSettingsClick,
  onViewActivityLog,
}: AutoPilotDashboardProps) {
  const { user, session: authSession } = useAuth();
  const { toast } = useToast();

  const [todaySession, setTodaySession] = useState<AutoPilotSession | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isActive, setIsActive] = useState(config.is_active);
  const [previewItem, setPreviewItem] = useState<ActivityItem | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  const dailyLimit = config.daily_quota?.emailsPerDay ?? 500;
  const today = new Date().toISOString().split("T")[0];

  // ── Fetch today's session ──────────────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("autopilot_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    if (data) setTodaySession(data as AutoPilotSession);
  }, [user, today]);

  // ── Fetch recent activity ──────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("autopilot_activity")
      .select(
        "id, business_name, business_location, contact_email, email_subject, email_body, status, opened, clicked, replied, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setActivity(data as ActivityItem[]);
  }, [user]);

  // ── Initial load + polling ─────────────────────────────────────────────────
  useEffect(() => {
    fetchSession();
    fetchActivity();

    const interval = setInterval(() => {
      fetchSession();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchSession, fetchActivity]);

  // ── Auto-trigger autopilot run when active ────────────────────────────────
  useEffect(() => {
    if (!isActive || !authSession) return;
    
    const triggerRun = async () => {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autopilot-run`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({ userId: user?.id }),
          }
        );
        fetchSession();
        fetchActivity();
      } catch (err) {
        console.error("Auto-trigger failed:", err);
      }
    };

    // Trigger immediately, then every 5 minutes
    triggerRun();
    const interval = setInterval(triggerRun, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isActive, authSession, user?.id]);

  // ── Real-time subscription on autopilot_activity ───────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`autopilot_activity_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "autopilot_activity",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setActivity((prev) => {
            const newItem = payload.new as ActivityItem;
            const updated = [newItem, ...prev].slice(0, 10);
            return updated;
          });
          // Also refresh session counts
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSession]);

  // ── Manual trigger ──────────────────────────────────────────────────────────
  const handleManualTrigger = async () => {
    if (!authSession || !user) return;
    setIsTriggering(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autopilot-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );
      if (res.ok) {
        toast({ title: "Auto-Pilot triggered", description: "Processing businesses now..." });
        fetchSession();
        fetchActivity();
      }
    } catch (err) {
      toast({ title: "Failed to trigger", variant: "destructive" });
    } finally {
      setIsTriggering(false);
    }
  };

  // ── Pause / Resume ────────────────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (!authSession) return;
    setIsTogglingActive(true);
    const newActive = !isActive;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autopilot-config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ is_active: newActive }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }

      setIsActive(newActive);
      toast({
        title: newActive ? "Auto-Pilot resumed" : "Auto-Pilot paused",
        description: newActive
          ? "Your agent is now actively sending emails."
          : "Your agent has been paused. No emails will be sent.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsTogglingActive(false);
    }
  };

  const emailsSent = todaySession?.emails_sent ?? 0;
  const emailsSkipped = todaySession?.emails_skipped ?? 0;
  const emailsFailed = todaySession?.emails_failed ?? 0;
  const sessionStatus = todaySession?.status ?? "idle";
  const progressPct = Math.min(100, Math.round((emailsSent / dailyLimit) * 100));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Auto-Pilot
          </h1>
          <p className="text-sm text-muted-foreground">
            Autonomous email outreach — runs 24/7 so you don't have to.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSession}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* ── Status Card ─────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div
          className={cn(
            "h-1 w-full",
            isActive && sessionStatus === "active"
              ? "bg-green-500"
              : sessionStatus === "quota_reached"
              ? "bg-blue-500"
              : "bg-yellow-500"
          )}
        />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Status indicator */}
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    isActive && sessionStatus === "active"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-yellow-100 dark:bg-yellow-900/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full",
                      getStatusColor(isActive ? sessionStatus : "paused")
                    )}
                  />
                </div>
                {isActive && sessionStatus === "active" && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-25" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xl font-bold",
                      getStatusTextColor(sessionStatus, isActive)
                    )}
                  >
                    {getStatusLabel(sessionStatus, isActive)}
                  </span>
                </div>

                {todaySession?.started_at && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {isActive
                      ? `Running since ${formatTime(todaySession.started_at)}`
                      : "Paused"}
                  </p>
                )}

                {todaySession?.current_activity && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {todaySession.current_activity}
                  </p>
                )}
              </div>
            </div>

            {/* Progress + buttons */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Today's progress</span>
                  <span className="font-medium">
                    {emailsSent.toLocaleString()} / {dailyLimit.toLocaleString()} emails
                    <span className="text-muted-foreground ml-1">({progressPct}%)</span>
                  </span>
                </div>
                <Progress value={progressPct} className="h-2.5" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleToggleActive}
                  disabled={isTogglingActive}
                  variant={isActive ? "outline" : "default"}
                  size="sm"
                >
                  {isTogglingActive ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : isActive ? (
                    <Pause className="w-4 h-4 mr-1.5" />
                  ) : (
                    <Play className="w-4 h-4 mr-1.5" />
                  )}
                  {isActive ? "Pause" : "Resume"}
                </Button>
                <Button variant="outline" size="sm" onClick={onSettingsClick}>
                  <Settings className="w-4 h-4 mr-1.5" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" onClick={onViewActivityLog}>
                  <BarChart2 className="w-4 h-4 mr-1.5" />
                  Full Log
                </Button>
                {isActive && (
                  <Button variant="outline" size="sm" onClick={handleManualTrigger} disabled={isTriggering}>
                    {isTriggering ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
                    Run Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Emails Sent"
          value={emailsSent}
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          colorClass="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Skipped"
          value={emailsSkipped}
          icon={<SkipForward className="w-5 h-5 text-muted-foreground" />}
          colorClass="text-muted-foreground"
        />
        <StatCard
          label="Failed"
          value={emailsFailed}
          icon={<XCircle className="w-5 h-5 text-red-500" />}
          colorClass="text-red-600 dark:text-red-400"
        />
      </div>

      {/* ── Live Activity Feed ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Activity Feed
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewActivityLog}>
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[340px]">
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <Mail className="w-8 h-8 opacity-30" />
                <p className="text-sm">No activity yet — the agent hasn't run today.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {activity.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <ActivityStatusIcon status={item.status} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {item.business_name ?? "Unknown business"}
                          </span>
                          {item.business_location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {item.business_location}
                            </span>
                          )}
                        </div>
                        {item.contact_email && (
                          <p className="text-xs text-muted-foreground truncate">{item.contact_email}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant={
                            item.status === "sent"
                              ? "default"
                              : item.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                        {formatTime(item.created_at)}
                        </span>
                        {item.email_subject && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs"
                            onClick={() => setPreviewItem(item)}
                          >
                            <Eye className="w-3 h-3 mr-0.5" />
                            Preview
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Email Preview Dialog ──────────────────────────────────────── */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Email Preview</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">To:</span>{" "}
                <span className="font-medium">{previewItem.contact_email || "N/A"}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Business:</span>{" "}
                <span className="font-medium">{previewItem.business_name}</span>
                {previewItem.business_location && (
                  <span className="text-muted-foreground"> — {previewItem.business_location}</span>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Subject:</span>{" "}
                <span className="font-medium">{previewItem.email_subject}</span>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30 max-h-64 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">
                  {(previewItem as any).email_body || "Email body not available for preview."}
                </p>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant={previewItem.status === "sent" ? "default" : previewItem.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                  {previewItem.status}
                </Badge>
                {previewItem.opened && <Badge variant="outline" className="text-xs">Opened</Badge>}
                {previewItem.replied && <Badge variant="outline" className="text-xs">Replied</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stat Card sub-component ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
        {icon}
        <span className={cn("text-2xl font-bold", colorClass)}>
          {value.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
