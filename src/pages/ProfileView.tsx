import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Star, Calendar, Briefcase, MessageSquare, Share2, Eye,
  Globe, Linkedin, Twitter, Github, ImageIcon, ExternalLink,
} from "lucide-react";

const AVAILABILITY_STYLES: Record<string, { label: string; dotClass: string }> = {
  available:   { label: "Available",     dotClass: "bg-green-500" },
  busy:        { label: "Busy",          dotClass: "bg-amber-500" },
  unavailable: { label: "Not Available", dotClass: "bg-red-500" },
};

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [talent, setTalent] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noTalentProfile, setNoTalentProfile] = useState(false);
  const [previewAsClient, setPreviewAsClient] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const { data: pu } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("username", username)
        .maybeSingle();

      if (!pu) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfileUser(pu);

      const { data: tp } = await (supabase as any)
        .from("talent_profiles")
        .select("*")
        .eq("user_id", pu.id)
        .maybeSingle();

      if (!tp) {
        setNoTalentProfile(true);
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
        <h2 className="text-xl font-bold text-foreground mb-2">Profile not found</h2>
        <p className="text-[13px] text-muted-foreground mb-6">The profile you're looking for doesn't exist or has been removed.</p>
        <button
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          onClick={() => navigate("/marketplace")}
        >
          Browse Talent
        </button>
      </div>
    );
  }

  if (noTalentProfile) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold text-foreground mb-2">Profile not set up</h2>
        <p className="text-[13px] text-muted-foreground">This user hasn't set up their talent profile yet.</p>
      </div>
    );
  }

  const isOwner = currentUser?.id === profileUser?.id && !previewAsClient;
  const avail = AVAILABILITY_STYLES[talent?.availability_status] || AVAILABILITY_STYLES.available;
  const memberYear = talent?.created_at ? new Date(talent.created_at).getFullYear() : null;
  const social = talent?.social_links || {};

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* ── Hero card ── */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {talent?.profile_photo_url ? (
                <img src={talent.profile_photo_url} alt={profileUser?.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {(profileUser?.full_name || profileUser?.username || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">
                  {talent?.full_name || profileUser?.full_name || profileUser?.username}
                </h1>
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${avail.dotClass}`} />
                  <span className="text-[12px] text-muted-foreground">{avail.label}</span>
                </span>
              </div>
              {talent?.tagline && (
                <p className="text-[13px] text-muted-foreground">{talent.tagline}</p>
              )}
              {talent?.location && (
                <div className="flex items-center gap-1 mt-1 text-[12px] text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {talent.location}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isOwner ? (
                <>
                  <button
                    className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    onClick={() => navigate("/profile")}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors"
                    onClick={handleShare}
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors"
                    onClick={() => setPreviewAsClient(true)}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview as Client
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 flex items-center gap-1.5 transition-colors"
                    onClick={() => navigate(`/messages?talent=${profileUser?.id}`)}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Send Message
                  </button>
                  <button className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    Invite to Job
                  </button>
                </>
              )}
              {previewAsClient && (
                <button
                  className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setPreviewAsClient(false)}
                >
                  Exit Preview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── About ── */}
      {talent?.bio && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-foreground">About</span>
          </div>
          <div className="px-5 py-5">
            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">{talent.bio}</p>
          </div>
        </div>
      )}

      {/* ── Skills ── */}
      {(talent?.primary_skill || (talent?.secondary_skills?.length ?? 0) > 0) && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-foreground">Skills</span>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-wrap gap-2">
              {talent?.primary_skill && (
                <span className="text-[13px] px-3 py-1 bg-primary/10 text-primary rounded-lg font-medium">
                  {talent.primary_skill}
                </span>
              )}
              {(talent?.secondary_skills || []).map((skill: string) => (
                <span key={skill} className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {memberYear && (
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1.5">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <p className="text-[14px] font-semibold text-foreground">{memberYear}</p>
              <p className="text-[12px] text-muted-foreground">Member Since</p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1.5">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">{talent?.completed_projects_count || 0}</p>
            <p className="text-[12px] text-muted-foreground">Completed Projects</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1.5">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">{talent?.rating_avg ? Number(talent.rating_avg).toFixed(1) : "5.0"}</p>
            <p className="text-[12px] text-muted-foreground">Avg Rating</p>
          </div>
          {talent?.total_reviews > 0 && (
            <div>
              <p className="text-[14px] font-semibold text-foreground">{talent.total_reviews}</p>
              <p className="text-[12px] text-muted-foreground">Reviews</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Social links ── */}
      {(social.linkedin || social.twitter || social.github || social.website) && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-foreground">Links</span>
          </div>
          <div className="px-5 py-5 flex flex-wrap gap-2">
            {social.linkedin && (
              <a href={social.linkedin} target="_blank" rel="noopener noreferrer">
                <button className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </button>
              </a>
            )}
            {social.twitter && (
              <a href={social.twitter} target="_blank" rel="noopener noreferrer">
                <button className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors">
                  <Twitter className="w-3.5 h-3.5" /> Twitter
                </button>
              </a>
            )}
            {social.github && (
              <a href={social.github} target="_blank" rel="noopener noreferrer">
                <button className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors">
                  <Github className="w-3.5 h-3.5" /> GitHub
                </button>
              </a>
            )}
            {social.website && (
              <a href={social.website} target="_blank" rel="noopener noreferrer">
                <button className="px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center gap-1.5 transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Website
                </button>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Portfolio ── */}
      {portfolio.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Portfolio</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {portfolio.map(item => (
              <div key={item.id} className="border border-border rounded-xl bg-card overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors">
                <a href={item.project_url || item.image_url || "#"} target="_blank" rel="noopener noreferrer">
                  <div className="relative aspect-video bg-muted flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                    {item.is_featured && (
                      <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-amber-500/90 text-amber-950 rounded-md font-semibold flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-current" /> Featured
                      </span>
                    )}
                    {item.project_url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                    {item.skill_category && (
                      <span className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md mt-1 inline-block">
                        {item.skill_category}
                      </span>
                    )}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reviews ── */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <span className="text-[13px] font-semibold text-foreground">Reviews</span>
        </div>
        <div className="px-5 py-5">
          {talent?.total_reviews > 0 ? (
            <p className="text-[13px] text-muted-foreground">Reviews coming soon.</p>
          ) : (
            <p className="text-[13px] text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
