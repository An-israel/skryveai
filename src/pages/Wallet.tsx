import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Coins, Sparkles, Lock, TrendingUp, Gift, History as HistoryIcon,
  ArrowUpRight, ArrowDownRight, Clock, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/hooks/useWallet";
import { reasonLabel, type SpendItem } from "@/lib/credits/api";

function fmt(n: number) {
  return n.toLocaleString();
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Wallet() {
  const navigate = useNavigate();
  const { balance, history, rules, items, loading, buy } = useWallet();
  const [buying, setBuying] = useState<string | null>(null);

  const onBuy = async (item: SpendItem) => {
    setBuying(item.item_key);
    await buy(item);
    setBuying(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const credits = balance?.credits ?? 0;

  return (
    <main className="container mx-auto px-0 pb-10 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Wallet & Rewards</h1>
            <p className="text-sm text-muted-foreground">
              Earn credits for real progress. Spend them on perks that move your career.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Balance card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Coins className="w-4 h-4" /> Your credits
                </div>
                <div className="mt-1 text-4xl font-bold tracking-tight">{fmt(credits)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {fmt(balance?.lifetime ?? 0)} earned all-time
                </div>
              </div>
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="earn" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earn"><TrendingUp className="w-4 h-4 mr-1.5" />Earn</TabsTrigger>
          <TabsTrigger value="store"><Store className="w-4 h-4 mr-1.5" />Store</TabsTrigger>
          <TabsTrigger value="history"><HistoryIcon className="w-4 h-4 mr-1.5" />History</TabsTrigger>
        </TabsList>

        {/* Ways to earn */}
        <TabsContent value="earn" className="mt-4 space-y-3">
          {rules.map((r) => (
            <Card key={r.action_key}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.description ?? reasonLabel(r.action_key)}</p>
                  {r.daily_cap != null && (
                    <p className="text-xs text-muted-foreground">Up to {r.daily_cap}× per day</p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 gap-1 whitespace-nowrap">
                  <Coins className="w-3 h-3" /> +{fmt(r.credit_amount)}
                </Badge>
              </CardContent>
            </Card>
          ))}

          {/* Cash rewards — Phase 2, locked */}
          <Card className="border-dashed">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Cash rewards — coming soon</p>
                <p className="text-sm text-muted-foreground">
                  When it launches, a share of every real completed job funds a cash balance you can withdraw.
                  Credits stay in-platform; cash is a separate, job-backed pool — so rewards can never be farmed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store */}
        <TabsContent value="store" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((it) => {
              const affordable = credits >= it.cost_credits;
              return (
                <Card key={it.item_key} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" /> {it.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{it.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold">
                        <Coins className="w-4 h-4 text-primary" /> {fmt(it.cost_credits)}
                      </span>
                      <Button
                        size="sm"
                        disabled={!affordable || buying === it.item_key}
                        onClick={() => onBuy(it)}
                      >
                        {buying === it.item_key ? "..." : affordable ? "Redeem" : "Not enough"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              No activity yet. Earn your first credits by completing your profile or checking in daily.
            </CardContent></Card>
          ) : (
            <Card><CardContent className="divide-y p-0">
              {history.map((t) => {
                const earned = t.type === "earn";
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${earned ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {earned ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{reasonLabel(t.reason)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {timeAgo(t.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 font-semibold ${earned ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {earned ? "+" : "−"}{fmt(t.amount)}
                    </span>
                  </div>
                );
              })}
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
