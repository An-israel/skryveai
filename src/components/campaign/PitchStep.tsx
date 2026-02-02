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
  Building2
} from "lucide-react";
import type { Business, GeneratedPitch } from "@/types/campaign";

interface PitchStepProps {
  businesses: Business[];
  pitches: Record<string, GeneratedPitch>;
  isGenerating: boolean;
  onUpdatePitch: (businessId: string, pitch: GeneratedPitch) => void;
  onRegeneratePitch: (businessId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function PitchStep({
  businesses,
  pitches,
  isGenerating,
  onUpdatePitch,
  onRegeneratePitch,
  onContinue,
  onBack,
}: PitchStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  const approvedCount = Object.values(pitches).filter((p) => p.approved).length;

  const startEditing = (business: Business) => {
    const pitch = pitches[business.id];
    if (pitch) {
      setEditingId(business.id);
      setEditedSubject(pitch.subject);
      setEditedBody(pitch.body);
    }
  };

  const saveEdit = (businessId: string) => {
    const pitch = pitches[businessId];
    if (pitch) {
      onUpdatePitch(businessId, {
        ...pitch,
        subject: editedSubject,
        body: editedBody,
        edited: true,
      });
    }
    setEditingId(null);
  };

  const toggleApproval = (businessId: string) => {
    const pitch = pitches[businessId];
    if (pitch) {
      onUpdatePitch(businessId, {
        ...pitch,
        approved: !pitch.approved,
      });
    }
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
          <h2 className="text-2xl font-bold">Review Pitches</h2>
          <p className="text-muted-foreground">
            Review and customize AI-generated pitches. Approved: {approvedCount}/{businesses.length}
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Sparkles className="w-4 h-4 mr-1" />
          AI Generated
        </Badge>
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
                <Card className={`p-5 transition-all ${pitch.approved ? "ring-2 ring-success bg-success/5" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{business.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {business.email || "Email will be extracted"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pitch.edited && (
                        <Badge variant="secondary" className="text-xs">Edited</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegeneratePitch(business.id)}
                        disabled={isGenerating}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Subject</label>
                        <Input
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          placeholder="Email subject line"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email Body</label>
                        <Textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={8}
                          placeholder="Email content"
                          className="resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(business.id)}>
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                        <div className="font-medium text-sm mb-2">
                          Subject: {pitch.subject}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {pitch.body}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={pitch.approved ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleApproval(business.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {pitch.approved ? "Approved" : "Approve"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(business)}
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
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
