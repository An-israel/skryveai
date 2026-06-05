import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Clock, Send, ArrowRight, Menu, X, Twitter, Linkedin, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── Navbar ──────────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#09090b]/95 backdrop-blur-md border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
          <span className="font-bold text-[15px] text-white tracking-tight">Skryve</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {[
            { label: "Features", href: "/#features" },
            { label: "Pricing",  href: "/pricing"   },
            { label: "Blog",     href: "/blog"      },
            { label: "About",    href: "/about"     },
          ].map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-[#09090b] text-[13px] font-semibold hover:bg-white/90 transition-all"
          >
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#09090b]/98 border-t border-white/[0.06] px-5 py-5 flex flex-col gap-4">
          {[
            { label: "Features", href: "/#features" },
            { label: "Pricing",  href: "/pricing"   },
            { label: "Blog",     href: "/blog"      },
            { label: "About",    href: "/about"     },
          ].map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              className="text-[14px] font-medium text-white/60 hover:text-white transition-colors"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
            <Link
              to="/login"
              className="text-center py-2 rounded-lg border border-white/[0.12] text-[13px] text-white/70"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-center py-2 rounded-lg bg-white text-[#09090b] text-[13px] font-semibold"
              onClick={() => setOpen(false)}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#09090b] border-t border-white/[0.06] py-12">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Skryve" className="w-6 h-6 object-contain" />
            <span className="font-bold text-[15px] text-white">Skryve</span>
          </Link>

          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-3 text-[13px] text-white/35">
            {[
              { label: "About",          href: "/about"          },
              { label: "Blog",           href: "/blog"           },
              { label: "Pricing",        href: "/pricing"        },
              { label: "Contact",        href: "/contact"        },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Terms",          href: "/terms"          },
            ].map(({ label, href }) => (
              <Link key={label} to={href} className="hover:text-white transition-colors">{label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {[
              { icon: Twitter,   href: "https://twitter.com",   label: "Twitter"   },
              { icon: Linkedin,  href: "https://linkedin.com",  label: "LinkedIn"  },
              { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-white/25 hover:text-white/60 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/25">
          <p>© {new Date().getFullYear()} Skryve. All rights reserved.</p>
          <p>Built for the modern African professional.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mailtoLink = `mailto:skryveai@gmail.com?subject=${encodeURIComponent(formData.subject || "Contact from SkryveAI")}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`;
    window.open(mailtoLink, "_blank");

    toast({
      title: "Opening your email client",
      description: "Your message has been prepared. Send it via your email app.",
    });

    setIsSubmitting(false);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      detail: "skryveai@gmail.com",
      href: "mailto:skryveai@gmail.com",
      isLink: true,
    },
    {
      icon: MessageSquare,
      title: "Social Media",
      detail: "DM us on Instagram or LinkedIn",
      href: null,
      isLink: false,
    },
    {
      icon: Clock,
      title: "Response Time",
      detail: "Usually within 24 hours",
      href: null,
      isLink: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Helmet>
        <title>Contact SkryveAI — Get Help & Support</title>
        <meta
          name="description"
          content="Contact SkryveAI for questions about our AI cold outreach, CV builder, ATS checker, or LinkedIn analyzer tools. We respond within 24 hours."
        />
        <meta name="keywords" content="contact SkryveAI, SkryveAI support, AI outreach help" />
        <link rel="canonical" href="https://skryveai.com/contact" />
        <meta property="og:title" content="Contact SkryveAI — Get Help & Support" />
        <meta property="og:description" content="Reach the SkryveAI team. We respond within 24 hours." />
        <meta property="og:url" content="https://skryveai.com/contact" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-5 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4 block">
            Contact
          </span>
          <h1 className="text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-5">
            Get in touch
          </h1>
          <p className="text-[16px] text-white/40 leading-relaxed">
            Have questions, feedback, or need help? We'd love to hear from you. Drop us a message and we'll get back to you fast.
          </p>
        </motion.div>
      </section>

      {/* Contact methods */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid sm:grid-cols-3 gap-4 mb-14">
            {contactMethods.map((method, i) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 text-center hover:border-white/[0.1] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center mx-auto mb-4">
                  <method.icon className="w-5 h-5 text-[#2563EB]" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-1">{method.title}</h3>
                {method.isLink && method.href ? (
                  <a
                    href={method.href}
                    className="text-[13px] text-[#2563EB] hover:text-[#3b82f6] transition-colors"
                  >
                    {method.detail}
                  </a>
                ) : (
                  <p className="text-[13px] text-white/50">{method.detail}</p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto"
          >
            <div className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-8">
              <h2 className="text-[18px] font-semibold text-white mb-1">Send us a message</h2>
              <p className="text-[13px] text-white/40 mb-7">Fill out the form below and we'll get back to you.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-[12px] font-medium text-white/50 uppercase tracking-wide">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      maxLength={100}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.2] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[12px] font-medium text-white/50 uppercase tracking-wide">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      maxLength={255}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.2] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-[12px] font-medium text-white/50 uppercase tracking-wide">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    maxLength={200}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.2] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-[12px] font-medium text-white/50 uppercase tracking-wide">
                    Message
                  </label>
                  <textarea
                    id="message"
                    placeholder="Tell us more..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    maxLength={2000}
                    rows={5}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.2] transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#09090b] text-[14px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
