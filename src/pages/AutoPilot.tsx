import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { AutoPilotSetup } from "@/components/autopilot/AutoPilotSetup";
import { AutoPilotDashboard } from "@/components/autopilot/AutoPilotDashboard";
import { AutoPilotActivityLog } from "@/components/autopilot/AutoPilotActivityLog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Play, Pause, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AutoPilotConfig } from "@/types/autopilot";

export type { AutoPilotConfig };

type ViewState = "list" | "dashboard" | "setup" | "activity-log";

const MAX_CAMPAIGNS = 5;

export default function AutoPilot() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<AutoPilotConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<AutoPilotConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [view, setView] = useState<ViewState>("list");

  const fetchConfigs = async () => {
    if (!user) return;
    setConfigLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("autopilot_configs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConfigs((data as AutoPilotConfig[]) || []);
    } catch (err) {
      console.error("Failed to fetch autopilot configs:", err);
      setConfigs([]);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchConfigs();
    }
  }, [user, authLoading]);

  const handleSetupComplete = () => {
    fetchConfigs();
    setView("list");
  };

  const handleOpenDashboard = (config: AutoPilotConfig) => {
    setActiveConfig(config);
    setView("dashboard");
  };

  const handleBackToList = () => {
    setActiveConfig(null);
    setView("list");
    fetchConfigs(); // refresh to get updated is_active states
  };

  const handleNewCampaign = () => {
    setActiveConfig(null);
    setView("setup");
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Setup view ── */}
        {view === "setup" && (
          <AutoPilotSetup
            onComplete={handleSetupComplete}
            onCancel={configs.length > 0 ? () => setView("list") : undefined}
          />
        )}

        {/* ── Dashboard for a single campaign ── */}
        {view === "dashboard" && activeConfig && (
          <>
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="mb-4">
              ← Back to Campaigns
            </Button>
            {false ? (
              <AutoPilotActivityLog
                userId={user!.id}
                onBack={() => setView("dashboard")}
              />
            ) : (
              <AutoPilotDashboard
                config={activeConfig}
                onSettingsClick={() => {
                  setActiveConfig(null);
                  setView("setup");
                }}
                onViewActivityLog={() => setView("activity-log" as ViewState)}
                onDeleted={handleBackToList}
                onConfigUpdate={(updated) => setActiveConfig(updated)}
              />
            )}
          </>
        )}

        {/* ── Campaign list ── */}
        {view === "list" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  Auto-Pilot Campaigns
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Autonomous email outreach — runs 24/7. Up to {MAX_CAMPAIGNS} campaigns at once.
                </p>
              </div>
              {configs.length < MAX_CAMPAIGNS && (
                <Button onClick={handleNewCampaign} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Campaign
                </Button>
              )}
            </div>

            {/* Empty state */}
            {configs.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">No campaigns yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first AutoPilot campaign to start finding and emailing businesses automatically.
                    </p>
                  </div>
                  <Button onClick={handleNewCampaign} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create First Campaign
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Campaign cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((cfg) => (
                <CampaignCard
                  key={cfg.id}
                  config={cfg}
                  onOpen={() => handleOpenDashboard(cfg)}
                  onDeleted={fetchConfigs}
                />
              ))}

              {/* Add slot */}
              {configs.length > 0 && configs.length < MAX_CAMPAIGNS && (
                <button
                  onClick={handleNewCampaign}
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground"
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-sm font-medium">Add Campaign ({configs.length}/{MAX_CAMPAIGNS})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({
  config,
  onOpen,
  onDeleted,
}: {
  config: AutoPilotConfig;
  onOpen: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const locationSummary = config.locations?.slice(0, 2).map(l => l.country).join(", ") || "No locations";
  const targetSummary = config.target_businesses?.types?.slice(0, 2).join(", ") || "All businesses";

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Stop and delete "${config.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from("autopilot_configs")
        .delete()
        .eq("id", config.id);
      if (error) throw error;
      toast({ title: `"${config.name}" deleted` });
      onDeleted();
    } catch (err) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onOpen}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${config.is_active ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <h3 className="font-semibold">{config.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.is_active ? "default" : "secondary"} className="text-xs">
              {config.is_active ? (
                <><Play className="w-3 h-3 mr-1" />Running</>
              ) : (
                <><Pause className="w-3 h-3 mr-1" />Paused</>
              )}
            </Badge>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>🏢 {targetSummary}</p>
          <p>📍 {locationSummary}</p>
          <p>📧 {config.daily_quota?.emailsPerDay ?? 500} emails/day</p>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {config.expertise?.industry || "General outreach"}
          </span>
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={onOpen}>
            Open →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
