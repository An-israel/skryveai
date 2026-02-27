import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, Send, Users, TrendingUp, Sparkles } from "lucide-react";

const roles = [
  {
    title: "Marketing Manager",
    type: "Full-Time",
    location: "Remote",
    icon: TrendingUp,
    description:
      "We're looking for a creative and data-driven Marketing Manager to lead our growth initiatives. You'll own our marketing strategy end-to-end — from brand positioning and content creation to paid campaigns and community engagement. This role is pivotal in driving awareness and adoption of SkryveAI across Africa and beyond.",
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
      "We're hiring a Customer Success Manager to be the voice of our users. You'll help onboard new customers, ensure they get maximum value from SkryveAI, and turn satisfied users into loyal advocates. If you're passionate about helping people succeed and love building relationships, this is the role for you.",
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
  const handleApply = (roleTitle: string) => {
    const subject = encodeURIComponent(`Application: ${roleTitle} at SkryveAI`);
    const body = encodeURIComponent(
      `Hi SkryveAI Team,\n\nI'm excited to apply for the ${roleTitle} position.\n\nPlease find my details below:\n\n- Full Name: \n- Email: \n- Phone: \n- LinkedIn / Portfolio: \n- Brief intro (why you're a great fit):\n\n[Attach your CV/Resume]\n\nLooking forward to hearing from you!\n\nBest regards`
    );
    window.open(`mailto:skryveai@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-4 bg-primary-foreground/20 text-primary-foreground border-0">
              <Sparkles className="w-3 h-3 mr-1" /> We're Hiring
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Join the SkryveAI Team
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Help us empower freelancers and agencies across Africa to land more clients with smart, AI-powered outreach. We're building something big — and we want you on the team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
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
                className="p-6 rounded-2xl bg-card border"
              >
                <span className="text-3xl mb-3 block">{perk.icon}</span>
                <h3 className="font-semibold mb-1">{perk.label}</h3>
                <p className="text-sm text-muted-foreground">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-10">Open Positions</h2>
          <div className="space-y-8">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <role.icon className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{role.title}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Briefcase className="w-3 h-3" /> {role.type}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="w-3 h-3" /> {role.location}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground">{role.description}</p>

                    <div>
                      <h4 className="font-semibold mb-2">What You'll Do</h4>
                      <ul className="space-y-1.5">
                        {role.responsibilities.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">What We're Looking For</h4>
                      <ul className="space-y-1.5">
                        {role.requirements.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Nice to Have</h4>
                      <ul className="space-y-1.5">
                        {role.niceToHaves.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button onClick={() => handleApply(role.title)} className="w-full sm:w-auto">
                      <Send className="w-4 h-4 mr-2" />
                      Apply for this Role
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-3">Don't See Your Role?</h2>
          <p className="text-muted-foreground mb-6">
            We're always open to hearing from talented people. Send us your CV and a note about how you'd contribute to SkryveAI.
          </p>
          <Button
            variant="outline"
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
