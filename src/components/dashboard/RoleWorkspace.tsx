import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  PenSquare, Headphones, TrendingUp, Megaphone, Sparkles,
  ArrowRight, BookOpen, FileText, Briefcase, MessageSquare, CalendarDays,
  BarChart3, Target, Users, type LucideIcon,
} from "lucide-react";

interface Action { label: string; to: string; icon: LucideIcon }
interface RoleConfig {
  key: string;
  match: RegExp;
  title: string;
  icon: LucideIcon;
  accent: string; // tailwind gradient classes
  blurb: string;
  actions: Action[];
  tips: string[];
}

// Each role keys off the talent's primary skill and surfaces a tailored toolkit.
const ROLES: RoleConfig[] = [
  {
    key: "content",
    match: /content|copywrit|writer|writing|editor|blogg|journalis/i,
    title: "Content Writer Workspace",
    icon: PenSquare,
    accent: "from-rose-500/15 to-orange-500/10 text-rose-500",
    blurb: "Draft, format and publish articles — then land writing gigs.",
    actions: [
      { label: "Open Studio", to: "/studio", icon: PenSquare },
      { label: "Writing jobs", to: "/jobs", icon: Briefcase },
      { label: "Build your CV", to: "/cv-builder", icon: FileText },
      { label: "Improve your craft", to: "/learn", icon: BookOpen },
    ],
    tips: [
      "Publish 1–2 portfolio pieces in Studio to show range.",
      "Pitch with a link to a live post, not an attachment.",
    ],
  },
  {
    key: "support",
    match: /customer service|customer support|support|success|helpdesk|call center|virtual assistant/i,
    title: "Customer Service Workspace",
    icon: Headphones,
    accent: "from-sky-500/15 to-cyan-500/10 text-sky-500",
    blurb: "Respond fast, keep customers happy, and find support roles.",
    actions: [
      { label: "Messages", to: "/messages", icon: MessageSquare },
      { label: "Support jobs", to: "/jobs", icon: Briefcase },
      { label: "CSAT & tools course", to: "/learn", icon: BookOpen },
      { label: "Build your CV", to: "/cv-builder", icon: FileText },
    ],
    tips: [
      "Keep a bank of saved replies for your top 10 questions.",
      "Lead with empathy, then the fix — response time drives CSAT.",
    ],
  },
  {
    key: "growth",
    match: /growth|growth market|growth hack|acquisition|retention|analytics|data analyst/i,
    title: "Growth Workspace",
    icon: TrendingUp,
    accent: "from-emerald-500/15 to-teal-500/10 text-emerald-500",
    blurb: "Run experiments across the funnel and track what moves the needle.",
    actions: [
      { label: "Growth roles", to: "/jobs", icon: Briefcase },
      { label: "Analytics course", to: "/learn", icon: BarChart3 },
      { label: "Case studies in Studio", to: "/studio", icon: PenSquare },
      { label: "Network at events", to: "/events", icon: CalendarDays },
    ],
    tips: [
      "Frame every experiment as hypothesis → metric → result.",
      "One channel, one funnel step, one week — then read the data.",
    ],
  },
  {
    key: "marketing",
    match: /marketing|market|seo|social media|brand|ppc|ads|demand gen|community/i,
    title: "Marketing Workspace",
    icon: Megaphone,
    accent: "from-violet-500/15 to-fuchsia-500/10 text-violet-500",
    blurb: "Plan campaigns, build a content calendar, and win marketing gigs.",
    actions: [
      { label: "Content calendar (Studio)", to: "/studio", icon: PenSquare },
      { label: "Marketing jobs", to: "/jobs", icon: Briefcase },
      { label: "Sharpen your skills", to: "/learn", icon: Target },
      { label: "Find collaborators", to: "/talent", icon: Users },
    ],
    tips: [
      "Batch a month of content in Studio, then schedule the drops.",
      "Show ROI in your pitch: reach, conversions, and cost per result.",
    ],
  },
];

const DEFAULT: RoleConfig = {
  key: "default",
  match: /.*/,
  title: "Your Workspace",
  icon: Sparkles,
  accent: "from-primary/15 to-primary/5 text-primary",
  blurb: "Tools tuned to what you do — jobs, learning and your portfolio.",
  actions: [
    { label: "Browse jobs", to: "/jobs", icon: Briefcase },
    { label: "Write in Studio", to: "/studio", icon: PenSquare },
    { label: "Build your CV", to: "/cv-builder", icon: FileText },
    { label: "Keep learning", to: "/learn", icon: BookOpen },
  ],
  tips: [
    "Set your primary skill in your profile to tailor this workspace.",
    "A complete profile gets 3× more views on Collab.",
  ],
};

function pickRole(skill: string | null): RoleConfig {
  if (!skill) return DEFAULT;
  return ROLES.find((r) => r.match.test(skill)) || DEFAULT;
}

export function RoleWorkspace({ userId }: { userId: string }) {
  const [skill, setSkill] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (supabase as any)
      .from("talent_profiles").select("primary_skill").eq("user_id", userId).maybeSingle()
      .then(({ data }: any) => { setSkill(data?.primary_skill || null); setReady(true); });
  }, [userId]);

  if (!ready) return null;
  const role = pickRole(skill);
  const Icon = role.icon;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${role.accent}`}>
        <div className="w-9 h-9 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{role.title}</p>
          <p className="text-[12px] text-muted-foreground truncate">{role.blurb}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border">
        {role.actions.map((a) => (
          <Link key={a.label} to={a.to} className="flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/40 transition-colors group">
            <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[12px] font-medium text-foreground leading-tight flex items-center gap-1">
              {a.label}
              <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </span>
          </Link>
        ))}
      </div>

      <ul className="px-5 py-3 space-y-1.5">
        {role.tips.map((t, i) => (
          <li key={i} className="text-[12px] text-muted-foreground flex gap-2">
            <span className="text-primary mt-0.5">›</span>{t}
          </li>
        ))}
      </ul>
    </div>
  );
}
