import { useEffect, useState } from "react"
import {
  Users, UserPlus, Crown, Shield, User, Mail, Loader2,
  Trash2, MoreVertical, AlertCircle, CheckCircle2
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { getInitials, formatDate } from "@/lib/utils"

interface TeamMember {
  id: string
  user_id: string
  role: "owner" | "admin" | "member"
  joined_at: string
  email?: string
  full_name?: string
}

interface TeamData {
  id: string
  name: string
  owner_id: string
  created_at: string
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
}

const roleColors = {
  owner: "bg-yellow-100 text-yellow-700 border-yellow-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  member: "bg-gray-100 text-gray-700 border-gray-200",
}

export default function Team() {
  const { user, loading: authLoading } = useAuth(true)
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [subscription, setSubscription] = useState<{ plan: string } | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      // Check subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", user!.id)
        .single()
      setSubscription(sub)

      // Get team membership
      const { data: memberRow } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user!.id)
        .single()

      if (memberRow) {
        // Get team
        const { data: teamData } = await supabase
          .from("teams")
          .select("*")
          .eq("id", memberRow.team_id)
          .single()
        setTeam(teamData)

        // Get all members
        const { data: allMembers } = await supabase
          .from("team_members")
          .select("*")
          .eq("team_id", memberRow.team_id)
        setMembers((allMembers || []).map(m => ({
          ...m,
          role: m.role as "owner" | "admin" | "member",
        })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isTeamPlan = subscription?.plan === "team_basic" || subscription?.plan === "team_pro"

  const createTeam = async () => {
    if (!teamName.trim()) return
    setCreatingTeam(true)
    try {
      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({ name: teamName.trim(), owner_id: user!.id })
        .select()
        .single()

      if (teamError) throw new Error(teamError.message)

      // Add owner as member
      await supabase.from("team_members").insert([{
        team_id: newTeam.id,
        user_id: user!.id,
        email: user!.email || "",
        role: "owner",
      }])

      setTeam(newTeam)
      setMembers([{ id: crypto.randomUUID(), user_id: user!.id, role: "owner", joined_at: new Date().toISOString(), email: user!.email }])
      toast({ title: "Team created!", description: "Now invite your team members." })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create team",
        variant: "destructive",
      })
    } finally {
      setCreatingTeam(false)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !team) return
    setInviting(true)
    setInviteSuccess(false)
    try {
      const { error } = await supabase.functions.invoke("send-team-invite", {
        body: { teamId: team.id, teamName: team.name, inviteEmail: inviteEmail.trim(), inviterName: user!.user_metadata?.full_name || user!.email },
      })
      if (error) throw new Error(error.message)

      setInviteSuccess(true)
      setInviteEmail("")
      toast({ title: "Invite sent!", description: `Invitation sent to ${inviteEmail}` })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send invite",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user!.id) return
    try {
      await supabase.from("team_members").delete().eq("id", memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast({ title: "Member removed" })
    } catch (err) {
      toast({ title: "Error", description: "Could not remove member", variant: "destructive" })
    }
  }

  const currentUserRole = members.find(m => m.user_id === user?.id)?.role
  const canManage = currentUserRole === "owner" || currentUserRole === "admin"

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header isAuthenticated={!!user} />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Team
            </h1>
            <p className="text-muted-foreground">Collaborate with your team and share campaigns</p>
          </div>

          {/* Not on team plan */}
          {!isTeamPlan && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Team features require a Team plan.{" "}
                <a href="/pricing" className="text-primary font-medium hover:underline">
                  Upgrade your plan →
                </a>
              </AlertDescription>
            </Alert>
          )}

          {/* No team yet — create one */}
          {isTeamPlan && !team && (
            <Card>
              <CardHeader>
                <CardTitle>Create Your Team</CardTitle>
                <CardDescription>Give your team a name and start inviting members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Acme Agency, Design Studio"
                    onKeyDown={e => e.key === "Enter" && createTeam()}
                  />
                </div>
                <Button onClick={createTeam} disabled={creatingTeam || !teamName.trim()} className="w-full">
                  {creatingTeam ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Team"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Team exists */}
          {team && (
            <>
              {/* Team header */}
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{team.name}</h2>
                        <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""} • Created {formatDate(team.created_at)}</p>
                      </div>
                    </div>
                    {canManage && (
                      <Button onClick={() => { setShowInviteDialog(true); setInviteSuccess(false) }}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Members list */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map(member => {
                      const RoleIcon = roleIcons[member.role]
                      const isMe = member.user_id === user?.id
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(member.full_name || member.email || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.full_name || member.email || "Team Member"}
                              {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                            </p>
                            {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                          </div>
                          <Badge variant="outline" className={`gap-1 ${roleColors[member.role]}`}>
                            <RoleIcon className="h-3 w-3" />
                            {member.role}
                          </Badge>
                          {canManage && !isMe && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => removeMember(member.id, member.user_id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Role Legend */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <Crown className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <div><p className="font-medium">Owner</p><p className="text-muted-foreground text-xs">Full control</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div><p className="font-medium">Admin</p><p className="text-muted-foreground text-xs">Can invite members</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                      <div><p className="font-medium">Member</p><p className="text-muted-foreground text-xs">Can create campaigns</p></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Enter their email address and we'll send them an invitation.</DialogDescription>
          </DialogHeader>
          {inviteSuccess ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-medium">Invitation sent!</p>
              <p className="text-sm text-muted-foreground mt-1">They'll receive an email to join the team.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendInvite()}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Close</Button>
            {!inviteSuccess && (
              <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : <><Mail className="h-4 w-4 mr-2" />Send Invite</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
