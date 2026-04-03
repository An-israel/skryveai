import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { AutoPilotSetup } from "@/components/autopilot/AutoPilotSetup";
import { AutoPilotDashboard } from "@/components/autopilot/AutoPilotDashboard";
import { AutoPilotActivityLog } from "@/components/autopilot/AutoPilotActivityLog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export interface AutoPilotConfig {
  id: string;
  user_id: string;
  is_active: boolean;
  expertise: {
    industry: string;
    services: string[];
    valueProp: string;
  };
  target_businesses: {
    types: string[];
    sizeRange: string;
    mustHaveWebsite: boolean;
    mustHaveInstagram: boolean;
  };
  locations: Array<{
    country: string;
    cities: string[];
  }>;
  daily_quota: {
    emailsPerDay: number;
    sendingSchedule: {
      startHour: number;
      endHour: number;
      spreadThroughoutDay: boolean;
    };
  };
  email_style: {
    tone: string;
    length: string;
    ctaType: string;
  };
  compliance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type ViewState = "dashboard" | "activity-log";

export default function AutoPilot() {
  const { user, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<AutoPilotConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [view, setView] = useState<ViewState>("dashboard");

  const fetchConfig = async () => {
    if (!user) return;
    setConfigLoading(true);
    try {
      const { data, error } = await supabase
        .from("autopilot_configs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setConfig(data as AutoPilotConfig | null);
    } catch (err) {
      console.error("Failed to fetch autopilot config:", err);
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchConfig();
    }
  }, [user, authLoading]);

  const handleSetupComplete = () => {
    fetchConfig();
  };

  const handleSettingsClick = () => {
    // Re-show setup wizard by clearing config locally
    setConfig(null);
  };

  const handleViewActivityLog = () => {
    setView("activity-log");
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!config ? (
          <AutoPilotSetup onComplete={handleSetupComplete} />
        ) : view === "activity-log" ? (
          <AutoPilotActivityLog
            userId={user!.id}
            onBack={handleBackToDashboard}
          />
        ) : (
          <AutoPilotDashboard
            config={config}
            onSettingsClick={handleSettingsClick}
            onViewActivityLog={handleViewActivityLog}
          />
        )}
      </main>
    </div>
  );
}
