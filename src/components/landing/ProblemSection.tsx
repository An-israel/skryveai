import { motion } from "framer-motion";
import { AlertTriangle, Clock, Ban, TrendingDown } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Hours Wasted Researching",
    description: "Manually checking websites, social profiles, and competitor info before writing a single email.",
  },
  {
    icon: Ban,
    title: "Generic Templates Get Ignored",
    description: "Copy-paste outreach lands in spam. Prospects can tell when you haven't done your homework.",
  },
  {
    icon: TrendingDown,
    title: "Low Reply Rates",
    description: "Without personalization, cold emails get <2% responses. You need pitches that reference real problems.",
  },
  {
    icon: AlertTriangle,
    title: "No Scalable System",
    description: "Freelancers juggle prospecting, auditing, writing, and sending — with no repeatable process.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-destructive uppercase tracking-wider mb-2">The Problem</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cold Outreach Is Broken for Freelancers
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Most freelancers spend more time finding and researching prospects than actually doing the work they love.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {problems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-2xl bg-card border border-destructive/10"
            >
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
