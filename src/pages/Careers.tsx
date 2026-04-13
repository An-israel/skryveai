import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, Send, Users, TrendingUp, Sparkles } from "lucide-react";

const roles: { title: string; type: string; location: string; icon: typeof TrendingUp; description: string; responsibilities: string[]; requirements: string[]; niceToHaves: string[] }[] = [
  {
    title: "Project Assistant",
    type: "Full-Time",
    location: "Remote",
    icon: Sparkles,
    description:
      "We're looking for a sharp, proactive Project Assistant to work directly with the founder. You'll act as a right hand — coordinating hiring, managing staff operations, driving brand growth initiatives, and ensuring the team runs like a well-oiled machine. This is a high-impact role for someone who thrives on ownership and wants to shape the future of SkryveAI.",
    responsibilities: [
      "Assist in recruiting, onboarding, and managing team members across departments",
      "Coordinate day-to-day operations and ensure projects stay on track",
      "Drive brand growth initiatives — partnerships, outreach, community building",
      "Act as a liaison between the founder and the rest of the team",
      "Monitor team performance, compile reports, and flag blockers early",
      "Help define and refine internal processes as the company scales",
    ],
    requirements: [
      "2+ years of experience in project management, operations, or a chief-of-staff type role",
      "Exceptional organizational and communication skills",
      "Ability to context-switch between hiring, strategy, and execution",
      "Strong leadership instincts — comfortable managing people and holding them accountable",
      "Self-motivated with a bias for action and getting things done",
    ],
    niceToHaves: [
      "Experience in a startup or early-stage tech company",
      "Familiarity with the African tech ecosystem",
      "Background in HR, talent acquisition, or people operations",
      "Experience with project management tools (Notion, Trello, Asana, etc.)",
    ],
  },
  {
    title: "Marketing Manager",
    type: "Full-Time",
    location: "Remote",
    icon: TrendingUp,
    description:
      "We're looking for a creative and data-driven Marketing Manager to lead our growth initiatives. You'll own our marketing strategy end-to-end — from brand positioning and content creation to paid campaigns and community engagement.",
    responsibilities: [
      "Develop and execute multi-channel marketing strategies (social media, email, content, paid ads)",
      "Create compelling brand narratives and messaging that resonate with freelancers and agencies",
      "Analyze campaign performance, optimize funnels, and report on key growth metrics",
      "Collaborate with product and engineering to align marketing with feature launches",
      "Build and nurture our online community across social platforms",
      "Manage influencer partnerships and co-marketing opportunities",
    ],
    requirements: [
      "2+ years of experience in digital marketing, growth marketing, or a related role",
      "Proven track record of running successful campaigns that drive user acquisition",
      "Strong copywriting and storytelling skills",
      "Experience with analytics tools (Google Analytics, social media insights, etc.)",
      "Self-starter mindset with the ability to thrive in a fast-paced startup environment",
    ],
    niceToHaves: [
      "Experience marketing SaaS or B2B products",
      "Familiarity with the African freelance/agency market",
      "Video content creation or editing skills",
      "Experience with email marketing automation platforms",
    ],
  },
  {
    title: "Customer Success Manager",
    type: "Full-Time",
    location: "Remote",
    icon: Users,
    description:
      "We're hiring a Customer Success Manager to be the voice of our users. You'll help onboard new customers, ensure they get maximum value from SkryveAI, and turn satisfied users into loyal advocates.",
    responsibilities: [
      "Onboard new users and guide them through the platform's features and best practices",
      "Proactively engage with customers to identify pain points and opportunities for improvement",
      "Handle support inquiries with empathy, speed, and clarity across email and social channels",
      "Collect and synthesize user feedback to inform product development priorities",
      "Create help documentation, tutorials, and FAQs to empower self-service",
      "Track customer health metrics and work to reduce churn",
    ],
    requirements: [
      "1+ years of experience in customer success, support, or account management",
      "Excellent written and verbal communication skills",
      "Strong problem-solving abilities with a customer-first mindset",
      "Comfortable with SaaS tools and quick to learn new platforms",
      "Organized and able to manage multiple customer relationships simultaneously",
    ],
    niceToHaves: [
      "Experience in a startup or early-stage company",
      "Familiarity with CRM tools (HubSpot, Intercom, Freshdesk, etc.)",
      "Understanding of email outreach or cold outreach workflows",
      "Background in the African tech or freelance ecosystem",
    ],
  },
];

export default function Careers() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-subtle overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-5 bg-primary/8 text-primary border-0 font-semibold">
              <Sparkles className="w-3 h-3 mr-1" /> We're Hiring
            </Badge>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              Join the SkryveAI Team
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Help us empower freelancers and agencies across Africa to land more clients with smart, AI-powered outreach. We're building something big — and we want you on the team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-16 border-b border-border-subtle">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: "🌍", label: "Remote-First", desc: "Work from anywhere in the world" },
              { icon: "🚀", label: "Early Stage", desc: "Shape the product and culture from day one" },
              { icon: "💡", label: "Impact-Driven", desc: "Build tools that change how Africa does business" },
            ].map((perk) => (
              <motion.div
                key={perk.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-7 rounded-2xl bg-card border border-border-subtle card-hover text-center"
              >
                <span className="text-3xl mb-3 block">{perk.icon}</span>
                <h3 className="font-display font-bold mb-1">{perk.label}</h3>
                <p className="text-sm text-muted-foreground">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12 tracking-tight">Open Positions</h2>
          <div className="space-y-8">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border-subtle overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center">
                          <role.icon className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="font-display text-xl">{role.title}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="gap-1 border-border-subtle text-muted-foreground">
                          <Briefcase className="w-3 h-3" /> {role.type}
                        </Badge>
                        <Badge variant="outline" className="gap-1 border-border-subtle text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {role.location}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed">{role.description}</p>

                    <div>
                      <h4 className="font-display font-bold mb-3">What You'll Do</h4>
                      <ul className="space-y-2">
                        {role.responsibilities.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-display font-bold mb-3">What We're Looking For</h4>
                      <ul className="space-y-2">
                        {role.requirements.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-display font-bold mb-3">Nice to Have</h4>
                      <ul className="space-y-2">
                        {role.niceToHaves.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-border-subtle text-sm text-muted-foreground">
                      <Send className="w-4 h-4 inline mr-2 text-primary" />
                      Email us your application letter and CV at{" "}
                      <a href="mailto:skryveai@gmail.com" className="font-bold text-foreground underline underline-offset-2">
                        skryveai@gmail.com
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 tracking-tight">Don't See Your Role?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We're always open to hearing from talented people. Send us your CV and a note about how you'd contribute to SkryveAI.
          </p>
          <Button
            variant="outline"
            className="rounded-full border-primary text-primary font-bold px-8 py-5 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            onClick={() => {
              const subject = encodeURIComponent("General Application — SkryveAI");
              const body = encodeURIComponent(
                "Hi SkryveAI Team,\n\nI'd love to be part of the team! Here are my details:\n\n- Full Name: \n- Email: \n- LinkedIn / Portfolio: \n- Area of expertise: \n\n[Attach your CV/Resume]\n\nBest regards"
              );
              window.open(`mailto:skryveai@gmail.com?subject=${subject}&body=${body}`, "_blank");
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            Send a General Application
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
