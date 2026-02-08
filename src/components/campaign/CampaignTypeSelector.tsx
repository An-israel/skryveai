import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus, TrendingUp, ArrowRight } from "lucide-react";

export type CampaignType = "freelancer" | "direct_client" | "investor";

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
    creditInfo: "3 credits per campaign (0.2 per email)",
    color: "primary",
  },
  {
    id: "direct_client" as CampaignType,
    icon: UserPlus,
    title: "Pitch a Client",
    subtitle: "Direct Outreach",
    description: "Already have a specific client in mind? Enter their details, we'll analyze their presence and craft the perfect pitch.",
    features: ["Enter client details manually", "Full online presence audit", "Personalized pitch generation", "Social media analysis"],
    creditInfo: "0.2 credits per email",
    color: "accent",
  },
  {
    id: "investor" as CampaignType,
    icon: TrendingUp,
    title: "Find Investors",
    subtitle: "Raise Funding",
    description: "Find investors in your industry, craft compelling pitch emails about your business or idea, and reach out at scale.",
    features: ["Search investors by industry", "Structured pitch builder", "Traction & proof points", "Up to 10 emails per campaign"],
    creditInfo: "5 credits per campaign (0.5 per email)",
    color: "warning",
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

      <div className="grid md:grid-cols-3 gap-6">
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
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">
                    {type.creditInfo}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
