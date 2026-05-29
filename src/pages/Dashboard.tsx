import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditsDisplay } from "@/components/dashboard/CreditsDisplay";
import { SubscriptionStats } from "@/components/dashboard/SubscriptionStats";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ReferralCard } from "@/components/dashboard/ReferralCard";
import { FeatureUpdatePopup } from "@/components/notifications/FeatureUpdatePopup";
import { UIRefreshPopup } from "@/components/notifications/UIRefreshPopup";
import { MotivationalPopup } from "@/components/notifications/MotivationalPopup";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  Briefcase, CalendarDays, BookOpen, FileText, TrendingUp,
  ArrowRight, ChevronRight, Gift, Zap, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const quickActions = [
  { label: "Find Jobs",       icon: Briefcase,    to: "/jobs",            primary: true,  badge: null          },
  { label: "Events",          icon: CalendarDays, to: "/events",          primary: false, badge: null          },
  { label: "Learn",           icon: BookOpen,     to: "/learn",           primary: false, badge: null          },
  { label: "CV Builder",      icon: FileText,     to: "/cv-builder",      primary: false, badge: null          },
  { label: "Refer & Earn",    icon: Gift,         to: "/referrals",       primary: false, badge: null          },
];

const comingSoon = [
  {
    icon: Users,
    title: "Freelance Marketplace",
    desc: "Browse talent profiles or get discovered by clients. AI-powered matching.",
    color: "from-violet-500/10 to-purple-500/5",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Briefcase,
    title: "Job Aggregator",
    desc: "Jobs from Upwork, LinkedIn, Indeed, Jobberman, Remote OK and 5+ more — in one feed.",
    color: "from-blue-500/10 to-cyan-500/5",
    border: "border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: CalendarDays,
    title: "Events Hub",
    desc: "Discover and post professional events — webinars, workshops, conferences, and hackathons.",
    color: "from-emerald-500/10 to-teal-500/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showTour, showWizard, markOnboardingComplete } = useOnboarding(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser(session.user);
      else navigate("/login");
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
      else navigate("/login");
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <UIRefreshPopup />
      <FeatureUpdatePopup />
      <MotivationalPopup />

      {showWizard && user && (
        <OnboardingWizard
          userId={user.id}
          userEmail={user.email || ""}
          userName={user.user_metadata?.full_name || "User"}
          onComplete={markOnboardingComplete}
        />
      )}
      {showTour && !showWizard && <OnboardingTour onComplete={markOnboardingComplete} />}

      <main className="container mx-auto px-0 pb-8">

        {/* ── Welcome Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your complete freelance ecosystem — find work, learn, grow.
          </p>
        </motion.div>

        {/* ── Subscription + Credits ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <SubscriptionStats />
          <CreditsDisplay userId={user?.id} />
        </motion.div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">

            {/* Coming Soon: New Features */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg tracking-tight">What's coming to your dashboard</h2>
                <Badge variant="secondary" className="text-xs">Building now</Badge>
              </div>
              <div className="grid gap-4">
                {comingSoon.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.06 }}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${item.border} bg-gradient-to-br ${item.color}`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center shrink-0 ${item.iconColor}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">{item.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-amber-500/40 text-amber-500">SOON</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                    <Zap className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Activity Feed */}
            {user && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <ActivityFeed userId={user.id} />
              </motion.div>
            )}
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
              <Card className="border-border-subtle">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base font-bold tracking-tight">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {quickActions.map(({ label, icon: Icon, to, primary }) => (
                    <Button
                      key={label}
                      asChild
                      variant={primary ? "default" : "outline"}
                      className="w-full justify-between"
                    >
                      <Link to={to}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" /> {label}
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Tools */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-border-subtle">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base font-bold tracking-tight">Professional Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {[
                    { label: "CV Builder",          to: "/cv-builder",         icon: FileText   },
                    { label: "ATS Score Checker",   to: "/ats-checker",        icon: TrendingUp },
                    { label: "LinkedIn Analyzer",   to: "/linkedin-analyzer",  icon: ArrowRight },
                  ].map(({ label, to, icon: Icon }) => (
                    <Button key={label} asChild variant="ghost" className="w-full justify-between text-sm">
                      <Link to={to}>
                        <span className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                          <Icon className="w-4 h-4" /> {label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Referral Card */}
            {user && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                <ReferralCard userId={user.id} />
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
