import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Briefcase,
  ArrowLeft,
  Loader2,
  Mail,
  Crown,
  Shield,
  Trash2,
  Plus,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

const EXPERTISE_OPTIONS = [
  "3D Design", "Affiliate Marketing", "AI Development", "Amazon FBA", "Animation",
  "API Development", "Backend Development", "Blockchain", "Blog Writing", "Brand Identity",
  "Business Consulting", "Cloud Services", "Content Marketing", "Content Writing",
  "Copywriting", "Custom Software", "Customer Support", "Cybersecurity", "Data Entry",
  "Data Science", "DevOps", "Digital Strategy", "Dropshipping", "E-commerce", "Email Marketing",
  "Frontend Development", "Full Stack Development", "Game Development", "Ghostwriting",
  "Google Ads", "Graphic Design", "Growth Hacking", "GRC Consulting", "Illustration",
  "Influencer Marketing", "IT Support", "Lead Generation", "Logo Design", "Machine Learning",
  "Market Research", "Mobile App Development", "Motion Graphics", "Network Security",
  "No-Code Development", "Penetration Testing", "Photography", "Podcast Production",
  "PPC Advertising", "Product Design", "Product Listing", "Product Management",
  "Project Management", "Proofreading", "Public Relations", "Sales", "Scriptwriting",
  "SEO", "Shopify", "Social Media Management", "Social Media Marketing",
  "SaaS Development", "Supply Chain", "Technical Writing", "Translation", "UI/UX Design",
  "Video Editing", "Video Production", "Virtual Assistant", "Voice Over",
  "Web Design", "Web Development", "Webflow", "WordPress",
];

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  user_id: string | null;
  invited_at: string;
  joined_at: string | null;
}

interface TeamProfile {
  id: string;
  name: string;
  bio: string | null;
  expertise: string[] | null;
  portfolio_url: string | null;
  cv_url: string | null;
}

interface Team {
  id: string;
  name: string;
  plan: string;
  credits: number;
  max_members: number;
  max_profiles: number;
  owner_id: string;
}

