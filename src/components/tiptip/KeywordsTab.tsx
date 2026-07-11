// Keyword & topic map (Doc 3), grouped by intent tier. Track coverage.
import { HelpCircle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { TiptipData } from "@/pages/Tiptip";
import { updateKeyword, type TiptipKeyword } from "@/lib/tiptip/api";
import { TIER_LABEL } from "./shared";

const KW_STATUS = ["planned", "next", "covered"] as const;
const KW_STATUS_STYLE: Record<string, string> = {
  planned: "text-muted-foreground",
  next: "text-blue-500",
  covered: "text-green-600",
};

export function KeywordsTab({ data, reload }: { data: TiptipData; reload: () => Promise<void> }) {
  const { toast } = useToast();

  async function setStatus(k: TiptipKeyword, status: string) {
    const { error } = await updateKeyword(k.id, { status: status as TiptipKeyword["status"] });
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    await reload();
  }

  return (
    <div className="space-y-6">
      {[1, 2, 3].map((tier) => {
        const items = data.keywords.filter((k) => k.tier === tier);
        if (items.length === 0) return null;
        return (
          <div key={tier}>
            <h3 className="text-[13px] font-semibold mb-2">{TIER_LABEL[tier]}</h3>
            <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
              {items.map((k) => (
                <div key={k.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {k.is_question && <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <span className="text-[13px] truncate">{k.keyword}</span>
                  </div>
                  <Select value={k.status} onValueChange={(v) => setStatus(k, v)}>
                    <SelectTrigger className={`h-7 w-28 text-[12px] ${KW_STATUS_STYLE[k.status]}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KW_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
