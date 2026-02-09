import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const stats = [
  { value: "10x", label: "Faster Prospecting" },
  { value: "80%", label: "Time Saved" },
  { value: "3x", label: "More Responses" },
];

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-20 overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm text-primary-foreground/90">AI-Powered Client & Investor Outreach</span>
          </div>

          {/* Problem statement */}
          <p className="text-sm md:text-base text-primary-foreground/60 mb-4 uppercase tracking-wider font-medium">
            Tired of cold outreach that gets ignored?
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
            Find Clients. Audit Their Presence.{" "}
            <span className="text-gradient">Send Pitches That Get Replies.</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-4 max-w-2xl mx-auto">
            SkryveAI scans websites, LinkedIn, Instagram & more to find exactly what prospects need — then writes hyper-personalized cold emails that convert.
          </p>

          {/* Benefit bullets */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/70 mb-8">
            <span>✓ No templates — every email is unique</span>
            <span>✓ Works for freelancers & startups</span>
            <span>✓ Set up in under 5 minutes</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-16 flex justify-center gap-12"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-sm text-primary-foreground/60">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
