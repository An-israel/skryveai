import { motion } from "framer-motion";
import { Search, BarChart3, FileText, Send } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Business Discovery",
    description: "Find potential clients by business type and location. Our AI identifies businesses that need your services.",
  },
  {
    icon: BarChart3,
    title: "Full Online Presence Audit",
    description: "Automatically scan websites, LinkedIn, Instagram, and Facebook for pain points costing them money.",
  },
  {
    icon: FileText,
    title: "Personalized Pitches",
    description: "Generate cold emails that reference specific problems — their website copy, social media, branding, and more.",
  },
  {
    icon: Send,
    title: "Automated Outreach",
    description: "Send personalized emails at scale with smart scheduling and warmup to maximize inbox placement.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-gradient-subtle section-divider">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Platform</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">Everything You Need</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Powerful features for freelancers and startups looking to grow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group p-7 rounded-2xl bg-card border border-border-subtle card-hover"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
