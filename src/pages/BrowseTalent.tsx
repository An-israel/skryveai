import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users, ChevronDown } from "lucide-react";

const AVAILABILITY_DOT: Record<string, { color: string; label: string }> = {
  available: { color: "bg-green-500", label: "Available" },
  busy: { color: "bg-amber-500", label: "Busy" },
  not_available: { color: "bg-red-500", label: "Not Available" },
};

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatRate(rate: number | null, currency = "NGN") {
  if (!rate) return null;
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] || "₦"}${rate.toLocaleString()}/hr`;
}

export default function BrowseTalent() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientJobs, setClientJobs] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [skillFilter, setSkillFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchClientJobs(session.user.id);
      }
    });
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("talent_profiles")
      .select(
        "id, full_name, profile_photo_url, primary_skill, secondary_skills, experience_level, hourly_rate, rate_currency, bio, availability_status, created_at"
      )
      .not("full_name", "is", null)
      .order("created_at", { ascending: false });
    setTalents(data || []);
    setLoading(false);
  };

  const fetchClientJobs = async (userId: string) => {
    const { data: cp } = await (supabase as any)
      .from("client_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (!cp) return;

    const { data: jobs } = await (supabase as any)
      .from("job_posts")
      .select("id, title")
      .eq("client_id", cp.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setClientJobs(jobs || []);
  };

  const handleInvite = async (talentId: string, jobId: string, jobTitle: string, talentUserId: string) => {
    try {
      await (supabase as any).from("notifications").insert({
        user_id: talentUserId,
        title: "You've been invited to a job!",
        message: `A client has invited you to apply for "${jobTitle}".`,
        type: "invite",
        link: "/marketplace",
      });
      toast({ title: "Invitation sent!", description: `Talent has been invited to "${jobTitle}".` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filteredTalents = talents
    .filter((t) => {
      if (skillFilter) {
        const skills = [t.primary_skill, ...(t.secondary_skills || [])].filter(Boolean).join(" ").toLowerCase();
        if (!skills.includes(skillFilter.toLowerCase())) return false;
      }
      if (levelFilter !== "all" && t.experience_level !== levelFilter) return false;
      if (availabilityFilter !== "all" && t.availability_status !== availabilityFilter) return false;
      if (minRate && t.hourly_rate != null && Number(t.hourly_rate) < Number(minRate)) return false;
      if (maxRate && t.hourly_rate != null && Number(t.hourly_rate) > Number(maxRate)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rate_low") return (a.hourly_rate || 0) - (b.hourly_rate || 0);
      if (sortBy === "rate_high") return (b.hourly_rate || 0) - (a.hourly_rate || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const hasFilters = skillFilter || levelFilter !== "all" || availabilityFilter !== "all" || minRate || maxRate;

  const clearFilters = () => {
    setSkillFilter("");
    setLevelFilter("all");
    setAvailabilityFilter("all");
    setMinRate("");
    setMaxRate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Browse Talent</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Find skilled freelancers for your projects.</p>
      </div>

      {/* Filters */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <span className="text-[13px] font-semibold text-foreground">Filters</span>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <Input
              placeholder="Search by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            />
          </div>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>

          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Availability</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="not_available">Not Available</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1.5 items-center">
            <Input
              type="number"
              placeholder="Min rate"
              className="w-24"
              value={minRate}
              onChange={(e) => setMinRate(e.target.value)}
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="number"
              placeholder="Max rate"
              className="w-24"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rate_low">Lowest Rate</SelectItem>
              <SelectItem value="rate_high">Highest Rate</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <p className="text-[12px] text-muted-foreground">
        {filteredTalents.length} talent{filteredTalents.length !== 1 ? "s" : ""} found
      </p>

      {/* Talent grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filteredTalents.length === 0 ? (
        <div className="border border-border rounded-xl bg-card">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mb-4" />
            <h3 className="text-[14px] font-medium text-foreground mb-1">No talent found</h3>
            <p className="text-[13px] text-muted-foreground">Try adjusting your filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTalents.map((talent) => {
            const avail = AVAILABILITY_DOT[talent.availability_status || "available"];
            const profileSlug =
              talent.full_name?.toLowerCase().replace(/\s+/g, "-") || talent.id;
            const rate = formatRate(talent.hourly_rate, talent.rate_currency);

            return (
              <div
                key={talent.id}
                className="border border-border rounded-xl bg-card overflow-hidden hover:border-primary/30 transition-colors flex flex-col"
              >
                <div className="px-5 py-5 flex-1">
                  <div className="flex items-start gap-3 mb-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-bold text-primary shrink-0 overflow-hidden">
                      {talent.profile_photo_url ? (
                        <img
                          src={talent.profile_photo_url}
                          alt={talent.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(talent.full_name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-foreground truncate">{talent.full_name}</p>
                        {avail && (
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${avail.color}`} />
                            <span className="text-[11px] text-muted-foreground">{avail.label}</span>
                          </span>
                        )}
                      </div>
                      {talent.primary_skill && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{talent.primary_skill}</p>
                      )}
                    </div>
                  </div>

                  {/* Skills chips */}
                  {talent.secondary_skills && talent.secondary_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {talent.secondary_skills.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rate + rating */}
                  <div className="flex items-center justify-between">
                    {rate ? (
                      <span className="text-[13px] font-semibold text-foreground">{rate}</span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">Rate not set</span>
                    )}
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-[12px] text-foreground font-medium">5.0</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-border flex gap-2">
                  <button
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    onClick={() => navigate(`/profile/${profileSlug}`)}
                  >
                    View Profile
                  </button>

                  {clientJobs.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 flex items-center gap-1 transition-colors">
                          Invite <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {clientJobs.map((job) => (
                          <DropdownMenuItem
                            key={job.id}
                            onClick={() =>
                              handleInvite(talent.id, job.id, job.title, talent.user_id)
                            }
                          >
                            {job.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
