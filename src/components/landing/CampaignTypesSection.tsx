import { motion } from "framer-motion";
import { Search, UserPlus, TrendingUp } from "lucide-react";

const campaignTypes = [
  {
    icon: Search,
    title: "Find Clients",
    subtitle: "For Freelancers",
    description: "Search businesses by industry and location, audit their online presence, and send personalized pitches.",
  },
  {
    icon: UserPlus,
    title: "Pitch a Client",
    subtitle: "Direct Outreach",
    description: "Already have a client in mind? Enter their details, we analyze everything and craft the perfect email.",
  },
  {
    icon: TrendingUp,
    title: "Find Investors",
    subtitle: "Raise Funding",
    description: "Find investors in your industry, build compelling pitch emails, and reach out to raise capital for your startup.",
  },
];

export function CampaignTypesSection() {
  return (
    <section className="py-24 bg-gradient-subtle section-divider">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Flexible Outreach</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">Three Ways to Grow</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Whether you're a freelancer looking for clients or a startup seeking investors — we've got you covered.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {campaignTypes.map((type, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group p-7 rounded-2xl bg-card border border-border-subtle card-hover"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <type.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">{type.title}</h3>
              <p className="text-xs text-primary font-semibold mb-3 tracking-wide">{type.subtitle}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{type.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
