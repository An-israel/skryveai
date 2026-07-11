// Weekly summary: what's ready to publish, what's next, and progress at a glance.
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, Rocket, ListTodo } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TiptipData } from "@/pages/Tiptip";
import { StatusPill } from "./shared";

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="border border-border rounded-xl bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function OverviewTab({ data, loading }: { data: TiptipData; loading: boolean }) {
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const { content, mentions, tasks } = data;
  const ready = content.filter((c) => c.status === "ready");
  const published = content.filter((c) => c.status === "published");
  const drafting = content.filter((c) => c.status === "drafting");
  const ideas = content.filter((c) => c.status === "idea");
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const taskPct = tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0;
  const mentionsReady = mentions.filter((m) => m.status !== "posted").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ready to publish" value={ready.length} icon={Rocket} />
        <Stat label="Published" value={published.length} icon={CheckCircle2} />
        <Stat label="In progress" value={drafting.length + ideas.length} icon={FileText} />
        <Stat label="Mentions queued" value={mentionsReady} icon={ListTodo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold">Ready to publish now</span>
          </div>
          {ready.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
              Nothing ready yet. Generate a piece in the Content tab.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {ready.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.target_keyword}</p>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border rounded-xl bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold">Technical SEO progress</span>
            <span className="font-mono text-[12px] text-muted-foreground">{tasksDone}/{tasks.length}</span>
          </div>
          <Progress value={taskPct} className="h-2" />
          <p className="text-[12px] text-muted-foreground mt-3">
            The one-time technical foundation from Doc 2. Do this in Month 1 alongside the content engine.
          </p>
          <Link to="#" className="text-[12px] text-primary hover:underline mt-2 inline-block">
            Open the Technical SEO tab →
          </Link>
        </div>
      </div>
    </div>
  );
}
