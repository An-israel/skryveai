import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow, format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  paystack_ref: string | null;
}

interface BillingRecord {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  paystack_ref: string | null;
  invoice_url: string | null;
  created_at: string;
}

// ── Plan config ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "Free",
    features: [
      "10 applications/month",
      "20 saved jobs",
      "5 AI proposals",
      "Limited events",
      "Certificates",
    ],
    limits: { apps: 10, saved: 20, ai: 5 },
  },
  {
    id: "pro",
    name: "Pro",
    price: 4999,
    priceLabel: "₦4,999/mo",
    features: [
      "Unlimited applications",
      "Unlimited saved jobs",
      "Unlimited AI proposals",
      "All events",
      "Certificates",
      "Priority support",
    ],
    limits: { apps: Infinity, saved: Infinity, ai: Infinity },
  },
  {
    id: "business",
    name: "Business",
    price: 12999,
    priceLabel: "₦12,999/mo",
    features: [
      "Unlimited applications",
      "Unlimited saved jobs",
      "Unlimited AI proposals",
      "All events",
      "Certificates",
      "5 Team members",
      "Priority support",
    ],
    limits: { apps: Infinity, saved: Infinity, ai: Infinity },
  },
];

const FEATURE_ROWS = [
  {
    label: "Applications/month",
    free: "10",
    pro: "Unlimited",
    business: "Unlimited",
  },
  { label: "Saved jobs", free: "20", pro: "Unlimited", business: "Unlimited" },
  {
    label: "AI proposals",
    free: "5",
    pro: "Unlimited",
    business: "Unlimited",
  },
  { label: "Events", free: "Limited", pro: "All", business: "All" },
  { label: "Certificates", free: "✓", pro: "✓", business: "✓" },
  { label: "Team members", free: "–", pro: "–", business: "5" },
  { label: "Priority support", free: "–", pro: "✓", business: "✓" },
];

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: any) => { openIframe: () => void };
    };
  }
}

