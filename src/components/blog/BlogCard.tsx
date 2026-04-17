import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Eye } from "lucide-react";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  tags: string[] | null;
  author: string;
  read_time: number;
  published_at: string | null;
  view_count: number;
  featured: boolean;
}

interface BlogCardProps {
  post: BlogPost;
  variant?: "default" | "featured";
}

export function BlogCard({ post, variant = "default" }: BlogCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  if (variant === "featured") {
    return (
      <Link to={`/blog/${post.slug}`} className="group block">
        <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 h-full bg-gradient-to-br from-card to-card/50">
          <div className="md:grid md:grid-cols-2">
            {post.cover_image && (
              <div className="aspect-video md:aspect-auto md:h-full overflow-hidden bg-muted">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            )}
            <CardContent className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default" className="bg-primary">Featured</Badge>
                <Badge variant="secondary">{post.category}</Badge>
              </div>
              <h2 className="text-3xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time} min read</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${post.slug}`} className="group block h-full">
      <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
        {post.cover_image && (
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="p-6 flex flex-col flex-1">
          <Badge variant="secondary" className="mb-3 w-fit">{post.category}</Badge>
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-4 border-t">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time}m</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
