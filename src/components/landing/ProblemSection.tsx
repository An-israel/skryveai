import { motion } from "framer-motion";
import { AlertTriangle, Clock, Ban, TrendingDown } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Hours Wasted Researching",
    description: "Manually checking websites, social profiles, and competitor info before writing a single email.",
    accent: "hsl(var(--info))",
  },
  {
    icon: Ban,
    title: "Generic Templates Get Ignored",
    description: "Copy-paste outreach lands in spam. Prospects can tell when you haven't done your homework.",
    accent: "hsl(var(--warning))",
  },
  {
    icon: TrendingDown,
    title: "Low Reply Rates",
    description: "Without personalization, cold emails get <2% responses. You need pitches that reference real problems.",
    accent: "hsl(var(--destructive))",
  },
  {
    icon: AlertTriangle,
    title: "No Scalable System",
    description: "Freelancers juggle prospecting, auditing, writing, and sending — with no repeatable process.",
    accent: "hsl(var(--primary))",
  },
];

export function ProblemSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-destructive uppercase tracking-[0.2em] mb-3">The Problem</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">
            Talented Freelancers Deserve Better Outreach
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Whether you're in New York, Lagos, Lahore, or Manila — skilled freelancers everywhere deserve tools that match their talent. Most outreach tools weren't built with you in mind. SkryveAI is.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {problems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative p-6 rounded-2xl bg-card border border-border-subtle card-hover overflow-hidden"
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: item.accent }}
              />
              <div className="w-10 h-10 rounded-xl bg-destructive/8 text-destructive flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
