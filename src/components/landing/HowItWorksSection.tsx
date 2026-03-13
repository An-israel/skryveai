import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  { step: "1", title: "Choose", description: "Pick your campaign type" },
  { step: "2", title: "Search", description: "Find your targets" },
  { step: "3", title: "Analyze", description: "AI audits their presence" },
  { step: "4", title: "Pitch", description: "Review personalized emails" },
  { step: "5", title: "Send", description: "Launch your campaign" },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 section-divider">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Simple Process</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            From search to send in 5 simple steps. Our AI handles the heavy lifting.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-0 lg:flex-nowrap items-start">
            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center flex-1 min-w-0"
              >
                <div className="flex flex-col items-center text-center px-2 lg:px-4 w-full">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-accent text-primary-foreground flex items-center justify-center text-xl font-display font-extrabold shadow-glow">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="font-display font-bold mt-4 mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground max-w-[120px] leading-relaxed">{item.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block w-full h-[2px] bg-border-subtle mt-7 -mx-2 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
