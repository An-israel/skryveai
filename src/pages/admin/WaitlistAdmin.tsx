import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, TrendingUp, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string) => (supabase as any).rpc(name);

interface Stats {
  total: number;
  last_7_days: number;
  referred: number;
  by_skill: { skill: string | null; count: number }[];
  by_country: { country: string | null; count: number }[];
  top_referrers: { email: string; referrals: number }[];
}

export default function WaitlistAdmin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    rpc("waitlist_admin_stats").then(({ data, error }: { data: Stats | null; error: unknown }) => {
      if (error || !data) setDenied(true);
      else setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (denied || !stats) {
    return (
      <div className="container mx-auto max-w-lg py-24 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin")}>Back to Admin</Button>
      </div>
    );
  }

  const tiles = [
    { label: "Total on waitlist", value: stats.total, icon: Users },
    { label: "Joined this week", value: stats.last_7_days, icon: TrendingUp },
    { label: "Came via referral", value: stats.referred, icon: Share2 },
  ];

  return (
    <main className="container mx-auto max-w-3xl px-0 pb-12">
      <div className="mb-6 flex items-center gap-3 pt-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-sm text-muted-foreground">The supply-side traction number.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><t.icon className="h-3.5 w-3.5" />{t.label}</div>
              <div className="mt-1 text-3xl font-bold">{t.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By skill</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {stats.by_skill.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {stats.by_skill.map((r) => (
              <div key={r.skill ?? "—"} className="flex justify-between text-sm">
                <span className="truncate">{r.skill ?? "—"}</span><span className="font-medium">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By country</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {stats.by_country.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {stats.by_country.map((r) => (
              <div key={r.country ?? "—"} className="flex justify-between text-sm">
                <span className="truncate">{r.country ?? "—"}</span><span className="font-medium">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Top referrers</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {stats.top_referrers.length === 0 && <p className="text-sm text-muted-foreground">No referrals yet.</p>}
            {stats.top_referrers.map((r) => (
              <div key={r.email} className="flex justify-between text-sm">
                <span className="truncate">{r.email}</span><span className="font-medium">{r.referrals} referrals</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
