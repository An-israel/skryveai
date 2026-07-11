// 3-month content calendar (Doc 3), grouped by month and week.
import type { TiptipData } from "@/pages/Tiptip";
import { StatusPill } from "./shared";

const MONTH_TITLE: Record<number, string> = {
  1: "Month 1 — Foundation + High-Intent",
  2: "Month 2 — Depth + Category Pages",
  3: "Month 3 — Authority + Freshness",
};

export function CalendarTab({ data }: { data: TiptipData; reload: () => Promise<void> }) {
  const byMonth = [1, 2, 3].map((m) => ({
    month: m,
    items: data.content
      .filter((c) => c.calendar_month === m)
      .sort((a, b) => (a.calendar_week ?? 0) - (b.calendar_week ?? 0) || a.priority - b.priority),
  }));
  const uncal = data.content.filter((c) => !c.calendar_month);

  return (
    <div className="space-y-6">
      {byMonth.map(({ month, items }) => (
        <div key={month}>
          <h3 className="text-[13px] font-semibold mb-2">{MONTH_TITLE[month]}</h3>
          <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-12 shrink-0 text-[11px] font-mono text-muted-foreground">Wk {c.calendar_week}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    <span className="uppercase">{c.kind}</span>{c.target_keyword ? ` · ${c.target_keyword}` : ""}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </div>
            ))}
            {items.length === 0 && <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">No items.</p>}
          </div>
        </div>
      ))}

      {uncal.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold mb-2">Unscheduled</h3>
          <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
            {uncal.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0"><p className="text-[13px] font-medium truncate">{c.title}</p></div>
                <StatusPill status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
