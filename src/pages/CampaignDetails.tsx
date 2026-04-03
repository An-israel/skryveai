import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Mail, Clock, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"

interface EmailQueueItem {
  id: string
  to_email: string
  subject: string
  status: string
  created_at: string
  sent_at?: string
}

interface Campaign {
  id: string
  name: string
  status: string
  campaign_type: string
  created_at: string
}

const statusIcon = (status: string) => {
  if (status === "sent") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />
  return <Clock className="h-4 w-4 text-yellow-500" />
}

export default function CampaignDetails() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth(true)
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [emails, setEmails] = useState<EmailQueueItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !id) return

    const fetchData = async () => {
      const [campaignRes, emailsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("id", id).eq("user_id", user.id).single(),
        supabase.from("email_queue").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
      ])
      if (campaignRes.data) setCampaign(campaignRes.data)
      if (emailsRes.data) setEmails(emailsRes.data)
      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel("campaign-emails")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_queue", filter: `campaign_id=eq.${id}` },
        () => { fetchData() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, id])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={!!user} />
        <main className="container py-8"><Skeleton className="h-64 w-full" /></main>
      </div>
    )
  }

  const sent = emails.filter((e) => e.status === "sent").length
  const pending = emails.filter((e) => e.status === "pending").length
  const failed = emails.filter((e) => e.status === "failed").length

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={!!user} />
      <main className="container py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign?.name || "Campaign"}</h1>
            <p className="text-muted-foreground text-sm">Created {campaign ? formatDate(campaign.created_at) : ""}</p>
          </div>
          <Badge className="ml-auto capitalize">{campaign?.status}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{emails.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Sent</p><p className="text-2xl font-bold text-green-600">{sent}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{pending}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-600">{failed}</p></CardContent></Card>
        </div>

        {/* Email List */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Emails</CardTitle></CardHeader>
          <CardContent>
            {emails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No emails in this campaign yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">{email.to_email}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{email.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {statusIcon(email.status)}
                          <span className="capitalize text-sm">{email.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(email.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
