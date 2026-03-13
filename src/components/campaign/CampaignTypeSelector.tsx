import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus, TrendingUp, Briefcase, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type CampaignType = "freelancer" | "direct_client" | "investor" | "job_application";

interface CampaignTypeSelectorProps {
  onSelect: (type: CampaignType) => void;
}

const campaignTypes = [
  {
    id: "freelancer" as CampaignType,
    icon: Search,
    title: "Find Clients",
    subtitle: "For Freelancers",
    description: "Search for businesses by type and location, analyze their online presence, and send personalized cold pitches.",
    features: ["Search by industry & location", "AI website + social audit", "Auto-generated pitches", "Up to 15 emails per campaign"],
    color: "primary",
    isNew: false,
  },
  {
    id: "direct_client" as CampaignType,
    icon: UserPlus,
    title: "Pitch a Client",
    subtitle: "Direct Outreach",
    description: "Already have a specific client in mind? Enter their details, we'll analyze their presence and craft the perfect pitch.",
    features: ["Enter client details manually", "Full online presence audit", "Personalized pitch generation", "Social media analysis"],
    color: "accent",
    isNew: false,
  },
  {
    id: "investor" as CampaignType,
    icon: TrendingUp,
    title: "Find Investors",
    subtitle: "Raise Funding",
    description: "Find investors in your industry, craft compelling pitch emails about your business or idea, and reach out at scale.",
    features: ["Search investors by industry", "Structured pitch builder", "Traction & proof points", "Up to 10 emails per campaign"],
    color: "warning",
    isNew: false,
  },
  {
    id: "job_application" as CampaignType,
    icon: Briefcase,
    title: "Apply for Jobs",
    subtitle: "Bulk Job Applications",
    description: "Search jobs across LinkedIn, Indeed, Glassdoor & more. AI tailors your CV and writes cover letters for each job — apply to 50 at once.",
    features: ["Search 7+ job platforms", "AI-tailored CV per job", "Auto cover letters", "Apply to 50 jobs at once"],
    color: "primary",
    isNew: true,
  },
];

export function CampaignTypeSelector({ onSelect }: CampaignTypeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Create a Campaign</h1>
        <p className="text-muted-foreground text-lg">
          Choose the type of outreach you want to do
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {campaignTypes.map((type, i) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className="cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full border-2 hover:border-primary/50"
              onClick={() => onSelect(type.id)}
            >
              <CardHeader className="pb-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <type.icon className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                    <CardDescription className="text-sm font-medium mt-0.5">{type.subtitle}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {type.isNew && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-[10px] px-1.5 py-0">
                        NEW
                      </Badge>
                    )}
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
                <ul className="space-y-2">
                  {type.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
