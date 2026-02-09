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
    a: "Yes — you get a 3-day free trial with full access to all features. No credit card required to start.",
  },
  {
    q: "How does email sending work? Will my emails land in spam?",
    a: "SkryveAI includes smart scheduling and email warmup features that gradually build your sender reputation. Emails are sent from your own account, so deliverability stays high.",
  },
];

// JSON-LD FAQ Schema for SEO
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
    <section className="py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to know about SkryveAI.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
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
