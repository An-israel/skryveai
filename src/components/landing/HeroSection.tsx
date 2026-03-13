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
    <section className="relative pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden bg-gradient-hero grain">
      {/* Animated gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] animate-orb pointer-events-none" />
      
      {/* Dot grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] mb-8 shadow-glow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
            <span className="text-xs font-medium text-primary-foreground/80 tracking-wide">AI-Powered Client & Investor Outreach</span>
          </motion.div>

          {/* Eyebrow */}
          <p className="text-xs md:text-sm text-primary-foreground/40 mb-5 uppercase tracking-[0.2em] font-medium">
            Cold outreach was never built for you. Until now.
          </p>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-7 leading-[1.05] tracking-tight">
            Your Talent Was Never the Problem.{" "}
            <span className="text-gradient">Now Your Pitch Won't Be Either.</span>
          </h1>

          <p className="text-base md:text-lg text-primary-foreground/60 mb-5 max-w-2xl mx-auto leading-relaxed">
            SkryveAI automates the research, audit, and pitch — so every freelancer, anywhere in the world, can show up to the conversation already knowing the room.
          </p>

          {/* Benefit bullets */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs md:text-sm text-primary-foreground/50 mb-10">
            <span>✓ No templates — every email is unique</span>
            <span>✓ Built for freelancers & startups globally</span>
            <span>✓ Set up in under 5 minutes</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/login">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </motion.div>

        {/* Stat cards - glass morphism */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 flex justify-center gap-4 md:gap-6"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center px-6 py-4 md:px-8 md:py-5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.08] shadow-lg"
            >
              <div className="text-2xl md:text-4xl font-display font-extrabold text-primary-foreground tracking-tight">{stat.value}</div>
              <div className="text-xs md:text-sm text-primary-foreground/40 mt-1 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
