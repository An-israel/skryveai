import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Save, Loader2, User, Building2, Mail, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserSettings {
  id?: string;
  user_id: string;
  sender_name: string;
  sender_email: string | null;
  company_name: string | null;
  service_description: string;
  email_signature: string;
  delay_between_emails: number;
  daily_send_limit: number;
}

interface EmailSettingsDialogProps {
  trigger?: React.ReactNode;
  onSettingsSaved?: (settings: UserSettings) => void;
}

export function EmailSettingsDialog({ trigger, onSettingsSaved }: EmailSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    user_id: "",
    sender_name: "",
    sender_email: null,
    company_name: null,
    service_description: "web development and digital marketing",
    email_signature: "Best regards",
    delay_between_emails: 30,
    daily_send_limit: 50,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data as UserSettings);
      } else {
        setSettings(prev => ({ 
          ...prev, 
          user_id: user.id,
          sender_name: user.user_metadata?.full_name || "Your Name",
          sender_email: user.email || null,
        }));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error loading settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settingsData = {
        user_id: user.id,
        sender_name: settings.sender_name,
        sender_email: settings.sender_email,
        company_name: settings.company_name,
        service_description: settings.service_description,
        email_signature: settings.email_signature,
        delay_between_emails: settings.delay_between_emails,
        daily_send_limit: settings.daily_send_limit,
      };

      const { data, error } = await supabase
        .from("user_settings")
        .upsert(settingsData, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Settings saved successfully" });
      onSettingsSaved?.(data as UserSettings);
      setOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Email Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Settings</DialogTitle>
          <DialogDescription>
            Customize your outreach emails with your personal branding
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 py-4"
          >
            {/* Sender Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Sender Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender_name">Your Name</Label>
                    <Input
                      id="sender_name"
                      value={settings.sender_name}
                      onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender_email">Reply-to Email</Label>
                    <Input
                      id="sender_email"
                      type="email"
                      value={settings.sender_email || ""}
                      onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name (Optional)</Label>
                  <Input
                    id="company_name"
                    value={settings.company_name || ""}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Your Agency Name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Service Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Service Description
                </CardTitle>
                <CardDescription>
                  Used in AI-generated pitches to describe your services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.service_description}
                  onChange={(e) => setSettings({ ...settings, service_description: e.target.value })}
                  placeholder="web development and digital marketing"
                  rows={2}
                />
              </CardContent>
            </Card>

            {/* Email Signature */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Email Signature
                </CardTitle>
                <CardDescription>
                  Added at the end of each outreach email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.email_signature}
                  onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
                  placeholder="Best regards,&#10;John Doe&#10;Web Developer"
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Sending Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Sending Settings
                </CardTitle>
                <CardDescription>
                  Configure delays to improve deliverability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Delay Between Emails</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.delay_between_emails} seconds
                    </span>
                  </div>
                  <Slider
                    value={[settings.delay_between_emails]}
                    onValueChange={([value]) => setSettings({ ...settings, delay_between_emails: value })}
                    min={10}
                    max={120}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 30-60 seconds to avoid spam filters
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Daily Send Limit</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.daily_send_limit} emails/day
                    </span>
                  </div>
                  <Slider
                    value={[settings.daily_send_limit]}
                    onValueChange={([value]) => setSettings({ ...settings, daily_send_limit: value })}
                    min={10}
                    max={200}
                    step={10}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 50 emails/day for new domains
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
