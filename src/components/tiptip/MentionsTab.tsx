// Brand-mention queue (Doc 1) — AI-drafted posts for Reddit/forums/LinkedIn/X.
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { TiptipData } from "@/pages/Tiptip";
import { updateMention, deleteMention, type TiptipMention } from "@/lib/tiptip/api";

const M_STATUS = ["draft", "ready", "posted"] as const;
const PLATFORM_STYLE: Record<string, string> = {
  reddit: "bg-orange-500/10 text-orange-600",
  linkedin: "bg-blue-500/10 text-blue-600",
  x: "bg-slate-500/10 text-slate-500",
  forum: "bg-violet-500/10 text-violet-600",
  guest_post: "bg-emerald-500/10 text-emerald-600",
};

export function MentionsTab({ data, reload }: { data: TiptipData; reload: () => Promise<void> }) {
  const { toast } = useToast();

  async function setStatus(m: TiptipMention, status: string) {
    await updateMention(m.id, { status: status as TiptipMention["status"] });
    await reload();
  }
  async function remove(id: string) {
    if (!confirm("Delete this draft?")) return;
    await deleteMention(id);
    await reload();
  }
  function copy(m: TiptipMention) {
    navigator.clipboard.writeText(`${m.title ? m.title + "\n\n" : ""}${m.body}`);
    toast({ title: "Copied" });
  }

  if (data.mentions.length === 0) {
    return (
      <div className="border border-border rounded-xl bg-card p-8 text-center">
        <p className="text-[13px] text-muted-foreground">
          No brand-mention drafts yet. Open a piece in the Content tab and hit <b>Mentions</b> to generate some.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.mentions.map((m) => (
        <div key={m.id} className="border border-border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${PLATFORM_STYLE[m.platform] || "bg-muted text-muted-foreground"}`}>
              {m.platform}
            </span>
            {m.target && <span className="text-[11px] text-muted-foreground">{m.target}</span>}
            <div className="flex-1" />
            <Select value={m.status} onValueChange={(v) => setStatus(m, v)}>
              <SelectTrigger className="h-7 w-24 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>{M_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(m)}><Copy className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
          {m.title && <p className="text-[13px] font-medium mb-1">{m.title}</p>}
          <p className="text-[13px] text-muted-foreground whitespace-pre-line">{m.body}</p>
          {m.rules_note && <p className="text-[11px] text-amber-600 mt-2">⚠ {m.rules_note}</p>}
        </div>
      ))}
    </div>
  );
}
