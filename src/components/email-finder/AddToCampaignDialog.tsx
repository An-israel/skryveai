import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CampaignRow {
  id: string;
  name: string;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  companyName?: string;
  domain?: string | null;
}

export function AddToCampaignDialog({ open, onOpenChange, email, companyName, domain }: Props) {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("__new__");
  const [businessName, setBusinessName] = useState(companyName || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusinessName(companyName || domain || "");
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .eq("user_id", user.id)
        .in("status", ["draft", "searching", "analyzing", "pitching"])
        .order("created_at", { ascending: false })
        .limit(20);
      setCampaigns(data || []);
      setLoading(false);
    })();
  }, [open, companyName, domain]);

  const handleAdd = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter a business name");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let campaignId = selectedId;
      if (selectedId === "__new__") {
        const { data: campaign, error: cErr } = await supabase
          .from("campaigns")
          .insert({
            user_id: user.id,
            name: `Email Finder — ${businessName}`,
            business_type: domain || "manual",
            location: "manual",
            status: "draft",
            campaign_type: "direct_client",
          })
          .select()
          .single();
        if (cErr) throw cErr;
        campaignId = campaign.id;
      }

      const { error: bErr } = await supabase.from("businesses").insert({
        campaign_id: campaignId,
        name: businessName,
        address: domain || "—",
        website: domain ? `https://${domain}` : null,
        email,
        selected: true,
      });
      if (bErr) throw bErr;

      toast.success("Added to campaign");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Campaign</DialogTitle>
          <DialogDescription>
            Add <span className="font-mono text-foreground">{email}</span> to a draft campaign or create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label>Campaign</Label>
            {loading ? (
              <div className="flex items-center text-sm text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">+ Create new draft campaign</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} <span className="text-xs text-muted-foreground ml-1">({c.status})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleAdd} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
