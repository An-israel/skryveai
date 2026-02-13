import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Target, Zap, Users, Shield, Globe, Sparkles } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Precision Outreach",
    description: "We believe cold outreach should be targeted, personalized, and respectful — not spammy mass emails.",
  },
  {
    icon: Zap,
    title: "AI-Powered Efficiency",
    description: "Our AI handles the heavy lifting of research and writing so freelancers can focus on delivering great work.",
  },
  {
    icon: Users,
    title: "Built for Freelancers",
    description: "Every feature is designed specifically for independent professionals who want to grow their client base.",
  },
  {
    icon: Shield,
    title: "Ethical & Compliant",
    description: "All emails include unsubscribe links and follow anti-spam best practices. We prioritize deliverability.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              About <span style={{ color: '#0B162B' }}>SkryveAI</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              We're building the smartest cold outreach platform for freelancers, entrepreneurs, and startups who want to grow their business without the hustle of manual prospecting.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
            <p>
              SkryveAI was born from a simple frustration: talented freelancers spend more time looking for clients than actually doing the work they love. Manual prospecting — searching for businesses, researching their pain points, crafting individual emails — eats up hours every week.
            </p>
            <p>
              We built SkryveAI to change that. Our AI-powered platform automates the entire cold outreach process: from discovering potential clients, to performing a deep audit of their website and social media presence, to generating highly personalized pitch emails that actually get responses.
            </p>
            <p>
              But we didn't stop at freelancers. SkryveAI also helps entrepreneurs and startups find investors in their industry, craft compelling pitch emails, and reach out at scale — making fundraising less daunting and more efficient.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2">Our Values</h2>
            <p className="text-muted-foreground">What drives every decision we make</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground"
          >
            <h2 className="text-2xl font-bold text-foreground">What Makes Us Different</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <Globe className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1 text-foreground">Full Online Audit</h3>
                <p className="text-sm">We don't just check websites — we audit LinkedIn, Instagram, Facebook, and branding to find real pain points.</p>
              </div>
              <div className="text-center p-4">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1 text-foreground">AI-Personalized Pitches</h3>
                <p className="text-sm">Every email references specific issues we found — making them feel personal, not templated.</p>
              </div>
              <div className="text-center p-4">
                <Zap className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1 text-foreground">Smart Delivery</h3>
                <p className="text-sm">Automated warmup, scheduling, and multi-channel delivery to maximize inbox placement.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
