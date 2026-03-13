import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, 
  BarChart3, 
  FileText, 
  Send, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  UserPlus,
  Linkedin,
  Instagram,
  Sparkles,
  Target,
} from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DifferentiatorsSection } from "@/components/landing/DifferentiatorsSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";

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

const campaignTypes = [
  {
    icon: Search,
    title: "Find Clients",
    subtitle: "For Freelancers",
    description: "Search businesses by industry and location, audit their online presence, and send personalized pitches.",
  },
  {
    icon: UserPlus,
    title: "Pitch a Client",
    subtitle: "Direct Outreach",
    description: "Already have a client in mind? Enter their details, we analyze everything and craft the perfect email.",
  },
  {
    icon: TrendingUp,
    title: "Find Investors",
    subtitle: "Raise Funding",
    description: "Find investors in your industry, build compelling pitch emails, and reach out to raise capital for your startup.",
  },
];

const steps = [
  { step: "1", title: "Choose", description: "Pick your campaign type" },
  { step: "2", title: "Search", description: "Find your targets" },
  { step: "3", title: "Analyze", description: "AI audits their presence" },
  { step: "4", title: "Pitch", description: "Review personalized emails" },
  { step: "5", title: "Send", description: "Launch your campaign" },
];

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SkryveAI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "AI-powered cold outreach platform that finds clients, audits their online presence, and sends personalized pitches for freelancers and startups.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "3-day free trial, no credit card required",
  },
};

export default function Landing() {
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <Header isAuthenticated={false} />
      
      <HeroSection />

      <ProblemSection />

      {/* Campaign Types */}
      <section className="py-24 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">Three Ways to Grow</h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Whether you're a freelancer looking for clients or a startup seeking investors — we've got you covered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {campaignTypes.map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group p-7 rounded-2xl bg-card border border-border-subtle card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <type.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg mb-1">{type.title}</h3>
                <p className="text-xs text-primary font-semibold mb-3 tracking-wide">{type.subtitle}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Timeline */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              From search to send in 5 simple steps. Our AI handles the heavy lifting.
            </p>
          </motion.div>

          {/* Timeline rail */}
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

      {/* What We Analyze */}
      <section className="py-24 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">Beyond Website Analysis</h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              We audit their entire online presence — not just their website — to find pain points that make them reply.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { icon: BarChart3, title: "Website Copy", desc: "Is their copy compelling? Does it convert visitors to leads?" },
              { icon: Linkedin, title: "LinkedIn", desc: "Is their profile optimized? Posting strategy? Bio compelling?" },
              { icon: Instagram, title: "Instagram", desc: "Design quality, posting frequency, bio optimization, engagement" },
              { icon: Target, title: "Branding", desc: "Visual consistency across all platforms and touchpoints" },
              { icon: FileText, title: "Calls to Action", desc: "Can visitors easily book, buy, or contact them?" },
              { icon: Sparkles, title: "Design Quality", desc: "Compare their graphics to professional standards" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border-subtle card-hover"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <DifferentiatorsSection />

      {/* Features */}
      <section className="py-24 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
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

      <UseCasesSection />

      <SocialProofSection />

      <FAQSection />

      {/* CTA Section — Instantly-style dark gradient block */}
      <section className="py-24 bg-gradient-dark-section relative overflow-hidden rounded-t-[2rem] mx-4 md:mx-8 lg:mx-16">
        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
              Ready to Land More Clients?
            </h2>
            <p className="text-white/60 mb-10 leading-relaxed text-lg">
              Join freelancers and startups using AI to find clients, pitch investors, and grow their business.
            </p>
            <Button size="xl" className="bg-gradient-accent text-white font-bold text-base px-10 py-6 rounded-full shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02]" asChild>
              <Link to="/signup">
                START FOR FREE
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                3-day free trial
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