export default function Billing() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);

  const [usageApps, setUsageApps] = useState(0);
  const [usageSaved, setUsageSaved] = useState(0);
  const [usageAI, setUsageAI] = useState(0);

  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate("/login");
        return;
      }
      const uid = data.user.id;
      setUserId(uid);
      setUserEmail(data.user.email || "");

      await Promise.all([
        loadSubscription(uid),
        loadBillingHistory(uid),
        loadUsage(uid),
      ]);

      setLoading(false);
    });
  }, [navigate]);

  const loadSubscription = async (uid: string) => {
    const { data } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    setSubscription(data || null);
  };

  const loadBillingHistory = async (uid: string) => {
    const { data } = await (supabase as any)
      .from("billing_history")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    setBillingHistory(data || []);
  };

  const loadUsage = async (uid: string) => {
    const monthStart = startOfMonth(new Date()).toISOString();

    const [{ count: apps }, { count: saved }, { count: aiApps }] =
      await Promise.all([
        (supabase as any)
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .gte("created_at", monthStart),
        (supabase as any)
          .from("saved_jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        (supabase as any)
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .not("proposal_text", "is", null)
          .gte("created_at", monthStart),
      ]);

    setUsageApps(apps || 0);
    setUsageSaved(saved || 0);
    setUsageAI(aiApps || 0);
  };

  // ── Upgrade via Paystack ───────────────────────────────────────────────────────

  const handleUpgrade = (planId: string, amount: number) => {
    if (!userId) return;
    setProcessingPlan(planId);

    const ref = `skryve_${planId}_${Date.now()}`;

    if (!window.PaystackPop) {
      toast({
        title: "Paystack not loaded",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      setProcessingPlan(null);
      return;
    }

    window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
      email: userEmail,
      amount: amount * 100, // kobo
      currency: "NGN",
      ref,
      callback: async (response: { reference: string }) => {
        // Record billing history
        await (supabase as any).from("billing_history").insert({
          user_id: userId,
          plan: planId,
          amount,
          currency: "NGN",
          status: "paid",
          paystack_ref: response.reference,
        });

        // Upsert subscription
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await (supabase as any).from("subscriptions").upsert(
          {
            user_id: userId,
            plan: planId,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: nextMonth.toISOString(),
            cancel_at_period_end: false,
            paystack_ref: response.reference,
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );

        await loadSubscription(userId);
        await loadBillingHistory(userId);
        toast({ title: "Subscription activated!", description: `Welcome to ${planId} plan.` });
        setProcessingPlan(null);
      },
      onClose: () => {
        setProcessingPlan(null);
      },
    }).openIframe();
  };

  const cancelSubscription = async () => {
    if (!userId) return;
    setCancelling(true);
    await (supabase as any)
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await loadSubscription(userId);
    setCancelling(false);
    setShowCancelDialog(false);
    toast({ title: "Subscription will cancel at period end." });
  };

  // ── Derived ────────────────────────────────────────────────────────────────────

  const currentPlan =
    PLANS.find((p) => p.id === (subscription?.plan || "free")) || PLANS[0];
  const isFreePlan = !subscription || subscription.plan === "free";

  const usageRows = [
    {
      label: "Applications sent this month",
      used: usageApps,
      limit: currentPlan.limits.apps,
    },
    {
      label: "Jobs saved",
      used: usageSaved,
      limit: currentPlan.limits.saved,
    },
    {
      label: "AI proposals used",
      used: usageAI,
      limit: currentPlan.limits.ai,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>

        {/* Current Plan */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-base">Current Plan</h2>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  className={
                    currentPlan.id === "free"
                      ? "bg-muted text-muted-foreground"
                      : currentPlan.id === "business"
                      ? "bg-purple-600 text-white"
                      : "bg-blue-600 text-white"
                  }
                >
                  {currentPlan.name}
                </Badge>
                {subscription && (
                  <Badge
                    variant={
                      subscription.status === "active" ? "default" : "destructive"
                    }
                  >
                    {subscription.cancel_at_period_end
                      ? "Cancelling"
                      : subscription.status}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{currentPlan.priceLabel}</p>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renews{" "}
                  {format(
                    new Date(subscription.current_period_end),
                    "MMM d, yyyy"
                  )}
                </p>
              )}
            </div>
          </div>

          <ul className="grid sm:grid-cols-2 gap-2">
            {currentPlan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {!isFreePlan && !subscription?.cancel_at_period_end && (
            <div className="pt-2 border-t">
              <button
                className="text-sm text-destructive hover:underline"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel subscription
              </button>
            </div>
          )}
          {subscription?.cancel_at_period_end && subscription.current_period_end && (
            <p className="text-sm text-muted-foreground pt-2 border-t">
              Your subscription will end on{" "}
              {format(new Date(subscription.current_period_end), "MMM d, yyyy")}.
            </p>
          )}
        </section>

        {/* Usage Meters */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-base">Usage This Month</h2>
          {usageRows.map((row) => {
            const isUnlimited = row.limit === Infinity;
            const pct = isUnlimited ? 0 : Math.min((row.used / row.limit) * 100, 100);
            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.used}
                    {isUnlimited ? " (unlimited)" : ` / ${row.limit}`}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress
                    value={pct}
                    className={`h-2 ${pct >= 90 ? "[&>div]:bg-destructive" : "[&>div]:bg-blue-600"}`}
                  />
                )}
              </div>
            );
          })}
        </section>

        {/* Plan comparison */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4 overflow-x-auto">
          <h2 className="font-semibold text-base">Compare Plans</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-40">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.id}
                    className={`text-center py-2 px-3 font-semibold rounded-t-md ${
                      p.id === currentPlan.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    }`}
                  >
                    <div>{p.name}</div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                      {p.priceLabel}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className={i % 2 === 0 ? "bg-muted/30" : ""}
                >
                  <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                  <td className={`text-center py-2 px-3 ${currentPlan.id === "free" ? "font-semibold text-primary" : ""}`}>
                    {row.free}
                  </td>
                  <td className={`text-center py-2 px-3 ${currentPlan.id === "pro" ? "font-semibold text-primary" : ""}`}>
                    {row.pro}
                  </td>
                  <td className={`text-center py-2 px-3 ${currentPlan.id === "business" ? "font-semibold text-primary" : ""}`}>
                    {row.business}
                  </td>
                </tr>
              ))}
              {/* Upgrade row */}
              <tr>
                <td className="pt-4" />
                {PLANS.map((p) => (
                  <td key={p.id} className="text-center pt-4 px-3">
                    {p.id === currentPlan.id ? (
                      <Badge variant="outline">Current</Badge>
                    ) : p.price > 0 ? (
                      <Button
                        size="sm"
                        onClick={() => handleUpgrade(p.id, p.price)}
                        disabled={processingPlan === p.id}
                      >
                        {processingPlan === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : null}
                        Upgrade
                      </Button>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        {/* Billing History */}
        {billingHistory.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-base">Billing History</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">
                        {format(new Date(record.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {record.plan}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.currency} {record.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "paid"
                              ? "default"
                              : record.status === "refunded"
                              ? "secondary"
                              : "destructive"
                          }
                          className="capitalize"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.invoice_url ? (
                          <a
                            href={record.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* Cancel dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                Your subscription will remain active until the end of the current
                billing period. After that, you'll be moved to the Free plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep subscription</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={cancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}
