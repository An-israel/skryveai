import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  RotateCcw,
  Sparkles,
  Mail,
  Building2,
  AlertTriangle,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Business, GeneratedPitch } from "@/types/campaign";

const BLOCKED_RECIPIENT_DOMAINS = new Set([
  "booksrus.com",
  "example.com",
  "test.com",
  "sample.com",
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
  "wellfound.com",
  "lever.co",
  "greenhouse.io",
  "workday.com",
  "icims.com",
  "taleo.net",
  "smartrecruiters.com",
]);

const getEmailValidationError = (email: string, required: boolean): string | null => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return required ? "Recipient email is required before sending." : null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(trimmed)) return "Enter a valid email address.";
  const domain = trimmed.split("@")[1];
  if (!domain) return "Enter a valid email address.";
  if (BLOCKED_RECIPIENT_DOMAINS.has(domain)) return "This domain is blocked. Use a direct company email.";
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|css|js)$/i.test(domain)) return "This doesn't look like a valid email domain.";
  return null;
};

interface PitchStepProps {
  businesses: Business[];
  pitches: Record<string, GeneratedPitch>;
  isGenerating: boolean;
  requireRecipientEmail?: boolean;
  onUpdatePitch: (businessId: string, pitch: GeneratedPitch) => void;
  onUpdateBusinessEmail: (businessId: string, email: string, emailVerified?: boolean) => void;
  onRegeneratePitch: (businessId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function PitchStep({
  businesses,
  pitches,
  isGenerating,
  requireRecipientEmail = false,
  onUpdatePitch,
  onUpdateBusinessEmail,
  onRegeneratePitch,
  onContinue,
  onBack,
}: PitchStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEmail, setEditedEmail] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const approvedCount = Object.values(pitches).filter((p) => p.approved).length;

  const startEditing = (business: Business) => {
    const pitch = pitches[business.id];
    if (pitch) {
      setEditingId(business.id);
      setEditedEmail((business.email || "").toLowerCase());
      setEditedSubject(pitch.subject);
      setEditedBody(pitch.body);
      setEmailError(null);
    }
  };

  const saveEdit = (businessId: string) => {
    const pitch = pitches[businessId];
    const normalizedEmail = editedEmail.trim().toLowerCase();
    const validationError = getEmailValidationError(normalizedEmail, requireRecipientEmail);
    if (validationError) { setEmailError(validationError); return; }
    const existingBusiness = businesses.find((item) => item.id === businessId);
    const emailChanged = (existingBusiness?.email || "").trim().toLowerCase() !== normalizedEmail;
    if (pitch) {
      onUpdatePitch(businessId, { ...pitch, subject: editedSubject, body: editedBody, edited: true });
    }
    onUpdateBusinessEmail(businessId, normalizedEmail, emailChanged ? false : existingBusiness?.emailVerified);
    setEmailError(null);
    setEditingId(null);
  };

  const toggleApproval = (businessId: string) => {
    const pitch = pitches[businessId];
    if (pitch) onUpdatePitch(businessId, { ...pitch, approved: !pitch.approved });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Review Pitches</h2>
          <p className="text-muted-foreground text-sm">
            Review and customize AI-generated pitches. Approved: {approvedCount}/{businesses.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              businesses.forEach((b) => {
                const pitch = pitches[b.id];
                if (pitch && !pitch.approved) onUpdatePitch(b.id, { ...pitch, approved: true });
              });
            }}
          >
            <Check className="w-4 h-4 mr-1" />
            Approve All
          </Button>
          <Badge variant="outline" className="text-xs py-1 px-3 border-border-subtle">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            AI Generated
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {businesses.map((business, index) => {
            const pitch = pitches[business.id];
            const isEditing = editingId === business.id;
            if (!pitch) return null;

            return (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`overflow-hidden border-border-subtle transition-all duration-200 ${pitch.approved ? "ring-2 ring-success/50 shadow-sm" : "hover:shadow-sm"}`}>
                  {/* Email header bar */}
                  <div className="px-5 py-3 bg-muted/30 border-b border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-sm truncate">{business.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{business.email || "Email not set"}</span>
                          {business.email && (
                            business.emailVerified ? (
                              <span className="inline-flex items-center gap-0.5 text-success shrink-0 font-medium">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-warning shrink-0 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                Unverified
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pitch.edited && (
                        <Badge variant="secondary" className="text-[10px]">Edited</Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRegeneratePitch(business.id)} disabled={isGenerating}>
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-5">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wider">Recipient Email</label>
                          <Input
                            type="email"
                            value={editedEmail}
                            onChange={(e) => {
                              const nextEmail = e.target.value;
                              setEditedEmail(nextEmail);
                              setEmailError(getEmailValidationError(nextEmail, requireRecipientEmail));
                            }}
                            placeholder="hiring@company.com"
                            className="font-mono text-sm"
                          />
                          {emailError ? (
                            <p className="text-xs text-destructive mt-1">{emailError}</p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mt-1">Override the scraped recipient before sending.</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wider">Subject</label>
                          <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} placeholder="Email subject line" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wider">Email Body</label>
                          <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={8} placeholder="Email content" className="resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(business.id)} disabled={Boolean(getEmailValidationError(editedEmail, requireRecipientEmail))}>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Save Changes
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEmailError(null); }}>
                            <X className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Subject line */}
                        <div className="mb-3">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Subject</span>
                          <div className="font-semibold text-sm mt-0.5">{pitch.subject}</div>
                        </div>
                        {/* Email body */}
                        <div className="p-4 bg-muted/30 rounded-lg border border-border-subtle">
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {pitch.body}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Button
                            variant={pitch.approved ? "success" : "outline"}
                            size="sm"
                            onClick={() => toggleApproval(business.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {pitch.approved ? "Approved" : "Approve"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => startEditing(business)}>
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={approvedCount === 0} size="lg">
          Send {approvedCount} Emails
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
