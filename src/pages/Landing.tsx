import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DifferentiatorsSection } from "@/components/landing/DifferentiatorsSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { CampaignTypesSection } from "@/components/landing/CampaignTypesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { WhatWeAnalyzeSection } from "@/components/landing/WhatWeAnalyzeSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { SEOHead } from "@/components/SEOHead";

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SkryveAI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://skryveai.com",
  description: "All-in-one AI platform for freelancers and startups: find clients, send hyper-personalized cold emails, build ATS-optimized CVs, check ATS scores, analyze LinkedIn profiles, and run autopilot outreach campaigns.",
  featureList: [
    "AI-powered business discovery and lead generation",
    "Full online presence audit (website, LinkedIn, Instagram, Facebook)",
    "Hyper-personalized cold email generation",
    "Automated email outreach campaigns",
    "AutoPilot 24/7 outreach with daily quota",
    "AI CV Builder with ATS optimization",
    "ATS Score Checker with keyword gap analysis",
    "LinkedIn Profile Analyzer with section-by-section scoring",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "7-day free trial, no credit card required",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Freelancers, Startups, Job Seekers, Small Businesses",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function Landing() {
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="SkryveAI — AI Cold Outreach, CV Builder, ATS Checker & LinkedIn Analyzer"
        description="SkryveAI is the all-in-one AI platform for freelancers & startups. Find clients, send hyper-personalized cold emails, build ATS-optimized CVs, check your ATS score, analyze your LinkedIn profile, and automate outreach on autopilot. Free 7-day trial."
        canonical="https://skryveai.com/"
        keywords="AI cold email outreach, find clients for freelancers, cold email automation, client prospecting tool, ATS score checker, ATS CV checker, resume ATS score, ATS resume optimizer, CV builder AI, AI resume builder, LinkedIn profile analyzer, LinkedIn profile optimizer, LinkedIn score, automated email campaigns, autopilot email outreach, business email finder, personalized cold email, freelancer client finder, startup lead generation, email outreach tool, resume builder online, CV optimization tool, job application tools, outreach automation software, hyper-personalized cold outreach, AI tool that writes CV, AI tool that analyzes LinkedIn profile, AI cold email writer, best cold outreach tool for freelancers, automated client outreach, AI business finder, free ATS checker, LinkedIn profile review AI"
        jsonLd={orgSchema}
      />
      <Header isAuthenticated={false} />
      
      <HeroSection />
      <ProblemSection />
      <CampaignTypesSection />
      <HowItWorksSection />
      <WhatWeAnalyzeSection />
      <DifferentiatorsSection />
      <FeaturesSection />
      <UseCasesSection />
      <SocialProofSection />
      <FAQSection />

      {/* CTA Section */}
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
                7-day free trial
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
