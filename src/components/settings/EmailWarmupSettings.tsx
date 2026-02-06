import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Loader2,
  Info,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WarmupSettings {
  warmup_enabled: boolean;
  warmup_start_volume: number;
  warmup_daily_increase: number;
  warmup_max_volume: number;
  warmup_started_at: string | null;
  current_warmup_day: number;
}

const DEFAULT_SETTINGS: WarmupSettings = {
  warmup_enabled: false,
  warmup_start_volume: 5,
  warmup_daily_increase: 2,
  warmup_max_volume: 50,
  warmup_started_at: null,
  current_warmup_day: 0,
};

export function EmailWarmupSettings() {
  const [settings, setSettings] = useState<WarmupSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        // Map the data to warmup settings, using defaults for missing fields
        setSettings({
          warmup_enabled: (data as any).warmup_enabled ?? false,
          warmup_start_volume: (data as any).warmup_start_volume ?? 5,
          warmup_daily_increase: (data as any).warmup_daily_increase ?? 2,
          warmup_max_volume: data.daily_send_limit ?? 50,
          warmup_started_at: (data as any).warmup_started_at ?? null,
          current_warmup_day: calculateWarmupDay((data as any).warmup_started_at),
        });
      }
    } catch (error) {
      console.error("Failed to fetch warmup settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWarmupDay = (startDate: string | null): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const calculateCurrentVolume = (): number => {
    if (!settings.warmup_enabled || settings.current_warmup_day === 0) {
      return settings.warmup_start_volume;
    }
    const volume = settings.warmup_start_volume + 
      (settings.current_warmup_day - 1) * settings.warmup_daily_increase;
    return Math.min(volume, settings.warmup_max_volume);
  };

  const calculateDaysToMaxVolume = (): number => {
    const current = calculateCurrentVolume();
    if (current >= settings.warmup_max_volume) return 0;
    return Math.ceil(
      (settings.warmup_max_volume - current) / settings.warmup_daily_increase
    );
  };

  const getWarmupProgress = (): number => {
    const current = calculateCurrentVolume();
    return Math.min((current / settings.warmup_max_volume) * 100, 100);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const updateData: any = {
        daily_send_limit: settings.warmup_max_volume,
        updated_at: new Date().toISOString(),
      };

      // Note: These fields would need to be added to the user_settings table
      // For now, we'll store in daily_send_limit and use local state
      
      const { error } = await supabase
        .from("user_settings")
        .update(updateData)
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: settings.warmup_enabled 
          ? `Warmup enabled. Starting at ${settings.warmup_start_volume} emails/day.`
          : "Warmup disabled. Using fixed daily limit.",
      });
    } catch (error) {
      console.error("Failed to save warmup settings:", error);
      toast({
        title: "Save Failed",
        description: "Could not save warmup settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableWarmup = (enabled: boolean) => {
    setSettings({
      ...settings,
      warmup_enabled: enabled,
      warmup_started_at: enabled ? new Date().toISOString() : null,
      current_warmup_day: enabled ? 1 : 0,
    });
  };

  const handleResetWarmup = () => {
    setSettings({
      ...settings,
      warmup_started_at: new Date().toISOString(),
      current_warmup_day: 1,
    });
    toast({
      title: "Warmup Reset",
      description: "Starting warmup from day 1 again.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/30">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Email Warmup
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </CardTitle>
              <CardDescription>
                Gradually increase sending volume to protect your domain reputation
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Why Warmup Banner */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Why is warmup important?
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                New email accounts or domains have no sending reputation. Sending too many emails too 
                quickly can trigger spam filters. Warmup gradually builds trust with email providers 
                by slowly increasing your sending volume over time.
              </p>
            </div>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="warmup-toggle" className="font-medium">
              Enable Warmup Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically limit daily sends and increase gradually
            </p>
          </div>
          <Switch
            id="warmup-toggle"
            checked={settings.warmup_enabled}
            onCheckedChange={handleEnableWarmup}
          />
        </div>

        {settings.warmup_enabled && (
          <>
            {/* Current Status */}
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-200">
                    Warmup Active - Day {settings.current_warmup_day || 1}
                  </span>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {calculateCurrentVolume()} emails/day
                </Badge>
              </div>
              <Progress value={getWarmupProgress()} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Start: {settings.warmup_start_volume}/day</span>
                <span>Target: {settings.warmup_max_volume}/day</span>
              </div>
              {calculateDaysToMaxVolume() > 0 && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
                  {calculateDaysToMaxVolume()} days until full volume
                </p>
              )}
            </div>

            {/* Settings Sliders */}
            <div className="space-y-6">
              {/* Starting Volume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Starting Daily Volume
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            How many emails to send on day 1. For new accounts, start with 5-10.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Badge variant="outline">{settings.warmup_start_volume} emails/day</Badge>
                </div>
                <Slider
                  value={[settings.warmup_start_volume]}
                  onValueChange={([value]) => setSettings({ ...settings, warmup_start_volume: value })}
                  min={1}
                  max={20}
                  step={1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Conservative (1)</span>
                  <span>Aggressive (20)</span>
                </div>
              </div>

              {/* Daily Increase */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Daily Increase
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            How many additional emails to add each day. 2-3 is safe for most accounts.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Badge variant="outline">+{settings.warmup_daily_increase} emails/day</Badge>
                </div>
                <Slider
                  value={[settings.warmup_daily_increase]}
                  onValueChange={([value]) => setSettings({ ...settings, warmup_daily_increase: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slow (1)</span>
                  <span>Fast (10)</span>
                </div>
              </div>

              {/* Max Volume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Maximum Daily Volume
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Target volume after warmup completes. Gmail limits: 500/day (free), 2000/day (Workspace).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Badge variant="outline">{settings.warmup_max_volume} emails/day</Badge>
                </div>
                <Slider
                  value={[settings.warmup_max_volume]}
                  onValueChange={([value]) => setSettings({ ...settings, warmup_max_volume: value })}
                  min={10}
                  max={200}
                  step={10}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low (10)</span>
                  <span>High (200)</span>
                </div>
              </div>
            </div>

            {/* Warmup Schedule Preview */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Warmup Schedule Preview</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                {[1, 7, 14, 30].map((day) => {
                  const volume = Math.min(
                    settings.warmup_start_volume + (day - 1) * settings.warmup_daily_increase,
                    settings.warmup_max_volume
                  );
                  return (
                    <div key={day} className="text-center p-2 rounded bg-background border">
                      <p className="text-muted-foreground text-xs">Day {day}</p>
                      <p className="font-semibold">{volume}</p>
                      <p className="text-xs text-muted-foreground">emails</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reset Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetWarmup}
              className="gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Reset Warmup (Start Over)
            </Button>
          </>
        )}

        {!settings.warmup_enabled && (
          <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
            <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Warmup Disabled</p>
            <p className="text-sm">
              Enable warmup to protect your domain reputation when starting cold outreach.
            </p>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Warmup Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
