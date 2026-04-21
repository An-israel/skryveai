import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, subDays, differenceInDays } from "date-fns";
import {
  Users, AlertTriangle, Zap, TrendingUp, MessageSquare, Send,
  Loader2, RefreshCw, Star, UserX, Clock, CheckCircle, ArrowRight,
} from "lucide-react";
import { whatsappUrl, formatPhoneDisplay } from "@/lib/whatsapp";

interface UserHealth {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  subscription_status: string;
  subscription_plan: string;
  credits: number;
  total_campaigns: number;
  total_emails_sent: number;
  last_campaign_at: string | null;
  days_since_signup: number;
  days_inactive: number;
  risk_level: "healthy" | "at_risk" | "churning" | "inactive";
}

interface ConversationThread {
  user_id: string;
  user_name: string;
  user_email: string;
  messages: ThreadMessage[];
  last_message_at: string;
  has_unread: boolean;
}

interface ThreadMessage {
  id: string;
  direction: "outbound" | "inbound";
  content: string;
  subject?: string;
  timestamp: string;
  sender_name?: string;
}

export function CustomerSuccessDashboard() {
  const [loading, setLoading] = useState(true);
  const [userHealthData, setUserHealthData] = useState<UserHealth[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<ConversationThread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [sending, setSending] = useState(false);
  const [healthFilter, setHealthFilter] = useState<"all" | "inactive" | "at_risk" | "churning" | "power">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvo]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUserHealth(), loadConversations()]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserHealth = async () => {
    // Get profiles with subscriptions
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false });

    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("user_id, status, plan, credits");

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("user_id, created_at, emails_sent");

    if (!profiles) return;

    const subsMap = new Map((subscriptions || []).map(s => [s.user_id, s]));
    const campaignsByUser = new Map<string, { count: number; totalSent: number; lastAt: string | null }>();

    (campaigns || []).forEach(c => {
      const existing = campaignsByUser.get(c.user_id) || { count: 0, totalSent: 0, lastAt: null };
      existing.count++;
      existing.totalSent += c.emails_sent;
      if (!existing.lastAt || c.created_at > existing.lastAt) existing.lastAt = c.created_at;
      campaignsByUser.set(c.user_id, existing);
    });

    const now = new Date();
    const healthData: UserHealth[] = profiles.map(p => {
      const sub = subsMap.get(p.user_id);
      const camp = campaignsByUser.get(p.user_id) || { count: 0, totalSent: 0, lastAt: null };
      const daysSinceSignup = differenceInDays(now, new Date(p.created_at));
      const daysInactive = camp.lastAt ? differenceInDays(now, new Date(camp.lastAt)) : daysSinceSignup;

      let riskLevel: UserHealth["risk_level"] = "healthy";
      if (camp.count === 0 && daysSinceSignup > 1) riskLevel = "inactive";
      else if (sub?.status === "active" && daysInactive >= 7) riskLevel = "churning";
      else if (sub?.status === "trial" && camp.count === 0) riskLevel = "at_risk";
      else if (daysInactive >= 5) riskLevel = "at_risk";

      return {
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: (p as { phone?: string | null }).phone ?? null,
        created_at: p.created_at,
        subscription_status: sub?.status || "none",
        subscription_plan: sub?.plan || "none",
        credits: sub?.credits || 0,
        total_campaigns: camp.count,
        total_emails_sent: camp.totalSent,
        last_campaign_at: camp.lastAt,
        days_since_signup: daysSinceSignup,
        days_inactive: daysInactive,
        risk_level: riskLevel,
      };
    });

    setUserHealthData(healthData);
  };

  const loadConversations = async () => {
    // Get all admin emails with their replies
    const { data: emails } = await supabase
      .from("admin_emails")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: replies } = await supabase
      .from("admin_email_replies")
      .select("*")
      .order("received_at", { ascending: true });

    if (!emails) return;

    // Get sender profiles
    const senderIds = [...new Set(emails.map(e => e.sent_by))];
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", senderIds);
    const senderMap = new Map((senderProfiles || []).map(p => [p.user_id, p.full_name]));

    // Group by recipient
    const threadMap = new Map<string, ConversationThread>();

    emails.forEach(email => {
      const key = email.to_user_id || email.to_email;
      if (!threadMap.has(key)) {
        threadMap.set(key, {
          user_id: email.to_user_id || "",
          user_name: "",
          user_email: email.to_email,
          messages: [],
          last_message_at: email.created_at,
          has_unread: false,
        });
      }
      const thread = threadMap.get(key)!;
      thread.messages.push({
        id: email.id,
        direction: "outbound",
        content: email.body,
        subject: email.subject,
        timestamp: email.created_at,
        sender_name: senderMap.get(email.sent_by) || "Staff",
      });
    });

    // Add replies to threads
    (replies || []).forEach(reply => {
      // Find thread by matching admin_email_id
      const parentEmail = emails.find(e => e.id === reply.admin_email_id);
      if (!parentEmail) return;
      const key = parentEmail.to_user_id || parentEmail.to_email;
      const thread = threadMap.get(key);
      if (!thread) return;
      thread.messages.push({
        id: reply.id,
        direction: "inbound",
        content: reply.reply_content,
        timestamp: reply.received_at || reply.created_at,
      });
      if (reply.received_at > thread.last_message_at) {
        thread.last_message_at = reply.received_at;
        thread.has_unread = true;
      }
    });

    // Get user names for threads
    const userIds = [...threadMap.values()].filter(t => t.user_id).map(t => t.user_id);
    if (userIds.length > 0) {
      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      (userProfiles || []).forEach(p => {
        threadMap.forEach(thread => {
          if (thread.user_id === p.user_id) thread.user_name = p.full_name;
        });
      });
    }

    // Sort threads: unread first, then by last message
    const threads = [...threadMap.values()]
      .map(t => ({
        ...t,
        messages: t.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      }))
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    setConversations(threads);
  };

  const sendReply = async () => {
    if (!selectedConvo || !replyText.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          toEmail: selectedConvo.user_email,
          toUserId: selectedConvo.user_id || null,
          subject: replySubject || `Re: Follow-up from SkryveAI`,
          body: replyText,
          templateType: null,
        },
      });
      if (error) throw error;
      toast({ title: "Reply sent!" });
      setReplyText("");
      setReplySubject("");
      await loadConversations();
      // Re-select the conversation
      setTimeout(() => {
        setConversations(prev => {
          const updated = prev.find(c => c.user_email === selectedConvo.user_email);
          if (updated) setSelectedConvo(updated);
          return prev;
        });
      }, 500);
    } catch (err) {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Stats
  const totalUsers = userHealthData.length;
  const inactiveCount = userHealthData.filter(u => u.risk_level === "inactive").length;
  const atRiskCount = userHealthData.filter(u => u.risk_level === "at_risk").length;
  const churningCount = userHealthData.filter(u => u.risk_level === "churning").length;
  const powerUsers = userHealthData.filter(u => u.total_emails_sent >= 20 && u.risk_level === "healthy").length;
  const newSignupsToday = userHealthData.filter(u => u.days_since_signup === 0).length;
  const activatedRate = totalUsers > 0
    ? Math.round((userHealthData.filter(u => u.total_campaigns > 0).length / totalUsers) * 100)
    : 0;

  const filteredHealth = userHealthData.filter(u => {
    if (healthFilter === "all") return true;
    if (healthFilter === "power") return u.total_emails_sent >= 20 && u.risk_level === "healthy";
    return u.risk_level === healthFilter;
  });

  const riskBadge = (level: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      healthy: { variant: "default", label: "Healthy" },
      at_risk: { variant: "secondary", label: "At Risk" },
      churning: { variant: "destructive", label: "Churn Risk" },
      inactive: { variant: "outline", label: "Inactive" },
    };
    const v = variants[level] || variants.healthy;
    return <Badge variant={v.variant}>{v.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setHealthFilter("all")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Total Users</span>
            </div>
            <p className="text-xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setHealthFilter("all")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs">New Today</span>
            </div>
            <p className="text-xl font-bold">{newSignupsToday}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setHealthFilter("all")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs">Activated</span>
            </div>
            <p className="text-xl font-bold">{activatedRate}%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive/50 transition-colors border-destructive/20" onClick={() => setHealthFilter("inactive")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-destructive mb-1">
              <UserX className="w-3.5 h-3.5" />
              <span className="text-xs">Inactive</span>
            </div>
            <p className="text-xl font-bold text-destructive">{inactiveCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors border-yellow-500/20" onClick={() => setHealthFilter("at_risk")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-yellow-600 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs">At Risk</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{atRiskCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500/50 transition-colors border-red-500/20" onClick={() => setHealthFilter("churning")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-red-600 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Churn Risk</span>
            </div>
            <p className="text-xl font-bold text-red-600">{churningCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50 transition-colors border-green-500/20" onClick={() => setHealthFilter("power")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-green-600 mb-1">
              <Star className="w-3.5 h-3.5" />
              <span className="text-xs">Power Users</span>
            </div>
            <p className="text-xl font-bold text-green-600">{powerUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health" className="gap-1.5">
            <Users className="w-3.5 h-3.5" /> User Health
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Conversations
            {conversations.filter(c => c.has_unread).length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {conversations.filter(c => c.has_unread).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* User Health Tab */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Health Monitor</CardTitle>
                  <CardDescription>
                    {healthFilter === "all" ? "All users" : healthFilter === "power" ? "Power users (20+ emails)" : `${healthFilter.replace("_", " ")} users`}
                    {" — "}{filteredHealth.length} users
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadDashboardData} className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Emails Sent</TableHead>
                    <TableHead>Days Inactive</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHealth.slice(0, 50).map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex flex-col gap-1 text-xs">
                            {(() => {
                              const wa = whatsappUrl(user.phone);
                              return wa ? (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:underline font-medium"
                                  title="Open in WhatsApp"
                                >
                                  💬 {formatPhoneDisplay(user.phone)}
                                </a>
                              ) : (
                                <span className="text-muted-foreground italic">{user.phone}</span>
                              );
                            })()}
                            <a
                              href={`mailto:${user.email}`}
                              className="text-primary hover:underline truncate max-w-[180px]"
                            >
                              ✉ Email
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscription_status === "active" ? "default" : "secondary"}>
                          {user.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{user.subscription_plan}</TableCell>
                      <TableCell className="text-sm">{user.total_campaigns}</TableCell>
                      <TableCell className="text-sm">{user.total_emails_sent}</TableCell>
                      <TableCell className="text-sm">
                        {user.days_inactive === 0 ? (
                          <span className="text-green-600">Active today</span>
                        ) : (
                          <span className={user.days_inactive >= 7 ? "text-destructive font-medium" : ""}>
                            {user.days_inactive}d
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{riskBadge(user.risk_level)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredHealth.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No users in this category
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations">
          <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[600px]">
            {/* Thread List */}
            <Card className="flex flex-col">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm">User Conversations</CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    No conversations yet. Send an email to a user to start.
                  </p>
                ) : (
                  conversations.map(convo => (
                    <button
                      key={convo.user_email}
                      onClick={() => setSelectedConvo(convo)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors ${
                        selectedConvo?.user_email === convo.user_email ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {convo.user_name || convo.user_email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {convo.messages[convo.messages.length - 1]?.content.substring(0, 60)}...
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                          </span>
                          {convo.has_unread && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </Card>

            {/* Chat View */}
            <Card className="flex flex-col">
              {selectedConvo ? (
                <>
                  <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{selectedConvo.user_name || "User"}</CardTitle>
                        <CardDescription className="text-xs">{selectedConvo.user_email}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {selectedConvo.messages.length} messages
                      </Badge>
                    </div>
                  </CardHeader>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {selectedConvo.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.direction === "outbound"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.subject && (
                              <p className={`text-xs font-medium mb-1 ${
                                msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                Re: {msg.subject}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center gap-1.5 mt-1.5 ${
                              msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}>
                              {msg.sender_name && (
                                <span className="text-[10px]">{msg.sender_name}</span>
                              )}
                              <span className="text-[10px]">
                                {format(new Date(msg.timestamp), "MMM d, h:mm a")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  {/* Reply Input */}
                  <div className="border-t p-3 space-y-2">
                    <Input
                      placeholder="Subject (optional)"
                      value={replySubject}
                      onChange={e => setReplySubject(e.target.value)}
                      className="text-sm h-8"
                    />
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                        onKeyDown={e => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply();
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={sendReply}
                        disabled={!replyText.trim() || sending}
                        className="shrink-0 self-end"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">⌘+Enter to send</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm">Select a conversation to view</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
