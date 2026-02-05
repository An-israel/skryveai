import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, Loader2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function GmailConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkGmailStatus();
    handleOAuthCallback();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("gmail-auth", {
        body: { action: "check-status" },
      });

      if (error) throw error;
      
      setIsConnected(data.connected);
      setConnectedEmail(data.email);
    } catch (error) {
      console.error("Failed to check Gmail status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state) {
      setIsConnecting(true);
      try {
        const redirectUri = `${window.location.origin}/settings`;
        
        const { data, error } = await supabase.functions.invoke("gmail-auth", {
          body: { 
            action: "exchange-code", 
            code,
            redirectUri,
          },
        });

        if (error) throw error;

        setIsConnected(true);
        setConnectedEmail(data.email);
        
        toast({
          title: "Gmail Connected!",
          description: `Successfully connected ${data.email}. Emails will now be sent from your Gmail account.`,
        });

        // Clean up URL
        window.history.replaceState({}, document.title, "/settings");
      } catch (error) {
        console.error("OAuth callback error:", error);
        toast({
          title: "Connection Failed",
          description: "Failed to connect Gmail. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const connectGmail = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      
      const { data, error } = await supabase.functions.invoke("gmail-auth", {
        body: { 
          action: "get-auth-url",
          redirectUri,
        },
      });

      if (error) throw error;

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      toast({
        title: "Error",
        description: "Failed to start Gmail connection. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      const { error } = await supabase.functions.invoke("gmail-auth", {
        body: { action: "disconnect" },
      });

      if (error) throw error;

      setIsConnected(false);
      setConnectedEmail(null);
      
      toast({
        title: "Gmail Disconnected",
        description: "Your Gmail account has been disconnected.",
      });
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail.",
        variant: "destructive",
      });
    }
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
          Gmail Integration
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to send outreach emails directly from your email address. 
          This ensures better deliverability and prevents emails from landing in spam.
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
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              All outreach emails will be sent from <strong>{connectedEmail}</strong>. 
              Recipients will see your email address as the sender.
            </p>
            <Button
              variant="outline"
              onClick={disconnectGmail}
              className="gap-2"
            >
              <Unlink className="h-4 w-4" />
              Disconnect Gmail
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Without Gmail connected, emails are sent from our shared domain 
                and may land in spam folders. Connect your Gmail for the best deliverability.
              </p>
            </div>
            <Button
              onClick={connectGmail}
              disabled={isConnecting}
              className="gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isConnecting ? "Connecting..." : "Connect Gmail"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
