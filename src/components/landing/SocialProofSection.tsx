import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "I landed 3 new clients in my first week. The AI found problems on their websites I would have never spotted myself.",
    name: "Sarah K.",
    role: "Freelance Web Designer",
    rating: 5,
  },
  {
    quote: "SkryveAI replaced 4 different tools I was using. Search, analyze, write, send — all in one place.",
    name: "James M.",
    role: "Digital Marketing Freelancer",
    rating: 5,
  },
  {
    quote: "The investor outreach feature helped us book 12 meetings in two weeks. The personalized pitches made all the difference.",
    name: "Priya T.",
    role: "Startup Founder",
    rating: 5,
  },
];

export function SocialProofSection() {
  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Trusted by Freelancers & Startups</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Real Results from Real Users
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card border relative"
            >
              <Quote className="w-8 h-8 text-primary/15 absolute top-4 right-4" />
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: item.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 italic">"{item.quote}"</p>
              <div>
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
