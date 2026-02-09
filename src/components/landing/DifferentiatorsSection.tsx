import { motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

const comparisons = [
  { feature: "Full online presence audit (website + socials)", us: true, others: false },
  { feature: "AI-generated pitches referencing real pain points", us: true, others: false },
  { feature: "Built-in business discovery by location & industry", us: true, others: false },
  { feature: "Investor outreach for startups", us: true, others: false },
  { feature: "Smart email scheduling & warmup", us: true, others: true },
  { feature: "No coding or API setup required", us: true, others: false },
];

export function DifferentiatorsSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Why SkryveAI</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Not Just Another Email Tool
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Most outreach tools send templates. SkryveAI researches prospects, finds real problems, and writes pitches that prove you understand their business.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto rounded-2xl border bg-card overflow-hidden"
        >
          <div className="grid grid-cols-[1fr_auto_auto] gap-0">
            <div className="p-4 font-semibold text-sm border-b bg-muted">Feature</div>
            <div className="p-4 font-semibold text-sm border-b border-l bg-primary/5 text-primary text-center min-w-[100px]">SkryveAI</div>
            <div className="p-4 font-semibold text-sm border-b border-l bg-muted text-muted-foreground text-center min-w-[100px]">Others</div>
            {comparisons.map((row, i) => (
              <div key={i} className="contents">
                <div className="p-4 text-sm border-b last:border-b-0">{row.feature}</div>
                <div className="p-4 border-b border-l last:border-b-0 flex items-center justify-center">
                  {row.us ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-4 border-b border-l last:border-b-0 flex items-center justify-center">
                  {row.others ? (
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground/60" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
