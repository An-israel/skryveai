import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

interface SendUserEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  userId?: string;
  userName?: string;
}

const EMAIL_TEMPLATES = {
  welcome: {
    subject: "Welcome to SkryveAI — Let's get you started",
    body: `Hey {name},

Thanks for signing up for SkryveAI! I'm here to help you get the most out of the platform.

Here's how to get started:

1. Search for a business (try 'web designers in Lagos' as a test)
2. Click 'Audit' to see what problems we find
3. Review the personalized email we generate

Takes about 3 minutes total.

Any questions? Just reply to this email.

Let's get you your first client 💪`,
  },
  followup_inactive: {
    subject: "Need help getting started with SkryveAI?",
    body: `Hey {name},

I saw you signed up for SkryveAI a couple days ago but haven't run an audit yet.

Any blockers? Anything confusing?

I'm happy to walk you through it real quick — literally takes 3 minutes and you'll see how it works.

Let me know 👍`,
  },
  upgrade: {
    subject: "How's SkryveAI working for you?",
    body: `Hey {name}!

I noticed you've been using SkryveAI quite a bit — that's awesome.

Just curious — how's it working for you so far? Getting any replies yet?

Also — what's keeping you on the free plan? Is it the price, or are you still testing it out?

We're working on making the paid plan more accessible for early users like you.

Let me know!`,
  },
  custom: {
    subject: "",
    body: "",
  },
};

export function SendUserEmailDialog({ open, onOpenChange, userEmail, userId, userName }: SendUserEmailDialogProps) {
  const [template, setTemplate] = useState<string>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [toEmail, setToEmail] = useState(userEmail || "");
  const { toast } = useToast();

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const tmpl = EMAIL_TEMPLATES[value as keyof typeof EMAIL_TEMPLATES];
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body.replace(/\{name\}/g, userName || "there"));
    }
  };

  const handleSend = async () => {
    if (!toEmail || !subject || !body) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          toEmail: toEmail,
          toUserId: userId,
          subject,
          body,
          templateType: template !== "custom" ? template : null,
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        throw new Error(error.message || "Edge function error");
      }
      if (data?.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      toast({ title: "Email sent successfully!" });
      onOpenChange(false);
      setSubject("");
      setBody("");
      setTemplate("custom");
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Send Email to User
          </DialogTitle>
          <DialogDescription>
            Send an onboarding, follow-up, or custom email to a user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Email</SelectItem>
                <SelectItem value="welcome">Welcome / Onboarding</SelectItem>
                <SelectItem value="followup_inactive">Follow-up (Inactive User)</SelectItem>
                <SelectItem value="upgrade">Upgrade Conversion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={10}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
