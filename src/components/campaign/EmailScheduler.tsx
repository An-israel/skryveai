import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Zap, 
  Timer,
  Sun,
  Moon,
  Coffee
} from "lucide-react";

export interface ScheduleSettings {
  type: "immediate" | "scheduled" | "optimal";
  scheduledDate?: Date;
  scheduledTime?: string;
  timezone?: string;
  respectBusinessHours: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  pauseOnWeekends: boolean;
}

interface EmailSchedulerProps {
  settings: ScheduleSettings;
  onChange: (settings: ScheduleSettings) => void;
  emailCount: number;
  delayBetweenEmails: number;
}

const TIME_SLOTS = [
  { value: "06:00", label: "6:00 AM", icon: Coffee },
  { value: "09:00", label: "9:00 AM", icon: Sun },
  { value: "12:00", label: "12:00 PM", icon: Sun },
  { value: "15:00", label: "3:00 PM", icon: Sun },
  { value: "18:00", label: "6:00 PM", icon: Moon },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
];

export function EmailScheduler({ 
  settings, 
  onChange, 
  emailCount,
  delayBetweenEmails 
}: EmailSchedulerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const estimatedMinutes = Math.ceil((emailCount * delayBetweenEmails) / 60);

  const updateSettings = (updates: Partial<ScheduleSettings>) => {
    onChange({ ...settings, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Email Scheduling
        </CardTitle>
        <CardDescription>
          Choose when to send your {emailCount} emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={settings.type} 
          onValueChange={(value) => updateSettings({ type: value as ScheduleSettings["type"] })}
          className="grid grid-cols-3 gap-4"
        >
          <div>
            <RadioGroupItem value="immediate" id="immediate" className="peer sr-only" />
            <Label
              htmlFor="immediate"
              className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <Zap className="mb-3 h-6 w-6 text-warning" />
              <span className="font-medium">Send Now</span>
              <span className="text-xs text-muted-foreground">Start immediately</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="scheduled" id="scheduled" className="peer sr-only" />
            <Label
              htmlFor="scheduled"
              className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <CalendarIcon className="mb-3 h-6 w-6 text-info" />
              <span className="font-medium">Schedule</span>
              <span className="text-xs text-muted-foreground">Pick date & time</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="optimal" id="optimal" className="peer sr-only" />
            <Label
              htmlFor="optimal"
              className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <Timer className="mb-3 h-6 w-6 text-success" />
              <span className="font-medium">Optimal</span>
              <span className="text-xs text-muted-foreground">Best send time</span>
            </Label>
          </div>
        </RadioGroup>

        {settings.type === "scheduled" && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !settings.scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {settings.scheduledDate 
                        ? format(settings.scheduledDate, "PPP") 
                        : "Pick a date"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={settings.scheduledDate}
                      onSelect={(date) => {
                        updateSettings({ scheduledDate: date });
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select 
                  value={settings.scheduledTime} 
                  onValueChange={(value) => updateSettings({ scheduledTime: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        <div className="flex items-center gap-2">
                          <slot.icon className="w-4 h-4" />
                          {slot.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select 
                value={settings.timezone} 
                onValueChange={(value) => updateSettings({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {settings.type === "optimal" && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <p className="text-sm">
              <strong>Optimal timing enabled:</strong> Emails will be sent during peak engagement hours 
              (Tuesday-Thursday, 9 AM - 11 AM recipient's local time) for maximum open rates.
            </p>
          </div>
        )}

        {/* Business Hours Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Respect Business Hours</Label>
              <p className="text-xs text-muted-foreground">
                Only send during work hours
              </p>
            </div>
            <Switch
              checked={settings.respectBusinessHours}
              onCheckedChange={(checked) => updateSettings({ respectBusinessHours: checked })}
            />
          </div>

          {settings.respectBusinessHours && (
            <div className="grid grid-cols-2 gap-4 pl-4">
              <div className="space-y-2">
                <Label className="text-xs">Start Time</Label>
                <Select 
                  value={settings.businessHoursStart} 
                  onValueChange={(value) => updateSettings({ businessHoursStart: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Time</Label>
                <Select 
                  value={settings.businessHoursEnd} 
                  onValueChange={(value) => updateSettings({ businessHoursEnd: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pause on Weekends</Label>
              <p className="text-xs text-muted-foreground">
                Skip Saturday and Sunday
              </p>
            </div>
            <Switch
              checked={settings.pauseOnWeekends}
              onCheckedChange={(checked) => updateSettings({ pauseOnWeekends: checked })}
            />
          </div>
        </div>

        {/* Estimated Delivery */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-medium">Estimated delivery time:</span>
            <span className="text-muted-foreground">~{estimatedMinutes} minutes</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {delayBetweenEmails}s delay between {emailCount} emails
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
