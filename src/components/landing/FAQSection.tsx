import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does SkryveAI find businesses for me?",
    a: "You enter a business type (e.g. 'restaurants') and a location. Our AI searches for matching businesses, finds their websites, emails, and social profiles — all automatically.",
  },
  {
    q: "What exactly does the online presence audit analyze?",
    a: "We audit their website copy, design quality, CTAs, LinkedIn profile, Instagram content, branding consistency, and more. The AI identifies specific pain points that cost them customers.",
  },
  {
    q: "Do I need technical skills to use SkryveAI?",
    a: "Not at all. Just enter your email, connect your sending account (we guide you step by step), and start your first campaign. No coding, APIs, or technical setup required.",
  },
  {
    q: "How personalized are the emails?",
    a: "Every email is unique. The AI references specific problems found on the prospect's website and social media — like weak CTAs, poor LinkedIn bios, or inconsistent branding. No templates.",
  },
  {
    q: "Can I use SkryveAI to find investors?",
    a: "Yes! Our 'Find Investors' campaign type lets you search for investors in your industry, and the AI crafts tailored pitch emails to help you raise funding for your startup.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — you get a 7-day free trial with full access to all features including the AI CV Builder, ATS Score Checker, LinkedIn Profile Analyzer, and cold email outreach. No credit card required to start.",
  },
  {
    q: "How does email sending work? Will my emails land in spam?",
    a: "SkryveAI includes smart scheduling and email warmup features that gradually build your sender reputation. Emails are sent from your own account, so deliverability stays high.",
  },
  {
    q: "How does the AI CV Builder work?",
    a: "Upload your existing CV or build one from scratch. Our AI rewrites it into a polished, ATS-optimized resume with proper formatting, keyword optimization, and a tailored LinkedIn profile guide — all in seconds.",
  },
  {
    q: "What is an ATS score and why does it matter?",
    a: "ATS (Applicant Tracking System) is software companies use to filter resumes before a human sees them. Our ATS Score Checker analyzes your resume against any job description, identifies missing keywords, and tells you exactly what to fix to pass the filter.",
  },
  {
    q: "How does the LinkedIn Profile Analyzer work?",
    a: "Upload your LinkedIn profile PDF or paste your profile text. The AI scores your headline, about section, experience, skills, education, and more — section by section. You get actionable tips, quick wins, and even rewrite suggestions for your headline and about section.",
  },
  {
    q: "What makes SkryveAI different from other outreach tools?",
    a: "Most cold email tools just send templates. SkryveAI researches each prospect's website, social media, and online presence, then generates genuinely personalized emails referencing real problems. Plus, we offer CV building, ATS checking, and LinkedIn analysis — all in one platform.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export function FAQSection() {
  return (
    <section className="py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Everything you need to know about SkryveAI.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border-subtle rounded-xl px-5 data-[state=open]:shadow-sm transition-shadow">
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
