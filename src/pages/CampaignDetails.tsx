import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Mail,
  Eye,
  MessageSquare,
  TrendingUp,
  MapPin,
  Briefcase,
  Calendar,
  Send,
  BarChart3,
  Loader2,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  business_type: string;
  location: string;
  status: string;
  emails_sent: number;
  emails_opened: number;
  replies: number;
  created_at: string;
  updated_at?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "running":
      return "default";
    case "completed":
    case "done":
      return "secondary";
    case "paused":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetchCampaign = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCampaign(data as Campaign);
      }
      setLoading(false);
    };
    fetchCampaign();
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <h1 className="text-2xl font-bold">Campaign not found</h1>
            <p className="text-muted-foreground">This campaign doesn't exist or you don't have access to it.</p>
            <Button asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const openRate = campaign.emails_sent > 0
    ? Math.round((campaign.emails_opened / campaign.emails_sent) * 100)
    : 0;
  const replyRate = campaign.emails_sent > 0
    ? Math.round((campaign.replies / campaign.emails_sent) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Back + Header */}
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    {campaign.business_type}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {campaign.location}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(campaign.created_at)}
                  </span>
                </div>
              </div>
              <Badge variant={statusVariant(campaign.status)} className="capitalize text-sm px-3 py-1">
                {campaign.status}
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Send className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl font-bold">{campaign.emails_sent.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Emails Sent</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Eye className="h-5 w-5 text-blue-500 mb-1" />
                <span className="text-2xl font-bold">{campaign.emails_opened.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Opened</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <MessageSquare className="h-5 w-5 text-green-500 mb-1" />
                <span className="text-2xl font-bold">{campaign.replies.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Replies</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <TrendingUp className="h-5 w-5 text-orange-500 mb-1" />
                <span className="text-2xl font-bold">{replyRate}%</span>
                <span className="text-xs text-muted-foreground">Reply Rate</span>
              </CardContent>
            </Card>
          </div>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
              <CardDescription>Email engagement breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open Rate</span>
                  <span className="font-medium">{openRate}%</span>
                </div>
                <Progress value={openRate} className="h-2" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reply Rate</span>
                  <span className="font-medium">{replyRate}%</span>
                </div>
                <Progress value={replyRate} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
