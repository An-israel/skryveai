import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, UserPlus, TrendingUp, Briefcase, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export type CampaignType = "freelancer" | "direct_client" | "investor" | "job_application";

interface CampaignTypeSelectorProps {
  onSelect: (type: CampaignType) => void;
}

const campaignTypes = [
  {
    id: "freelancer" as CampaignType,
    icon: Target,
    title: "Smart Find",
    subtitle: "AI-Qualified Leads",
    description: "Don't just search — find businesses that ACTUALLY need your service. AI scans each website for pain signals, then ranks them by need score.",
    features: ["AI signal-based discovery", "Need score 0–100 per lead", "Only contact businesses that need you", "10–15× higher reply rates"],
    isNew: true,
  },
  {
    id: "direct_client" as CampaignType,
    icon: UserPlus,
    title: "Pitch a Client",
    subtitle: "Direct Outreach",
    description: "Already have a specific client in mind? Enter their details, we'll analyze their presence and craft the perfect pitch.",
    features: ["Enter client details manually", "Full online presence audit", "Personalized pitch generation", "Social media analysis"],
    isNew: false,
  },
  {
    id: "investor" as CampaignType,
    icon: TrendingUp,
    title: "Find Investors",
    subtitle: "Raise Funding",
    description: "Find investors in your industry, craft compelling pitch emails about your business or idea, and reach out at scale.",
    features: ["Search investors by industry", "Structured pitch builder", "Traction & proof points", "Up to 10 emails per campaign"],
    isNew: false,
  },
  {
    id: "job_application" as CampaignType,
    icon: Briefcase,
    title: "Apply for Jobs",
    subtitle: "Bulk Job Applications",
    description: "Search jobs across LinkedIn, Indeed, Glassdoor & more. AI tailors your CV and writes cover letters for each job — apply to 50 at once.",
    features: ["Search 7+ job platforms", "AI-tailored CV per job", "Auto cover letters", "Apply to 50 jobs at once"],
    isNew: true,
  },
];

export function CampaignTypeSelector({ onSelect }: CampaignTypeSelectorProps) {
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkFeatureFlags = async () => {
      const { data } = await supabase
        .from("site_pages")
        .select("route, is_enabled")
        .like("route", "/feature/%");

      if (data) {
        const disabled = new Set<string>();
        data.forEach((flag) => {
          if (!flag.is_enabled && flag.route === "/feature/job-applications") {
            disabled.add("job_application");
          }
        });
        setDisabledTypes(disabled);
      }
    };
    checkFeatureFlags();
  }, []);

  const visibleTypes = campaignTypes.filter((t) => !disabledTypes.has(t.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">Create a Campaign</h1>
        <p className="text-muted-foreground text-lg">
          Choose the type of outreach you want to do
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {visibleTypes.map((type, i) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => onSelect(type.id)}
            className="group cursor-pointer p-7 rounded-2xl bg-card border-2 border-border-subtle hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/8 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
              <type.icon className="w-7 h-7" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-lg">{type.title}</h3>
              {type.isNew && (
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-[10px] px-1.5 py-0">
                  NEW
                </Badge>
              )}
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-primary font-semibold mb-4 tracking-wide">{type.subtitle}</p>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
              {type.description}
            </p>

            <ul className="space-y-2.5 pt-4 border-t border-border-subtle">
              {type.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-foreground/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
