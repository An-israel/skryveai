import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Send } from "lucide-react";

export default function EmailReply() {
  const [searchParams] = useSearchParams();
  const emailId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reply, setReply] = useState("");
  const [emailInfo, setEmailInfo] = useState<{ subject: string; sender: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (emailId) loadEmailInfo();
    else { setError("Invalid reply link."); setLoading(false); }
  }, [emailId]);

  const loadEmailInfo = async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("submit-reply", {
        body: { action: "info", emailId },
      });
      if (fetchError || data?.error) {
        setError("This reply link is no longer valid.");
      } else {
        setEmailInfo(data);
      }
    } catch {
      setError("Failed to load email details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reply.trim() || !emailId) return;
    setSending(true);
    try {
      const { data, error: submitError } = await supabase.functions.invoke("submit-reply", {
        body: { action: "reply", emailId, content: reply },
      });
      if (submitError || data?.error) throw new Error(data?.error || "Failed to send");
      setSent(true);
    } catch {
      setError("Failed to send your reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        {sent ? (
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Reply Sent!</h2>
            <p className="text-muted-foreground">Thank you for your response. Our team will get back to you soon.</p>
          </CardContent>
        ) : error ? (
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-lg">Reply to SkryveAI</CardTitle>
              {emailInfo && (
                <p className="text-sm text-muted-foreground">
                  Re: {emailInfo.subject}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your reply here..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <Button onClick={handleSubmit} disabled={!reply.trim() || sending} className="w-full gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Reply
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
