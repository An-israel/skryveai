import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser } from "@/lib/notify";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const AVAILABILITY_BADGE: Record<string, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  busy: { label: "Busy", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  not_available: { label: "Not Available", className: "bg-red-500/10 text-red-600 border-red-500/20" },
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
      notifyUser({
        userId: talentUserId,
        type: "invite",
        title: "You've been invited to a job!",
        message: `A client has invited you to apply for "${jobTitle}".`,
        link: `/marketplace/${jobId}`,
        emailCategory: "jobs",
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
      <div>
        <h1 className="font-display text-2xl font-bold">Find Talent</h1>
        <p className="text-muted-foreground text-sm mt-1">Discover skilled professionals — hire them for your projects or collaborate with them on yours.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
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

        <div className="flex gap-1 items-center">
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
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredTalents.length} talent{filteredTalents.length !== 1 ? "s" : ""} found
      </p>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filteredTalents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold mb-2">No talent found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTalents.map((talent) => {
            const avail = AVAILABILITY_BADGE[talent.availability_status || "available"];
            const profileSlug =
              talent.full_name?.toLowerCase().replace(/\s+/g, "-") || talent.id;
            const rate = formatRate(talent.hourly_rate, talent.rate_currency);

            return (
              <div
                key={talent.id}
                className="border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{talent.full_name}</p>
                      {avail && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${avail.className}`}>
                          {avail.label}
                        </Badge>
                      )}
                    </div>
                    {talent.primary_skill && (
                      <p className="text-xs text-muted-foreground mt-0.5">{talent.primary_skill}</p>
                    )}
                  </div>
                </div>

                {talent.secondary_skills && talent.secondary_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {talent.secondary_skills.slice(0, 3).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  {rate ? (
                    <span className="font-semibold">{rate}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Rate not set</span>
                  )}
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs text-foreground font-medium">5.0</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/profile/${profileSlug}`)}
                  >
                    View Profile
                  </Button>

                  {clientJobs.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="gap-1">
                          Invite <ChevronDown className="w-3 h-3" />
                        </Button>
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