export default function TeamManagement() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newProfile, setNewProfile] = useState({
    name: "",
    bio: "",
    expertise: [] as string[],
    portfolio_url: "",
  });
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchTeamData();
      fetchPendingInvites();
    }
  }, [user, authLoading]);

  const fetchTeamData = async () => {
    try {
      // Check if user owns a team
      const { data: ownedTeam } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (ownedTeam) {
        setTeam(ownedTeam);
        await Promise.all([fetchMembers(ownedTeam.id), fetchProfiles(ownedTeam.id)]);
      } else {
        // Check if user is a member of a team
        const { data: membership } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user!.id)
          .eq("status", "active")
          .maybeSingle();

        if (membership) {
          const { data: memberTeam } = await supabase
            .from("teams")
            .select("*")
            .eq("id", membership.team_id)
            .single();

          if (memberTeam) {
            setTeam(memberTeam);
            await Promise.all([fetchMembers(memberTeam.id), fetchProfiles(memberTeam.id)]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("team_members")
      .select("id, team_id, role, email, status")
      .eq("email", user.email)
      .eq("status", "invited");
    
    if (data && data.length > 0) {
      // Fetch team names for each invite
      const invitesWithTeams = await Promise.all(
        data.map(async (invite) => {
          const { data: teamData } = await supabase
            .from("teams")
            .select("name")
            .eq("id", invite.team_id)
            .single();
          return { ...invite, team_name: teamData?.name || "Unknown Team" };
        })
      );
      setPendingInvites(invitesWithTeams);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    setAcceptingInvite(invite.id);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({
          status: "active",
          user_id: user!.id,
          joined_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      if (error) throw error;

      toast({ title: "Team joined!", description: `You are now a member of "${invite.team_name}".` });
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
      await fetchTeamData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAcceptingInvite(null);
    }
  };

  const handleDeclineInvite = async (invite: any) => {
    setAcceptingInvite(invite.id);
    try {
      await supabase.from("team_members").delete().eq("id", invite.id);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast({ title: "Invitation declined" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAcceptingInvite(null);
    }
  };

  const fetchMembers = async (teamId: string) => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at");
    if (data) setMembers(data);
  };

  const fetchProfiles = async (teamId: string) => {
    const { data } = await supabase
      .from("team_profiles")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at");
    if (data) setProfiles(data);
  };

  const handleCreateTeam = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: `${user.user_metadata?.full_name || "My"}'s Team`, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setTeam(data);

      // Add owner as first member
      await supabase.from("team_members").insert({
        team_id: data.id,
        email: user.email!,
        user_id: user.id,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });

      await fetchMembers(data.id);
      toast({ title: "Team created!", description: "You can now invite members and create profiles." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!team || !inviteEmail) return;
    if (members.length >= team.max_members) {
      toast({ title: "Member limit reached", description: `Your plan allows up to ${team.max_members} members.`, variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-team-invite", {
        body: { teamId: team.id, email: inviteEmail, role: inviteRole },
      });

      if (response.error) throw new Error(response.error.message || "Failed to send invite");
      if (response.data?.error) throw new Error(response.data.error);

      setInviteEmail("");
      await fetchMembers(team.id);
      toast({ title: "Invitation sent!", description: `Invited ${inviteEmail} as ${inviteRole}. They'll receive an email and in-app notification.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    try {
      await supabase.from("team_members").delete().eq("id", memberId);
      await fetchMembers(team.id);
      toast({ title: "Member removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateProfile = async () => {
    if (!team || !newProfile.name) return;
    if (profiles.length >= team.max_profiles) {
      toast({ title: "Profile limit reached", description: `Your plan allows up to ${team.max_profiles} profiles.`, variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("team_profiles").insert({
        team_id: team.id,
        name: newProfile.name,
        bio: newProfile.bio || null,
        expertise: newProfile.expertise,
        portfolio_url: newProfile.portfolio_url || null,
        created_by: user!.id,
      });
      if (error) throw error;
      setNewProfile({ name: "", bio: "", expertise: [], portfolio_url: "" });
      setShowCreateProfile(false);
      await fetchProfiles(team.id);
      toast({ title: "Profile created!", description: `${newProfile.name} profile is ready to use in campaigns.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!team) return;
    try {
      await supabase.from("team_profiles").delete().eq("id", profileId);
      await fetchProfiles(team.id);
      toast({ title: "Profile deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isOwner = team?.owner_id === user?.id;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Users className="w-7 h-7" />
                Team Management
              </h1>
              <p className="text-muted-foreground text-sm">Manage your team members and expertise profiles</p>
            </div>
          </div>

          {/* Pending Invitations Banner */}
          {pendingInvites.length > 0 && (
            <div className="space-y-3 mb-8">
              {pendingInvites.map((invite) => (
                <Card key={invite.id} className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">You've been invited to join "{invite.team_name}"</p>
                        <p className="text-xs text-muted-foreground">Role: {invite.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={acceptingInvite === invite.id}
                        onClick={() => handleAcceptInvite(invite)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acceptingInvite === invite.id}
                        onClick={() => handleDeclineInvite(invite)}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!team ? (
            /* No team yet - create one */
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Your Agency Team</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Invite team members, create expertise profiles for different services,
                  and choose which profile to use for each campaign.
                </p>
                <Button size="lg" onClick={handleCreateTeam}>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Team Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-xs text-muted-foreground">/ {team.max_members} Members</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{profiles.length}</p>
                    <p className="text-xs text-muted-foreground">/ {team.max_profiles} Profiles</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{team.credits}</p>
                    <p className="text-xs text-muted-foreground">Credits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Badge variant="secondary" className="text-xs">{team.plan.replace("_", " ").toUpperCase()}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Plan</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="members" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="members" className="gap-2">
                    <Users className="w-4 h-4" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="profiles" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    Expertise Profiles
                  </TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members" className="space-y-4">
                  {isOwner && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <UserPlus className="w-5 h-5" />
                          Invite Member
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input
                            placeholder="team@member.com"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="flex-1"
                          />
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                            Invite
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Team Members</CardTitle>
                      <CardDescription>{members.length} of {team.max_members} members</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {member.role === "owner" ? (
                                  <Crown className="w-4 h-4 text-primary" />
                                ) : member.role === "admin" ? (
                                  <Shield className="w-4 h-4 text-primary" />
                                ) : (
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{member.email}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] capitalize">{member.role}</Badge>
                                  <Badge
                                    variant={member.status === "active" ? "default" : "secondary"}
                                    className="text-[10px] capitalize"
                                  >
                                    {member.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {isOwner && member.role !== "owner" && (
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {members.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No members yet. Invite your team!</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Profiles Tab */}
                <TabsContent value="profiles" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Expertise Profiles</h3>
                      <p className="text-sm text-muted-foreground">
                        Create profiles for different services (e.g., UI/UX, DevOps). Select which to use per campaign.
                      </p>
                    </div>
                    <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={profiles.length >= team.max_profiles}>
                          <Plus className="w-4 h-4 mr-1" />
                          New Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create Expertise Profile</DialogTitle>
                          <DialogDescription>
                            This profile represents a service offering your team can pitch to clients.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div className="space-y-2">
                            <Label>Profile Name *</Label>
                            <Input
                              placeholder="e.g., Web Development, UI/UX Design"
                              value={newProfile.name}
                              onChange={(e) => setNewProfile(p => ({ ...p, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bio / Description</Label>
                            <Textarea
                              placeholder="Describe this service offering..."
                              value={newProfile.bio}
                              onChange={(e) => setNewProfile(p => ({ ...p, bio: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Skills</Label>
                            <SearchableMultiSelect
                              options={EXPERTISE_OPTIONS}
                              selected={newProfile.expertise}
                              onChange={(selected) => setNewProfile(p => ({ ...p, expertise: selected }))}
                              placeholder="Search skills..."
                              maxHeight="180px"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              Portfolio URL
                            </Label>
                            <Input
                              type="url"
                              placeholder="https://portfolio.com"
                              value={newProfile.portfolio_url}
                              onChange={(e) => setNewProfile(p => ({ ...p, portfolio_url: e.target.value }))}
                            />
                          </div>
                          <Button onClick={handleCreateProfile} disabled={savingProfile || !newProfile.name} className="w-full">
                            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Profile
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {profiles.map((profile) => (
                      <Card key={profile.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{profile.name}</CardTitle>
                              {profile.portfolio_url && (
                                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                  <LinkIcon className="w-3 h-3" /> Portfolio
                                </a>
                              )}
                            </div>
                            {isOwner && (
                              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDeleteProfile(profile.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {profile.bio && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{profile.bio}</p>
                          )}
                          {profile.expertise && profile.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {profile.expertise.slice(0, 5).map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                              ))}
                              {profile.expertise.length > 5 && (
                                <Badge variant="outline" className="text-[10px]">+{profile.expertise.length - 5}</Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {profiles.length === 0 && (
                      <Card className="col-span-full border-dashed">
                        <CardContent className="py-8 text-center">
                          <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No profiles yet. Create expertise profiles to use in campaigns.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
