import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, BellOff, Loader2 } from "lucide-react";

interface UL {
  id: string;
  reminders_enabled: boolean;
  reminder_inactivity_days: number;
}

interface Props {
  ul: UL & Record<string, any>;
  onUpdate: (next: any) => void;
}

export function ReminderSettingsButton({ ul, onUpdate }: Props) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean>(ul.reminders_enabled);
  const [days, setDays] = useState<number>(ul.reminder_inactivity_days);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("user_learning")
      .update({
        reminders_enabled: enabled,
        reminder_inactivity_days: days,
      })
      .eq("id", ul.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    onUpdate({ ...ul, reminders_enabled: enabled, reminder_inactivity_days: days });
    toast({
      title: "Reminder preferences saved",
      description: enabled
        ? `You'll be nudged after ${days} day${days === 1 ? "" : "s"} of inactivity.`
        : "Coach reminders are now off.",
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          {ul.reminders_enabled ? (
            <Bell className="h-3 w-3 mr-1" />
          ) : (
            <BellOff className="h-3 w-3 mr-1" />
          )}
          Reminders: {ul.reminders_enabled ? `${ul.reminder_inactivity_days}d` : "Off"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm">Coach reminders</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Get a nudge only when you've been inactive for a while.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rem-enabled" className="text-sm">
              Enable reminders
            </Label>
            <Switch
              id="rem-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Inactivity threshold</Label>
              <span className="text-sm font-medium">
                {days} day{days === 1 ? "" : "s"}
              </span>
            </div>
            <Slider
              min={1}
              max={14}
              step={1}
              value={[days]}
              onValueChange={(v) => setDays(v[0])}
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              We'll only nudge you if no lesson is completed and no coach message is sent for {days} day{days === 1 ? "" : "s"}.
            </p>
          </div>
          <Button onClick={save} disabled={saving} className="w-full" size="sm">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
            Save preferences
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
