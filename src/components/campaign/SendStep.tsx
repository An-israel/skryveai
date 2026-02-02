import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  Loader2,
  PartyPopper
} from "lucide-react";
import type { Business, GeneratedPitch } from "@/types/campaign";
import { useState } from "react";

interface SendStepProps {
  businesses: Business[];
  pitches: Record<string, GeneratedPitch>;
  onSend: () => void;
  onBack: () => void;
  isSending: boolean;
  sendProgress: number;
  sentCount: number;
}

export function SendStep({
  businesses,
  pitches,
  onSend,
  onBack,
  isSending,
  sendProgress,
  sentCount,
}: SendStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const approvedBusinesses = businesses.filter((b) => pitches[b.id]?.approved);
  const isComplete = sentCount === approvedBusinesses.length && sentCount > 0;

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center"
        >
          <PartyPopper className="w-12 h-12 text-success" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Campaign Sent! 🎉</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your {sentCount} personalized emails have been sent. You'll be notified when you receive replies.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/dashboard">View Dashboard</a>
          </Button>
          <Button asChild>
            <a href="/campaigns/new">New Campaign</a>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold">Send Emails</h2>
        <p className="text-muted-foreground mt-2">
          Ready to send {approvedBusinesses.length} personalized emails
        </p>
      </div>

      {isSending ? (
        <Card className="p-8">
          <div className="text-center mb-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Sending Emails...</h3>
            <p className="text-sm text-muted-foreground">
              {sentCount} of {approvedBusinesses.length} sent
            </p>
          </div>
          <Progress value={sendProgress} className="h-3" />
          <p className="text-xs text-muted-foreground text-center mt-3">
            Adding delays between emails to avoid spam filters
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Preview Summary
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {approvedBusinesses.map((business) => {
                const pitch = pitches[business.id];
                return (
                  <div
                    key={business.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{business.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {business.email || "Email will be extracted"} • {pitch?.subject}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 border-warning/50 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Before you send</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Emails will be sent with 30-60 second delays
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Each email includes an unsubscribe link
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    You'll receive notifications for replies
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <label htmlFor="confirm" className="text-sm cursor-pointer">
              I confirm these emails are compliant with anti-spam regulations and recipients have a legitimate interest in my services.
            </label>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSending}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onSend}
          disabled={!confirmed || isSending}
          size="lg"
          variant="hero"
        >
          <Send className="w-4 h-4 mr-2" />
          Send {approvedBusinesses.length} Emails
        </Button>
      </div>
    </motion.div>
  );
}
