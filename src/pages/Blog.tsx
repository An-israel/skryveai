import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlogCard, type BlogPost } from "@/components/blog/BlogCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, BookOpen } from "lucide-react";

const SITE_URL = "https://skryveai.com";

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
    <div className="min-h-screen flex flex-col bg-background">
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

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-16 md:py-24 text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">SkryveAI Blog</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-3xl mx-auto">
              Cold email playbooks that actually get replies
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Tactical guides, original reply-rate data, and AI-powered outreach strategies for freelancers, agencies, and founders.
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles, topics, tactics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b sticky top-16 bg-background/95 backdrop-blur z-10">
          <div className="container mx-auto px-4 py-4 flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="capitalize whitespace-nowrap"
              >
                {cat === "all" ? "All articles" : cat}
              </Button>
            ))}
          </div>
        </section>

        {/* Posts */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">No articles match your search yet.</p>
              <Button variant="link" onClick={() => { setSearch(""); setActiveCategory("all"); }}>Clear filters</Button>
            </div>
          ) : (
            <>
              {featured && (
                <div className="mb-12">
                  <BlogCard post={featured} variant="featured" />
                </div>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* CTA */}
        <section className="border-t bg-primary/5">
          <div className="container mx-auto px-4 py-16 text-center">
            <Badge variant="default" className="mb-4">Free 7-day trial</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop guessing. Start sending emails that work.</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Try SkryveAI free for 7 days. AI-qualified leads, personalized pitches, automatic follow-ups.
            </p>
            <Button asChild size="lg">
              <a href="/signup">Start your free trial</a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
