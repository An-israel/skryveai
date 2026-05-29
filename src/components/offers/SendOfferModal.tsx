import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2, DollarSign, Calendar, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Milestone {
  title: string;
  due_date: string;
  amount: string;
}

interface SendOfferModalProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  talentId: string;
  talentName: string;
  jobTitle: string;
}

export function SendOfferModal({
  open,
  onClose,
  applicationId,
  talentId,
  talentName,
  jobTitle,
}: SendOfferModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [scope, setScope] = useState("");
  const [rateType, setRateType] = useState<"fixed" | "hourly">("fixed");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timeline, setTimeline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [terms, setTerms] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: "", due_date: "", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const addMilestone = () =>
    setMilestones((prev) => [...prev, { title: "", due_date: "", amount: "" }]);

  const removeMilestone = (i: number) =>
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));

  const updateMilestone = (i: number, field: keyof Milestone, value: string) =>
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );

  const handleSend = async () => {
    if (!scope || !amount || !timeline) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get client profile
      const { data: clientProfile } = await (supabase as any)
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const totalAmount = parseFloat(amount) || 0;

      // Create project
      const { data: project, error: projectError } = await (supabase as any)
        .from("projects")
        .insert({
          client_id: clientProfile?.id || user.id,
          talent_id: talentId,
          title: jobTitle,
          status: "active",
          payment_status: "pending",
          total_amount: totalAmount,
          currency,
          deadline: startDate || null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create milestones
      const validMilestones = milestones.filter((m) => m.title.trim());
      if (validMilestones.length > 0) {
        await (supabase as any)
          .from("project_milestones")
          .insert(
            validMilestones.map((m, i) => ({
              project_id: project.id,
              title: m.title,
              due_date: m.due_date || null,
              amount: parseFloat(m.amount) || 0,
              order_index: i,
              status: "pending",
            }))
          );
      }

      // Update application to offer_sent
      await (supabase as any)
        .from("job_applications")
        .update({ status: "offer_sent" })
        .eq("id", applicationId);

      // Create notification for talent
      await (supabase as any)
        .from("notifications")
        .insert({
          user_id: talentId,
          type: "offer",
          title: "You received an offer!",
          body: `A client has sent you an offer for "${jobTitle}". Review and respond.`,
          link: `/projects/${project.id}`,
        });

      // Open conversation
      const { data: convo } = await (supabase as any)
        .from("marketplace_conversations")
        .insert({
          client_id: clientProfile?.id || user.id,
          talent_id: talentId,
          job_id: null,
          status: "active",
        })
        .select()
        .single();

      if (convo) {
        const offerSummary = `**Offer Sent** 🎉\n\nProject: ${jobTitle}\nScope: ${scope}\nRate: ${currency} ${amount} (${rateType})\nTimeline: ${timeline}\nStart Date: ${startDate || "Flexible"}${terms ? `\n\nTerms: ${terms}` : ""}`;
        await (supabase as any)
          .from("marketplace_messages")
          .insert({
            conversation_id: convo.id,
            sender_id: user.id,
            content: offerSummary,
          });
      }

      toast({
        title: "Offer sent!",
        description: `Your offer has been sent to ${talentName}.`,
      });

      onClose();
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      toast({ title: "Failed to send offer", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Offer to {talentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">{jobTitle}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Project Scope */}
          <div className="space-y-2">
            <Label>Project Scope <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe what you need done..."
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={3}
            />
          </div>

          {/* Rate */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select value={rateType} onValueChange={(v) => setRateType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeline & Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Timeline <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 2 weeks"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Milestones</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addMilestone}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Milestone title"
                      value={m.title}
                      onChange={(e) => updateMilestone(i, "title", e.target.value)}
                      className="col-span-1"
                    />
                    <Input
                      type="date"
                      value={m.due_date}
                      onChange={(e) => updateMilestone(i, "due_date", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={m.amount}
                      onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                    />
                  </div>
                  {milestones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive mt-0"
                      onClick={() => removeMilestone(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Terms */}
          <div className="space-y-2">
            <Label>Additional Terms (optional)</Label>
            <Textarea
              placeholder="Any specific conditions or agreements..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : "Send Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
