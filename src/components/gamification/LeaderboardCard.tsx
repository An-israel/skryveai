// Top-talents leaderboard (points from real actions). Highlights the current
// user's row so newcomers see where they stand and how to climb.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { fetchLeaderboard, type LeaderboardRow } from "@/lib/gamification/api";

const MEDAL = ["🥇", "🥈", "🥉"];

export function LeaderboardCard({ currentUserId }: { currentUserId?: string }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchLeaderboard(10).then((r) => { setRows(r); setLoaded(true); });
  }, []);

  if (loaded && rows.length < 3) return null; // not enough signal yet

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-[13px] font-semibold text-foreground">Top talents</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const me = r.user_id === currentUserId;
          return (
            <Link
              key={r.user_id}
              to={`/profile/${r.user_id}`}
              className={`flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40 ${me ? "bg-primary/5" : ""}`}
            >
              <span className="w-6 text-center text-[13px] font-mono text-muted-foreground shrink-0">
                {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
              </span>
              <div className="w-7 h-7 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                {r.avatar ? <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" /> : (r.name?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{r.name}{me && " (you)"}</p>
                <p className="text-[11px] text-muted-foreground">{r.level_name}</p>
              </div>
              <span className="font-mono text-[12px] text-primary shrink-0">{r.total_points.toLocaleString()}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
