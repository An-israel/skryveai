import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, Eye, EyeOff, RefreshCw, Search, Loader2, Send, 
  MessageSquare, ChevronDown, ChevronUp, Plus, Trash2, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AdminEmail {
  id: string;
  sent_by: string;
  to_email: string;
  to_user_id: string | null;
  subject: string;
  body: string;
  template_type: string | null;
  status: string;
  created_at: string;
  opened_at: string | null;
  resend_id: string | null;
}

interface AdminEmailReply {
  id: string;
  admin_email_id: string;
  logged_by: string;
  reply_content: string;
  received_at: string;
  created_at: string;
}

interface SenderProfile {
  user_id: string;
  full_name: string;
}

export function AdminEmailTracker() {
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [senders, setSenders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, AdminEmailReply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logEmailId, setLogEmailId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmails((data as AdminEmail[]) || []);

      const senderIds = [...new Set((data || []).map(e => e.sent_by))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", senderIds);

        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: SenderProfile) => { map[p.user_id] = p.full_name; });
          setSenders(map);
        }
      }
    } catch (error) {
      console.error("Failed to load admin emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (emailId: string) => {
    setLoadingReplies(emailId);
    try {
      const { data, error } = await supabase
        .from("admin_email_replies")
        .select("*")
        .eq("admin_email_id", emailId)
        .order("received_at", { ascending: true });

      if (error) throw error;
      setReplies(prev => ({ ...prev, [emailId]: (data as AdminEmailReply[]) || [] }));
    } catch (err) {
      console.error("Failed to load replies:", err);
    } finally {
      setLoadingReplies(null);
    }
  };

  const toggleExpand = (emailId: string) => {
    if (expandedId === emailId) {
      setExpandedId(null);
    } else {
      setExpandedId(emailId);
      if (!replies[emailId]) loadReplies(emailId);
    }
  };

  const handleLogReply = async () => {
    if (!logEmailId || !replyContent.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("admin_email_replies").insert({
        admin_email_id: logEmailId,
        logged_by: user.id,
        reply_content: replyContent.trim(),
        received_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Reply logged", description: "The reply has been recorded successfully." });
      setLogDialogOpen(false);
      setReplyContent("");
      setLogEmailId(null);
      loadReplies(logEmailId);
    } catch (err) {
      console.error("Failed to log reply:", err);
      toast({ title: "Error", description: "Failed to log reply", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReply = async (replyId: string, emailId: string) => {
    try {
      const { error } = await supabase.from("admin_email_replies").delete().eq("id", replyId);
      if (error) throw error;
      setReplies(prev => ({
        ...prev,
        [emailId]: (prev[emailId] || []).filter(r => r.id !== replyId),
      }));
      toast({ title: "Reply removed" });
    } catch (err) {
      console.error("Failed to delete reply:", err);
    }
  };

  const filteredEmails = search.trim()
    ? emails.filter(
        (e) =>
          e.to_email.toLowerCase().includes(search.toLowerCase()) ||
          e.subject.toLowerCase().includes(search.toLowerCase()) ||
          (senders[e.sent_by] || "").toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  const stats = {
    total: emails.length,
    opened: emails.filter((e) => e.opened_at).length,
    unopened: emails.filter((e) => !e.opened_at).length,
    replied: Object.values(replies).filter(r => r.length > 0).length,
  };

  const openRate = stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Send className="w-4 h-4" />
              <span className="text-xs">Total Sent</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs">Opened</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.opened}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">Unopened</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{stats.unopened}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Mail className="w-4 h-4" />
              <span className="text-xs">Open Rate</span>
            </div>
            <p className="text-2xl font-bold text-primary">{openRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Email List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Sent Emails &amp; Replies
            </CardTitle>
            <CardDescription>Track emails sent by support staff and log user replies</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emails..."
                className="pl-9 w-[200px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadEmails}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{search ? "No emails match your search" : "No emails sent yet"}</p>
            </div>
          ) : (
            <div className="space-y-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => {
                    const isExpanded = expandedId === email.id;
                    const emailReplies = replies[email.id] || [];
                    const hasReplies = emailReplies.length > 0;

                    return (
                      <>
                        <TableRow
                          key={email.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(email.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {email.to_email}
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate">
                            {email.subject}
                          </TableCell>
                          <TableCell className="text-sm">
                            {senders[email.sent_by] || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {email.opened_at ? (
                                <Badge className="gap-1 bg-success/10 text-success">
                                  <Eye className="w-3 h-3" /> Opened
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <EyeOff className="w-3 h-3" /> Not opened
                                </Badge>
                              )}
                              {hasReplies && (
                                <Badge className="gap-1 bg-primary/10 text-primary">
                                  <MessageSquare className="w-3 h-3" /> {emailReplies.length}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogEmailId(email.id);
                                setLogDialogOpen(true);
                              }}
                              title="Log a reply"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${email.id}-detail`}>
                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                              <div className="p-4 space-y-4">
                                {/* Original email */}
                                <div className="rounded-lg border border-border bg-card p-4">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <Send className="w-3 h-3" />
                                    <span>Sent by {senders[email.sent_by] || "Unknown"}</span>
                                    <span>·</span>
                                    <span>{format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                                  </div>
                                  <p className="font-semibold text-sm mb-1">{email.subject}</p>
                                  <div
                                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: email.body }}
                                  />
                                </div>

                                {/* Replies */}
                                {loadingReplies === email.id ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  </div>
                                ) : emailReplies.length > 0 ? (
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                      <MessageSquare className="w-3 h-3" />
                                      Replies ({emailReplies.length})
                                    </h4>
                                    {emailReplies.map((reply) => (
                                      <div key={reply.id} className="rounded-lg border border-primary/20 bg-primary/5 p-4 relative group">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                          <Clock className="w-3 h-3" />
                                          <span>Received {format(new Date(reply.received_at), "MMM d, yyyy 'at' h:mm a")}</span>
                                          <span>·</span>
                                          <span>Logged by {senders[reply.logged_by] || "Staff"}</span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{reply.reply_content}</p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                          onClick={() => handleDeleteReply(reply.id, email.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No replies logged yet</p>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setLogEmailId(email.id);
                                    setLogDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Log a Reply
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Reply Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Log a Reply
            </DialogTitle>
            <DialogDescription>
              Paste or type the reply you received from the user. This helps the team track conversations.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Paste the user's reply here..."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogReply} disabled={saving || !replyContent.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Save Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
