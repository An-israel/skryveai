import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth } from "date-fns";
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
  Check,
  Loader2,
  ExternalLink,
  Minus,
  CreditCard,
  Zap,
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
  { label: "Applications/month", free: "10",      pro: "Unlimited", business: "Unlimited" },
  { label: "Saved jobs",         free: "20",      pro: "Unlimited", business: "Unlimited" },
  { label: "AI proposals",       free: "5",       pro: "Unlimited", business: "Unlimited" },
  { label: "Events",             free: "Limited", pro: "All",       business: "All"       },
  { label: "Certificates",       free: "✓",       pro: "✓",         business: "✓"         },
  { label: "Team members",       free: "–",       pro: "–",         business: "5"         },
  { label: "Priority support",   free: "–",       pro: "✓",         business: "✓"         },
];

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: any) => { openIframe: () => void };
    };
  }
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden mb-4">
      {children}
    </div>
  );
}

function PanelHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 border-b border-border flex items-start justify-between gap-3">
      <div>
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function PanelBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

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
        await (supabase as any).from("billing_history").insert({
          user_id: userId,
          plan: planId,
          amount,
          currency: "NGN",
          status: "paid",
          paystack_ref: response.reference,
        });

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
    { label: "Applications sent this month", used: usageApps,  limit: currentPlan.limits.apps  },
    { label: "Jobs saved",                   used: usageSaved, limit: currentPlan.limits.saved },
    { label: "AI proposals used",            used: usageAI,    limit: currentPlan.limits.ai    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Status dot helper ──────────────────────────────────────────────────────────

  const statusColor = subscription?.cancel_at_period_end
    ? "bg-amber-500"
    : subscription?.status === "active"
    ? "bg-emerald-500"
    : "bg-muted-foreground";

  const statusLabel = subscription?.cancel_at_period_end
    ? "Cancelling"
    : subscription?.status === "active"
    ? "Active"
    : isFreePlan
    ? "Free"
    : subscription?.status ?? "Free";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Billing</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage your subscription, usage, and payment history
        </p>
      </div>

      {/* ── Current Plan ── */}
      <Panel>
        <PanelHeader
          title="Current Plan"
          sub="Your active subscription"
          action={
            isFreePlan ? (
              <button
                onClick={() => handleUpgrade("pro", 4999)}
                disabled={!!processingPlan}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {processingPlan === "pro" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Zap className="w-3.5 h-3.5" />
                Upgrade to Pro
              </button>
            ) : !subscription?.cancel_at_period_end ? (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-[13px] font-medium hover:bg-destructive/10 transition-colors"
              >
                Cancel plan
              </button>
            ) : null
          }
        />
        <PanelBody>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-foreground">{currentPlan.name}</p>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                    {statusLabel}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">{currentPlan.priceLabel}</p>
              </div>
            </div>
            {subscription?.current_period_end && (
              <div className="text-right">
                <p className="text-[12px] text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Ends on" : "Renews on"}
                </p>
                <p className="text-[13px] font-medium text-foreground mt-0.5">
                  {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-border">
            {currentPlan.features.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[13px] text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {/* ── Usage Meters ── */}
      <Panel>
        <PanelHeader title="Usage This Month" sub="Your current usage against plan limits" />
        <PanelBody>
          {usageRows.map((row) => {
            const isUnlimited = row.limit === Infinity;
            const pct = isUnlimited ? 0 : Math.min((row.used / row.limit) * 100, 100);
            return (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-foreground">{row.label}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {row.used}
                    {isUnlimited ? " · unlimited" : ` / ${row.limit}`}
                  </p>
                </div>
                {!isUnlimited && (
                  <Progress
                    value={pct}
                    className={`h-1.5 ${pct >= 90 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
                  />
                )}
              </div>
            );
          })}
        </PanelBody>
      </Panel>

      {/* ── Plan Comparison ── */}
      <Panel>
        <PanelHeader title="Compare Plans" sub="Choose the plan that fits your needs" />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[12px] font-medium text-muted-foreground w-44">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.id}
                    className={`text-center px-4 py-3 font-semibold ${
                      p.id === currentPlan.id ? "text-primary" : "text-foreground"
                    }`}
                  >
                    <div className="text-[13px]">{p.name}</div>
                    <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                      {p.priceLabel}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.label} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.label}</td>
                  <td className={`text-center px-4 py-2.5 ${currentPlan.id === "free" ? "font-semibold text-primary" : ""}`}>
                    {row.free}
                  </td>
                  <td className={`text-center px-4 py-2.5 ${currentPlan.id === "pro" ? "font-semibold text-primary" : ""}`}>
                    {row.pro}
                  </td>
                  <td className={`text-center px-4 py-2.5 ${currentPlan.id === "business" ? "font-semibold text-primary" : ""}`}>
                    {row.business}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-5 pt-4 pb-4" />
                {PLANS.map((p) => (
                  <td key={p.id} className="text-center px-4 pt-4 pb-4">
                    {p.id === currentPlan.id ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-muted-foreground">
                        Current plan
                      </span>
                    ) : p.price > 0 ? (
                      <button
                        onClick={() => handleUpgrade(p.id, p.price)}
                        disabled={!!processingPlan}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {processingPlan === p.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Upgrade
                      </button>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Billing History ── */}
      {billingHistory.length > 0 && (
        <Panel>
          <PanelHeader title="Billing History" sub="Your past invoices and payments" />
          <div className="divide-y divide-border">
            {billingHistory.map((record) => (
              <div key={record.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground capitalize">{record.plan} plan</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {format(new Date(record.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <p className="text-[13px] font-medium text-foreground shrink-0">
                  {record.currency} {record.amount.toLocaleString()}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                    record.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : record.status === "refunded"
                      ? "bg-muted text-muted-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {record.status}
                </span>
                <div className="w-14 flex justify-end shrink-0">
                  {record.invoice_url ? (
                    <a
                      href={record.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[12px] text-primary hover:underline"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Cancel dialog ── */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              After that, you'll be moved to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={cancelSubscription}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
