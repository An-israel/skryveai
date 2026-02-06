import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Check, Loader2, Unlink, Eye, EyeOff, ChevronDown, ExternalLink, Settings, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppPasswordGuide } from "./AppPasswordGuide";

const PROVIDERS = {
  gmail: {
    name: "Gmail / Google Workspace",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    imap_host: "imap.gmail.com",
    imap_port: 993,
    guide_url: "https://myaccount.google.com/apppasswords",
  },
  outlook: {
    name: "Outlook / Microsoft 365",
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    imap_host: "outlook.office365.com",
    imap_port: 993,
    guide_url: "https://account.microsoft.com/security",
  },
  custom: {
    name: "Other (Custom SMTP)",
    smtp_host: "",
    smtp_port: 587,
    imap_host: "",
    imap_port: 993,
    guide_url: "",
  },
};

export function SMTPConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email_address: "",
    app_password: "",
    provider_type: "gmail",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    imap_host: "imap.gmail.com",
    imap_port: 993,
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("smtp-auth", {
        body: { action: "check-status" },
      });

      if (error) throw error;
      
      setIsConnected(data.connected);
      setConnectedEmail(data.email);
      setProvider(data.provider);
    } catch (error) {
      console.error("Failed to check SMTP status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (value: string) => {
    const providerConfig = PROVIDERS[value as keyof typeof PROVIDERS];
    setFormData({
      ...formData,
      provider_type: value,
      smtp_host: providerConfig.smtp_host,
      smtp_port: providerConfig.smtp_port,
      imap_host: providerConfig.imap_host,
      imap_port: providerConfig.imap_port,
    });
    if (value === "custom") {
      setShowAdvanced(true);
    }
  };

  const testConnection = async () => {
    if (!formData.email_address || !formData.app_password) {
      toast({
        title: "Missing Fields",
        description: "Please enter your email and App Password",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-auth", {
        body: { 
          action: "test-connection",
          credentials: formData,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection Successful!",
          description: "Your SMTP credentials are valid. Click Save to continue.",
        });
      }
    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Invalid credentials. Please check your email and App Password.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveCredentials = async () => {
    if (!formData.email_address || !formData.app_password) {
      toast({
        title: "Missing Fields",
        description: "Please enter your email and App Password",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-auth", {
        body: { 
          action: "save-credentials",
          credentials: formData,
        },
      });

      if (error) throw error;

      setIsConnected(true);
      setConnectedEmail(data.email);
      setProvider(formData.provider_type);
      
      toast({
        title: "Email Connected!",
        description: `Successfully connected ${data.email}. Emails will now be sent from your email address.`,
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const disconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke("smtp-auth", {
        body: { action: "disconnect" },
      });

      if (error) throw error;

      setIsConnected(false);
      setConnectedEmail(null);
      setProvider(null);
      setFormData({
        email_address: "",
        app_password: "",
        provider_type: "gmail",
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        imap_host: "imap.gmail.com",
        imap_port: 993,
      });
      
      toast({
        title: "Email Disconnected",
        description: "Your email account has been disconnected.",
      });
    } catch (error) {
      console.error("Disconnect failed:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect email.",
        variant: "destructive",
      });
    }
  };

  const getProviderGuideUrl = () => {
    const providerConfig = PROVIDERS[formData.provider_type as keyof typeof PROVIDERS];
    return providerConfig?.guide_url || "";
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
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Connection (SMTP)
        </CardTitle>
        <CardDescription>
          Connect your email account using an App Password. This is the same method used by 
          Lemlist, Instantly, and other leading cold outreach tools.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <Check className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">Connected</p>
                <p className="text-sm text-green-600 dark:text-green-400">{connectedEmail}</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {PROVIDERS[provider as keyof typeof PROVIDERS]?.name || "Custom"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              All outreach emails will be sent from <strong>{connectedEmail}</strong>. 
              Recipients will see your email address as the sender.
            </p>
            <Button
              variant="outline"
              onClick={disconnect}
              className="gap-2"
            >
              <Unlink className="h-4 w-4" />
              Disconnect Email
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Banner with Guide Link */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Why App Password?</strong> This method sends emails directly from your inbox,
                  ensuring better deliverability and avoiding spam folders. It's the industry standard
                  used by professional cold outreach tools.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuide(!showGuide)}
                  className="flex-shrink-0 gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  {showGuide ? "Hide Guide" : "Setup Guide"}
                </Button>
              </div>
            </div>

            {/* App Password Guide */}
            {showGuide && (
              <AppPasswordGuide 
                provider={formData.provider_type === "outlook" ? "outlook" : "gmail"} 
                onClose={() => setShowGuide(false)}
              />
            )}

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Email Provider</Label>
              <Select
                value={formData.provider_type}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your email provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail / Google Workspace</SelectItem>
                  <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                  <SelectItem value="custom">Other (Custom SMTP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email_address}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              />
            </div>

            {/* App Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">App Password</Label>
                {getProviderGuideUrl() && (
                  <a
                    href={getProviderGuideUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    How to generate
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your 16-character App Password"
                  value={formData.app_password}
                  onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.provider_type === "gmail" 
                  ? "Generate an App Password at: Google Account → Security → 2-Step Verification → App Passwords"
                  : formData.provider_type === "outlook"
                  ? "Go to Microsoft Account → Security → Advanced security options → App passwords"
                  : "Contact your email provider for SMTP credentials"}
              </p>
            </div>

            {/* Advanced Settings (for custom or troubleshooting) */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={formData.smtp_host}
                      onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap_host">IMAP Host (for reply tracking)</Label>
                    <Input
                      id="imap_host"
                      value={formData.imap_host}
                      onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                      placeholder="imap.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap_port">IMAP Port</Label>
                    <Input
                      id="imap_port"
                      type="number"
                      value={formData.imap_port}
                      onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                      placeholder="993"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting || !formData.email_address || !formData.app_password}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
              <Button
                onClick={saveCredentials}
                disabled={isSaving || !formData.email_address || !formData.app_password}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save & Connect"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
