import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { type BlogPost } from "@/components/blog/BlogCard";
import { Loader2, Search, BookOpen, Calendar, Clock, Eye, ArrowRight, Menu, X, Twitter, Linkedin, Instagram } from "lucide-react";

const SITE_URL = "https://skryveai.com";

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

/* ─── Dark Blog Card ──────────────────────────────────────── */
function DarkBlogCard({ post, variant = "default" }: { post: BlogPost; variant?: "default" | "featured" }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  if (variant === "featured") {
    return (
      <Link to={`/blog/${post.slug}`} className="group block">
        <div className="border border-white/[0.08] bg-white/[0.02] rounded-2xl overflow-hidden hover:border-white/[0.16] transition-colors">
          <div className="md:grid md:grid-cols-2">
            {post.cover_image && (
              <div className="aspect-video md:aspect-auto md:h-full overflow-hidden bg-white/[0.03]">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2563EB] px-2.5 py-1 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10">
                  Featured
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03]">
                  {post.category}
                </span>
              </div>
              <h2 className="text-[22px] font-bold text-white leading-snug mb-3 group-hover:text-white/80 transition-colors line-clamp-2">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-[13px] text-white/50 mb-5 line-clamp-3 leading-relaxed">{post.excerpt}</p>
              )}
              <div className="flex items-center gap-4 text-[11px] text-white/30 mt-auto">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time} min read</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${post.slug}`} className="group block h-full">
      <div className="border border-white/[0.06] rounded-xl bg-white/[0.02] p-6 hover:border-white/[0.12] transition-colors h-full flex flex-col">
        {post.cover_image && (
          <div className="aspect-video overflow-hidden rounded-lg bg-white/[0.03] mb-5 -mx-6 -mt-6">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            {post.category}
          </span>
        </div>
        <h3 className="text-[16px] font-semibold text-white mb-2 group-hover:text-white/80 transition-colors line-clamp-2 leading-snug flex-1">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-[13px] text-white/50 mb-4 line-clamp-3 leading-relaxed">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-white/30 mt-auto pt-4 border-t border-white/[0.06]">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time}m</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image, category, tags, author, read_time, published_at, view_count, featured")
        .eq("published", true)
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) console.error("Failed to load posts:", error);
      setPosts((data ?? []) as BlogPost[]);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(posts.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesCat = activeCategory === "all" || p.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? "").toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [posts, activeCategory, search]);

  const featured = filtered.find((p) => p.featured);
  const rest = filtered.filter((p) => p.id !== featured?.id);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "SkryveAI Blog",
    description: "Cold email, lead generation, freelancing, and AI outreach strategy from SkryveAI.",
    url: `${SITE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "SkryveAI",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    blogPost: posts.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.published_at,
      author: { "@type": "Person", name: p.author },
    })),
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Helmet>
        <title>SkryveAI Blog — Cold Email, AI Outreach & Freelancer Growth Guides</title>
        <meta
          name="description"
          content="Tactical playbooks, real reply-rate data, and AI-powered outreach strategies for freelancers and startup founders. Updated weekly by the SkryveAI team."
        />
        <meta name="keywords" content="cold email, AI outreach, freelancer guides, lead generation, ATS resume, LinkedIn analyzer, cold email templates, sales prospecting" />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta property="og:title" content="SkryveAI Blog — AI Outreach & Freelancer Growth" />
        <meta property="og:description" content="Tactical playbooks for cold email, lead generation, and AI-powered outreach." />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(blogJsonLd)}</script>
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
          <div className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB]">
              SkryveAI Blog
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-[-0.03em] leading-[1.05] mb-4">
            Cold email playbooks<br />that actually get replies
          </h1>
          <p className="text-[16px] text-white/40 leading-relaxed">
            Tactical guides, original reply-rate data, and AI-powered outreach strategies for freelancers, agencies, and founders.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 max-w-md relative"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search articles, topics, tactics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2] transition-colors"
          />
        </motion.div>
      </section>

      {/* Category filter */}
      <div className="sticky top-14 z-10 bg-[#09090b]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all ${
                activeCategory === cat
                  ? "bg-white text-[#09090b]"
                  : "text-white/40 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {cat === "all" ? "All articles" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <main className="max-w-6xl mx-auto px-5 py-14">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[15px] text-white/40 mb-4">No articles match your search yet.</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("all"); }}
              className="text-[13px] text-[#2563EB] hover:text-[#3b82f6] transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-10"
              >
                <DarkBlogCard post={featured} variant="featured" />
              </motion.div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DarkBlogCard post={post} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* CTA Banner */}
      <section className="border-t border-white/[0.06]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-5 py-20 text-center"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2563EB] mb-4 block">
            Free 7-day trial
          </span>
          <h2 className="text-4xl font-extrabold text-white tracking-[-0.03em] mb-4">
            Stop guessing. Start sending<br />emails that work.
          </h2>
          <p className="text-[15px] text-white/40 mb-8 max-w-xl mx-auto leading-relaxed">
            Try SkryveAI free for 7 days. AI-qualified leads, personalized pitches, automatic follow-ups.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#09090b] text-[14px] font-semibold hover:bg-white/90 transition-all"
          >
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
