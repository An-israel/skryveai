import { motion } from "framer-motion";
import { Palette, Code, PenTool, Megaphone, Camera, BarChart3 } from "lucide-react";

const useCases = [
  { icon: Palette, role: "Web Designers", example: "Find businesses with outdated websites and pitch a redesign using specific issues found on their site." },
  { icon: Code, role: "Developers", example: "Target companies with slow or broken sites and offer performance, SEO, or app development services." },
  { icon: PenTool, role: "Copywriters", example: "Audit weak website copy and social media bios, then pitch rewriting services with concrete examples." },
  { icon: Megaphone, role: "Marketing Consultants", example: "Identify businesses with poor social presence and pitch a full digital marketing strategy." },
  { icon: Camera, role: "Content Creators", example: "Find brands with low-quality visuals and pitch photography, video, or graphic design services." },
  { icon: BarChart3, role: "SEO Specialists", example: "Discover businesses with weak online visibility and pitch SEO audits backed by real data." },
];

export function UseCasesSection() {
  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Built for Freelancers</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How Freelancers Use SkryveAI to Win Clients
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            No matter your specialty, SkryveAI finds the right prospects and crafts pitches that speak their language.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {useCases.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl bg-card border"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">{item.role}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{item.example}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
