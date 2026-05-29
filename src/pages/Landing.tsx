import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, CheckCircle2, Briefcase, CalendarDays, BookOpen,
  Users, Search, Star, Zap, Globe, TrendingUp, Award, MessageSquare,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FAQSection } from "@/components/landing/FAQSection";

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Skryve",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://skryve.app",
  description: "Skryve is a complete freelance ecosystem where talent and clients meet. Find work, hire talent, discover events, learn skills, and build your professional presence — all in one place.",
  featureList: [
    "Two-sided freelance marketplace — talent and clients",
    "Job aggregator from 10+ platforms with AI proposals",
    "Professional events hub — webinars, workshops, conferences",
    "13 skill courses with AI coach and certificates",
    "AI CV Builder with ATS optimization",
    "ATS Score Checker",
    "LinkedIn Profile Analyzer",
    "Built-in messaging, offers, and project delivery",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to join",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Freelancers, Clients, Job Seekers, Professionals",
  },
};

const pillars = [
  {
    icon: Users,
    title: "Two-Sided Marketplace",
    description: "Freelancers build profiles and apply for jobs. Clients post projects and hire the right talent fast. AI matches both sides automatically.",
    color: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
    features: ["AI-powered matching", "Built-in messaging", "Offer management", "Project delivery & payments"],
  },
  {
    icon: Search,
    title: "Job Aggregator",
    description: "Jobs curated daily from 10+ platforms — Upwork, LinkedIn, Indeed, Jobberman, Remote OK — into one personalised feed.",
    color: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20",
    iconColor: "text-blue-400",
    features: ["10+ job platforms", "AI proposal generator", "One-click apply", "Application tracker"],
  },
  {
    icon: CalendarDays,
    title: "Events Hub",
    description: "A searchable directory of professional events — webinars, workshops, conferences, meetups, and hackathons in your niche.",
    color: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    features: ["Filter by niche & location", "Free & paid events", "Post your own event", "RSVP & pay on-platform"],
  },
  {
    icon: BookOpen,
    title: "Learning Platform",
    description: "13 complete skill courses with an AI coach, quizzes, and professional certificates. Completing a course connects directly to live job opportunities.",
    color: "from-amber-500/20 to-orange-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    features: ["13 in-demand skills", "AI learning coach", "Certificates you own", "Connects to live jobs"],
  },
];

const tools = [
  { icon: Zap, label: "CV Builder", desc: "ATS-optimised, multiple templates", href: "/cv-builder" },
  { icon: TrendingUp, label: "ATS Score Checker", desc: "Scan your CV before you apply", href: "/ats-checker" },
  { icon: Globe, label: "LinkedIn Analyzer", desc: "Section-by-section profile score", href: "/linkedin-analyzer" },
];

const steps = [
  { step: "01", title: "Create your profile", desc: "Set up your talent or client profile in minutes. Showcase your skills, portfolio, and experience." },
  { step: "02", title: "Discover opportunities", desc: "Browse marketplace jobs, explore the aggregated job feed, or post your own project to attract talent." },
  { step: "03", title: "Get hired and grow", desc: "Apply with AI-generated proposals, attend events in your niche, complete courses, and earn verified certificates." },
];

const stats = [
  { value: "10+", label: "Job platforms aggregated" },
  { value: "13", label: "Skill courses available" },
  { value: "Free", label: "To get started" },
  { value: "1", label: "Platform for everything" },
];

export default function Landing() {
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Skryve — Your Complete Freelance Ecosystem"
        description="Find work, hire talent, discover events, learn skills, and build your professional presence — all in one place. The complete freelance ecosystem for modern professionals."
        canonical="https://skryve.app/"
        keywords="freelance marketplace, hire freelancers, find freelance work, job aggregator freelancers, professional events, learn skills online, CV builder, ATS score checker, LinkedIn analyzer, freelance ecosystem"
        jsonLd={orgSchema}
      />
      <Header isAuthenticated={false} />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-6">
              <Star className="w-3 h-3 fill-primary" />
              We stopped chasing clients for you. We built the place where clients come to find you.
            </span>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight mb-6 leading-[1.1]">
              Your Complete<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-primary">
                Freelance Ecosystem
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Find work. Hire talent. Discover events. Learn skills. Build your professional presence.<br className="hidden md:block" />
              Everything in one place — built for the modern professional.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="rounded-full px-8 font-bold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02] text-base" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 font-semibold text-base" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground/60 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free to join</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Works for any skill</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <section className="py-12 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold text-foreground font-display">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4 Pillars ─────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Four pillars. One platform.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything a freelancer needs — from first gig to thriving career.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border ${pillar.border} bg-gradient-to-br ${pillar.color} p-7 overflow-hidden`}
              >
                <div className={`w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center mb-5 ${pillar.iconColor}`}>
                  <pillar.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{pillar.title}</h3>
                <p className="text-muted-foreground mb-5 leading-relaxed">{pillar.description}</p>
                <ul className="space-y-2">
                  {pillar.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              From zero to hired in 3 steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border to-transparent -translate-x-4" />
                )}
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-display font-extrabold text-lg flex items-center justify-center mx-auto mb-5 border border-primary/20">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Professional Tools ────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              Professional tools included
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Built-in tools that used to cost you time — now they're free in your Skryve account.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to="/signup"
                  className="block p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <tool.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{tool.label}</h3>
                  <p className="text-sm text-muted-foreground">{tool.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ────────────────────────────────── */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              Inbound beats outbound — every time
            </h2>
            <p className="text-muted-foreground text-lg">
              Stop chasing clients. Build your presence where clients come to find you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-red-400">The old way</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Blast cold emails — get ignored",
                  "Wrong emails, wrong companies",
                  "Only works for 2–3 skill types",
                  "Spam filters block your messages",
                  "Zero inbound interest",
                  "Revenue model unclear",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-400">The Skryve way</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Clients find you through your profile",
                  "Jobs aggregated from 10+ platforms",
                  "Works for any skill — open platform",
                  "AI-generated proposals in seconds",
                  "Inbound + outbound opportunities",
                  "Freemium — free basic, Pro subscription",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <SocialProofSection />
      <FAQSection />

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="py-28 bg-gradient-dark-section relative overflow-hidden rounded-t-[2.5rem] mx-4 md:mx-8 lg:mx-16">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
              Ready to build your freelance career?
            </h2>
            <p className="text-white/60 mb-10 leading-relaxed text-lg">
              Join thousands of freelancers and clients on Skryve — the complete platform built for the modern professional.
            </p>
            <Button size="xl" className="bg-gradient-accent text-white font-bold text-base px-10 py-6 rounded-full shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02]" asChild>
              <Link to="/signup">
                JOIN FOR FREE
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
                Works for any skill
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Free to get started
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
