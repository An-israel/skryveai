import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { BlogCard, type BlogPost as BlogPostCard } from "@/components/blog/BlogCard";
import { Loader2, Calendar, Clock, Eye, ArrowLeft, Share2, Twitter, Linkedin, Facebook } from "lucide-react";
import { toast } from "sonner";

const SITE_URL = "https://skryveai.com";

interface FullPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[] | null;
  keywords: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  author: string;
  read_time: number;
  published_at: string | null;
  view_count: number;
  featured: boolean;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<FullPost | null>(null);
  const [related, setRelated] = useState<BlogPostCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (error || !data) {
        navigate("/blog", { replace: true });
        return;
      }
      setPost(data as FullPost);

      // Bump view count fire-and-forget
      supabase.rpc("increment_blog_view_count", { post_slug: slug }).then(() => undefined);

      // Related posts (same category)
      const { data: rel } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image, category, tags, author, read_time, published_at, view_count, featured")
        .eq("published", true)
        .eq("category", data.category)
        .neq("slug", slug)
        .limit(3);
      setRelated((rel ?? []) as BlogPostCard[]);
      setLoading(false);
    })();
  }, [slug, navigate]);

  if (loading || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const date = post.published_at ? new Date(post.published_at).toISOString() : new Date().toISOString();
  const dateDisplay = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const blogPostJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.excerpt || "",
    image: post.cover_image || `${SITE_URL}/logo.png`,
    datePublished: date,
    dateModified: date,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "SkryveAI",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: (post.keywords ?? []).join(", "),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const share = (platform: "twitter" | "linkedin" | "facebook" | "copy") => {
    const text = encodeURIComponent(post.title);
    const u = encodeURIComponent(url);
    if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${text}&url=${u}`, "_blank");
    if (platform === "linkedin") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, "_blank");
    if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank");
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title} | SkryveAI Blog</title>
        <meta name="description" content={description} />
        {post.keywords && post.keywords.length > 0 && (
          <meta name="keywords" content={post.keywords.join(", ")} />
        )}
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        {post.cover_image && <meta property="og:image" content={post.cover_image} />}
        <meta property="article:published_time" content={date} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        {(post.tags ?? []).map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {post.cover_image && <meta name="twitter:image" content={post.cover_image} />}
        <script type="application/ld+json">{JSON.stringify(blogPostJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        <article className="container mx-auto px-4 py-12 max-w-4xl">
          <Button variant="ghost" size="sm" asChild className="mb-8">
            <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" />All articles</Link>
          </Button>

          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">{post.category}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{post.title}</h1>
            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">{post.excerpt}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y py-4">
              <span className="font-medium text-foreground">{post.author}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{dateDisplay}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{post.read_time} min read</span>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{post.view_count.toLocaleString()} views</span>
              <div className="ml-auto flex items-center gap-1">
                <span className="text-xs mr-1">Share:</span>
                <Button variant="ghost" size="icon" onClick={() => share("twitter")} aria-label="Share on Twitter"><Twitter className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => share("linkedin")} aria-label="Share on LinkedIn"><Linkedin className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => share("facebook")} aria-label="Share on Facebook"><Facebook className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => share("copy")} aria-label="Copy link"><Share2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          {post.cover_image && (
            <div className="mb-10 rounded-xl overflow-hidden shadow-lg">
              <img src={post.cover_image} alt={post.title} className="w-full h-auto" />
            </div>
          )}

          <MarkdownRenderer content={post.content} />

          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Badge key={t} variant="outline">#{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Inline CTA */}
          <Card className="mt-12 p-8 bg-primary/5 border-primary/20 text-center">
            <h3 className="text-2xl font-bold mb-3">Try SkryveAI free for 7 days</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Find businesses that actually need your service. Send AI-personalized cold emails. Track replies automatically.
            </p>
            <Button asChild size="lg">
              <Link to="/signup">Start free trial</Link>
            </Button>
          </Card>
        </article>

        {related.length > 0 && (
          <section className="border-t bg-muted/20">
            <div className="container mx-auto px-4 py-12 max-w-6xl">
              <h2 className="text-2xl font-bold mb-6">Related articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map((p) => <BlogCard key={p.id} post={p} />)}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
