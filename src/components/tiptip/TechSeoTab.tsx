// Technical-SEO checklist (Doc 2). One-time foundation; tick off once.
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TiptipData } from "@/pages/Tiptip";
import { updateTask, type TiptipTask, type TaskStatus } from "@/lib/tiptip/api";
import { AUTO_LABEL, AUTO_STYLE } from "./shared";

const NEXT: Record<TaskStatus, TaskStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };

export function TechSeoTab({ data, reload }: { data: TiptipData; reload: () => Promise<void> }) {
  const { toast } = useToast();

  async function cycle(t: TiptipTask) {
    const { error } = await updateTask(t.id, { status: NEXT[t.status] });
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    await reload();
  }

  const categories = [...new Set(data.tasks.map((t) => t.category || "Other"))];

  return (
    <div className="space-y-6">
      <p className="text-[12px] text-muted-foreground">
        The one-time technical foundation that makes the content engine actually rank. Do this in Month 1.
        Click a row to cycle its status. Items I ship as code are marked <b>AUTO</b>; the rest need a human.
      </p>
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-[13px] font-semibold mb-2">{cat}</h3>
          <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
            {data.tasks.filter((t) => (t.category || "Other") === cat).map((t) => (
              <button key={t.id} onClick={() => cycle(t)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors">
                {t.status === "done"
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  : t.status === "in_progress"
                    ? <CircleDot className="w-4 h-4 text-blue-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                <span className={`flex-1 text-[13px] ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.label}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${AUTO_STYLE[t.auto_type]}`}>
                  {AUTO_LABEL[t.auto_type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
