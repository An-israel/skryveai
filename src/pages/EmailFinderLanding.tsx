import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Mail, Search, ShieldCheck, Upload, Sparkles, Zap, Globe, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SkryveAI Email Finder",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://skryveai.com/tools/email-finder",
  description: "Free AI-powered email finder. Discover and verify business emails by company name or domain — no Hunter or Apollo subscription needed.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier available, no credit card required" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "240" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Is the email finder free?", acceptedAnswer: { "@type": "Answer", text: "Yes — every account gets free monthly email lookups during their trial and beyond. No credit card required." } },
    { "@type": "Question", name: "How accurate is SkryveAI Email Finder?", acceptedAnswer: { "@type": "Answer", text: "We combine site scraping, MX validation, pattern learning, and SMTP-based verification to return a confidence score (0–100) for every email so you know how reliable it is before sending." } },
    { "@type": "Question", name: "Can I find emails in bulk?", acceptedAnswer: { "@type": "Answer", text: "Yes — upload a CSV with up to 100 companies or domains and we process them in the background with real-time progress tracking, then export the verified results." } },
    { "@type": "Question", name: "Is this a Hunter or Apollo alternative?", acceptedAnswer: { "@type": "Answer", text: "Yes. SkryveAI Email Finder uses our own native discovery engine with Firecrawl + DNS + pattern intelligence — no third-party email API subscriptions required." } },
  ],
};

export default function EmailFinderLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free Email Finder Tool — Find Any Business Email | SkryveAI"
        description="Find verified business emails by company name or domain. Free AI-powered email finder with bulk CSV processing, pattern detection, and MX verification. No Hunter subscription needed."
        keywords="free email finder, email finder tool, find email by domain, find email by company name, bulk email finder, email verifier, hunter alternative, apollo alternative, email lookup tool"
        canonical="https://skryveai.com/tools/email-finder"
        jsonLd={jsonLd}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-12 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            100% Free • No Credit Card
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Find Any Business Email in Seconds
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            AI-powered email discovery across the open web. Type a company name or domain — get a verified email with confidence score. No Hunter, no Apollo, no subscription required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6">
              <Link to="/email-finder">Try Email Finder Free <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6">
              <Link to="/signup">Create Free Account</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Used by 2,000+ freelancers and founders to land more clients.</p>
        </section>

        {/* Feature Grid */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Search, title: "Single Lookup", body: "Find an email by name + domain or by company. Returns confidence + sources." },
              { icon: Upload, title: "Bulk CSV", body: "Upload up to 100 rows. Background processing with live progress tracking." },
              { icon: ShieldCheck, title: "Verification", body: "MX records + SMTP checks + disposable detection — all baked in." },
              { icon: Zap, title: "Pattern Learning", body: "Detects company patterns ({first}.{last}@) so future lookups are instant." },
              { icon: Globe, title: "Open Web Powered", body: "Scrapes about/team/contact pages — no opaque third-party API." },
              { icon: Mail, title: "Add to Campaigns", body: "One click to drop a verified email into a SkryveAI outreach campaign." },
            ].map((f) => (
              <Card key={f.title} className="border-border/40">
                <CardContent className="pt-6 space-y-2">
                  <f.icon className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-2">Why SkryveAI vs Hunter or Apollo?</h2>
          <p className="text-center text-muted-foreground mb-8">Built for freelancers and lean teams — no enterprise pricing.</p>
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Feature</th>
                  <th className="p-3 font-medium">SkryveAI</th>
                  <th className="p-3 font-medium">Hunter.io</th>
                  <th className="p-3 font-medium">Apollo.io</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Free monthly searches", "Generous", "25/mo", "50/mo"],
                  ["Pattern learning", true, true, false],
                  ["Bulk CSV finder", true, true, true],
                  ["Built-in verification", true, true, true],
                  ["Direct campaign integration", true, false, false],
                  ["Outreach + AI pitches included", true, false, false],
                  ["Starts at", "$0", "$49/mo", "$49/mo"],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="p-3 text-muted-foreground">{row[0] as string}</td>
                    {row.slice(1).map((v, idx) => (
                      <td key={idx} className="text-center p-3">
                        {typeof v === "boolean" ? (
                          v ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                        ) : (
                          <span className={idx === 0 ? "font-semibold text-primary" : ""}>{v as string}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is the email finder free?", a: "Yes — every account gets free monthly lookups. No credit card needed to start." },
              { q: "How accurate are the emails?", a: "We combine site scraping, MX validation, pattern intelligence, and SMTP verification — every result returns a 0–100 confidence score." },
              { q: "Can I find emails in bulk?", a: "Yes — upload a CSV of up to 100 companies and we process them in the background with live progress tracking, then let you export verified results." },
              { q: "Is this a Hunter.io alternative?", a: "Yes. We built our own discovery engine using Firecrawl + DNS + pattern learning, so you don't need a Hunter or Apollo subscription." },
              { q: "What can I do with the emails?", a: "Copy them, export to CSV, or one-click add them into a SkryveAI outreach campaign and let our AI write personalized cold emails for you." },
            ].map((item) => (
              <Card key={item.q}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop guessing. Start sending.</h2>
          <p className="text-muted-foreground mb-6">Find verified emails for your dream clients in seconds — and let SkryveAI write the pitch too.</p>
          <Button asChild size="lg" className="h-12 px-8">
            <Link to="/email-finder">Find an Email Now <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
