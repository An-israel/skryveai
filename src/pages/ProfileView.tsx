import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser } from "@/lib/notify";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Star, Calendar, Briefcase, MessageSquare, Share2, Eye,
  Globe, Linkedin, Twitter, Github, ImageIcon, ExternalLink,
} from "lucide-react";

const AVAILABILITY_STYLES: Record<string, { label: string; class: string }> = {
  available:   { label: "Available",     class: "bg-green-500/10 text-green-500 border-green-500/30" },
  busy:        { label: "Busy",          class: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  unavailable: { label: "Not Available", class: "bg-red-500/10 text-red-500 border-red-500/30" },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [talent, setTalent] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewAsClient, setPreviewAsClient] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      setNotFound(false);

      // The :username param can be a talent username, an auth user id,
      // a talent_profiles id, or a slugified full name — resolve all of them.
      const tpq = () => (supabase as any).from("talent_profiles").select("*");
      let tp: any = null;

      if (UUID_RE.test(username)) {
        ({ data: tp } = await tpq().eq("user_id", username).maybeSingle());
        if (!tp) ({ data: tp } = await tpq().eq("id", username).maybeSingle());
      } else {
        ({ data: tp } = await tpq().eq("username", username).maybeSingle());
        if (!tp) {
          const nameFromSlug = username.replace(/-/g, " ");
          const { data: matches } = await tpq().ilike("full_name", nameFromSlug).limit(1);
          tp = matches?.[0] ?? null;
        }
      }

      if (!tp) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTalent(tp);

      const { data: items } = await (supabase as any)
        .from("portfolio_items")
        .select("*")
        .eq("talent_id", tp.id)
        .order("is_featured", { ascending: false });

      setPortfolio(items || []);
      setLoading(false);
    })();
  }, [username]);

  // Record the view; the talent is notified once per viewer per day.
  useEffect(() => {
    if (!currentUser?.id || !talent?.user_id || currentUser.id === talent.user_id) return;
    (async () => {
      const { data: isNewView } = await (supabase as any).rpc("record_profile_view", {
        _talent_user: talent.user_id,
      });
      if (!isNewView) return;
      const [{ data: cp }, { data: tp }] = await Promise.all([
        (supabase as any).from("client_profiles").select("company_name").eq("user_id", currentUser.id).maybeSingle(),
        (supabase as any).from("talent_profiles").select("full_name").eq("user_id", currentUser.id).maybeSingle(),
      ]);
      const viewerName = cp?.company_name || tp?.full_name || "Someone";
      notifyUser({
        userId: talent.user_id,
        type: "profile_view",
        title: "Your profile was viewed 👀",
        message: `${viewerName} viewed your profile today.`,
        link: "/profile",
        emailCategory: "jobs",
      });
    })();
  }, [currentUser?.id, talent?.user_id]);

  const handleMessage = async () => {
    if (!currentUser) { navigate("/login"); return; }
    if (!talent?.user_id || talent.user_id === currentUser.id) return;
    const { data, error } = await (supabase as any).rpc("get_or_create_direct_conversation", {
      _other: talent.user_id,
    });
    if (error || !data) {
      toast({ title: "Couldn't start conversation", description: error?.message, variant: "destructive" });
      return;
    }
    navigate(`/dm/${data}`);
  };

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-24">
        <h2 className="font-display text-2xl font-bold mb-2">Profile not found</h2>
        <p className="text-muted-foreground mb-6">The profile you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/marketplace")}>Browse Talent</Button>
      </div>
    );
  }

  const isOwner = currentUser?.id === talent?.user_id && !previewAsClient;
  const avail = AVAILABILITY_STYLES[talent?.availability_status] || AVAILABILITY_STYLES.available;
  const memberYear = talent?.created_at ? new Date(talent.created_at).getFullYear() : null;
  const social = talent?.social_links || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="overflow-hidden">
        {talent?.cover_photo_url ? (
          <div className="h-32 sm:h-40 bg-muted">
            <img src={talent.cover_photo_url} alt="Cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        )}
        <CardContent className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {talent?.profile_photo_url ? (
                <img src={talent.profile_photo_url} alt={talent?.full_name || "Talent"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {(talent?.full_name || talent?.username || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-extrabold">
                  {talent?.full_name || talent?.username || "Talent"}
                </h1>
                <Badge variant="outline" className={avail.class}>{avail.label}</Badge>
              </div>
              {talent?.tagline && (
                <p className="text-sm text-muted-foreground mt-0.5">{talent.tagline}</p>
              )}
              {talent?.location && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {talent.location}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isOwner ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate("/profile")}>Edit Profile</Button>
                  <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="w-4 h-4 mr-1" />Share</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewAsClient(true)}>
                    <Eye className="w-4 h-4 mr-1" />Preview as Client
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleMessage}>
                  <MessageSquare className="w-4 h-4 mr-1" />Send Message
                </Button>
              )}
              {previewAsClient && (
                <Button size="sm" variant="ghost" onClick={() => setPreviewAsClient(false)}>Exit Preview</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {talent?.bio && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm mb-2">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{talent.bio}</p>
          </CardContent>
        </Card>
      )}

      {(talent?.primary_skill || (talent?.secondary_skills?.length ?? 0) > 0) && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {talent?.primary_skill && (
                <Badge className="text-sm px-3 py-1">{talent.primary_skill}</Badge>
              )}
              {(talent?.secondary_skills || []).map((skill: string) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {memberYear && (
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="font-semibold text-sm">{memberYear}</p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Briefcase className="w-4 h-4" />
              </div>
              <p className="font-semibold text-sm">{talent?.completed_projects_count || 0}</p>
              <p className="text-xs text-muted-foreground">Completed Projects</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="font-semibold text-sm">
                {talent?.total_reviews > 0 && talent?.rating_avg ? Number(talent.rating_avg).toFixed(1) : "New"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
            {talent?.total_reviews > 0 && (
              <div>
                <p className="font-semibold text-sm">{talent.total_reviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(social.linkedin || social.twitter || social.github || social.website) && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm mb-3">Links</h2>
            <div className="flex flex-wrap gap-3">
              {social.linkedin && (
                <a href={social.linkedin} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </Button>
                </a>
              )}
              {social.twitter && (
                <a href={social.twitter} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Twitter className="w-4 h-4" /> Twitter
                  </Button>
                </a>
              )}
              {social.github && (
                <a href={social.github} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Github className="w-4 h-4" /> GitHub
                  </Button>
                </a>
              )}
              {social.website && (
                <a href={social.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Globe className="w-4 h-4" /> Website
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {portfolio.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg mb-3">Portfolio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {portfolio.map(item => (
              <Card key={item.id} className="overflow-hidden group cursor-pointer">
                <a href={item.project_url || item.image_url || "#"} target="_blank" rel="noopener noreferrer">
                  <div className="relative aspect-video bg-muted flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    )}
                    {item.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-950 text-[10px]">
                        <Star className="w-3 h-3 mr-0.5 fill-current" /> Featured
                      </Badge>
                    )}
                    {item.project_url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {item.skill_category && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">{item.skill_category}</Badge>
                    )}
                  </CardContent>
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-sm mb-3">Reviews</h2>
          {talent?.total_reviews > 0 ? (
            <p className="text-sm text-muted-foreground">Reviews coming soon.</p>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
