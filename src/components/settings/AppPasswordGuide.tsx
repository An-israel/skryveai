import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ExternalLink, 
  Shield, 
  Key, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Check,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SetupStep {
  title: string;
  description: string;
  steps: string[];
  link?: string;
  linkText?: string;
  important?: string;
}

const GMAIL_STEPS: SetupStep[] = [
  {
    title: "Enable 2-Step Verification",
    description: "App Passwords require 2-Step Verification to be enabled on your Google account.",
    steps: [
      "Go to your Google Account at myaccount.google.com",
      "Click 'Security' in the left navigation",
      "Under 'Signing in to Google', click '2-Step Verification'",
      "Follow the prompts to enable 2-Step Verification",
    ],
    link: "https://myaccount.google.com/signinoptions/two-step-verification",
    linkText: "Open 2-Step Verification Settings",
  },
  {
    title: "Generate App Password",
    description: "Create a unique 16-character password specifically for SkryveAI.",
    steps: [
      "Go to your Google Account Security page",
      "Click '2-Step Verification' (you may need to sign in again)",
      "Scroll down and click 'App passwords'",
      "Select 'Mail' as the app and 'Other' as the device",
      "Enter 'SkryveAI' as the name and click 'Generate'",
    ],
    link: "https://myaccount.google.com/apppasswords",
    linkText: "Open App Passwords Page",
  },
  {
    title: "Copy and Save the Password",
    description: "Copy the 16-character password and paste it in SkryveAI.",
    steps: [
      "A 16-character password will be displayed",
      "Copy this password (it's shown only once!)",
      "Come back to SkryveAI and paste it in the App Password field",
      "Click 'Test Connection' to verify it works",
    ],
    important: "Save this password securely - Google will only show it once!",
  },
];

const OUTLOOK_STEPS: SetupStep[] = [
  {
    title: "Enable 2-Step Verification",
    description: "App Passwords require 2-Step Verification on your Microsoft account.",
    steps: [
      "Go to account.microsoft.com and sign in",
      "Click 'Security' in the top navigation",
      "Click 'Advanced security options'",
      "Under 'Two-step verification', click 'Turn on'",
    ],
    link: "https://account.microsoft.com/security",
    linkText: "Open Microsoft Security Settings",
  },
  {
    title: "Generate App Password",
    description: "Create an app password for SkryveAI.",
    steps: [
      "Go to account.microsoft.com/security",
      "Click 'Advanced security options'",
      "Scroll to 'App passwords' and click 'Create a new app password'",
      "Copy the generated password",
    ],
    link: "https://account.live.com/proofs/AppPassword",
    linkText: "Generate App Password",
  },
  {
    title: "Use the App Password",
    description: "Paste the password in SkryveAI to connect your account.",
    steps: [
      "Copy the generated app password",
      "Paste it in the App Password field in SkryveAI",
      "Click 'Test Connection' to verify",
      "Click 'Save & Connect' to complete setup",
    ],
  },
];

interface AppPasswordGuideProps {
  provider?: string;
  onClose?: () => void;
}

export function AppPasswordGuide({ provider = "gmail", onClose }: AppPasswordGuideProps) {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const { toast } = useToast();

  const steps = provider === "outlook" ? OUTLOOK_STEPS : GMAIL_STEPS;
  const providerName = provider === "outlook" ? "Outlook / Microsoft 365" : "Gmail / Google Workspace";

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">App Password Setup Guide</CardTitle>
              <CardDescription>
                Step-by-step instructions for {providerName}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            ~3 minutes
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Why App Passwords */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Why do I need an App Password?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                App Passwords allow secure access to your email without sharing your main password. 
                They're used by professional cold outreach tools like Lemlist, Instantly, and Mailshake 
                to send emails directly from your inbox for better deliverability.
              </p>
            </div>
          </div>
        </div>

        {/* Steps Accordion */}
        <Accordion type="single" collapsible defaultValue="step-1" className="space-y-2">
          {steps.map((step, index) => (
            <AccordionItem 
              key={index} 
              value={`step-${index + 1}`}
              className="border rounded-lg px-4 data-[state=open]:border-primary/50"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-left">{step.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="pl-10 space-y-4">
                  <p className="text-muted-foreground">{step.description}</p>
                  
                  <ol className="space-y-2">
                    {step.steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>

                  {step.important && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {step.important}
                      </p>
                    </div>
                  )}

                  {step.link && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={step.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {step.linkText}
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(step.link!, `step-${index}`)}
                        className="gap-2"
                      >
                        {copiedStep === `step-${index}` ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copy Link
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Completion Checklist */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="font-medium mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            Before you proceed, confirm:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-muted-foreground/30" />
              <span>2-Step Verification is enabled</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-muted-foreground/30" />
              <span>App Password is generated and copied</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-muted-foreground/30" />
              <span>Password is saved securely (optional backup)</span>
            </li>
          </ul>
        </div>

        {/* Troubleshooting */}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Having trouble? Common issues and solutions
          </summary>
          <div className="mt-3 space-y-3 pl-4">
            <div>
              <p className="font-medium">Can't find App Passwords option?</p>
              <p className="text-muted-foreground">
                Make sure 2-Step Verification is fully enabled first. You may need to wait a few minutes after enabling it.
              </p>
            </div>
            <div>
              <p className="font-medium">Connection test fails?</p>
              <p className="text-muted-foreground">
                Double-check that you copied the entire 16-character password without spaces. Also verify your email address is correct.
              </p>
            </div>
            <div>
              <p className="font-medium">Google Workspace user?</p>
              <p className="text-muted-foreground">
                Your organization may need to enable "Less secure app access" or App Passwords. Contact your IT administrator.
              </p>
            </div>
          </div>
        </details>

        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full mt-4">
            Close Guide
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
