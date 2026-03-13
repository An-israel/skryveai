import { motion } from "framer-motion";
import { BarChart3, Linkedin, Instagram, Target, FileText, Sparkles } from "lucide-react";

const analysisItems = [
  { icon: BarChart3, title: "Website Copy", desc: "Is their copy compelling? Does it convert visitors to leads?" },
  { icon: Linkedin, title: "LinkedIn", desc: "Is their profile optimized? Posting strategy? Bio compelling?" },
  { icon: Instagram, title: "Instagram", desc: "Design quality, posting frequency, bio optimization, engagement" },
  { icon: Target, title: "Branding", desc: "Visual consistency across all platforms and touchpoints" },
  { icon: FileText, title: "Calls to Action", desc: "Can visitors easily book, buy, or contact them?" },
  { icon: Sparkles, title: "Design Quality", desc: "Compare their graphics to professional standards" },
];

export function WhatWeAnalyzeSection() {
  return (
    <section className="py-24 bg-gradient-subtle section-divider">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Deep Analysis</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">Beyond Website Analysis</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            We audit their entire online presence — not just their website — to find pain points that make them reply.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {analysisItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-border-subtle card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm mb-1.5">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
