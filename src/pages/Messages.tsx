import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  Loader2,
  Check,
  CheckCheck,
  User,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConversationItem {
  id: string;
  kind: "marketplace" | "direct";
  talent_id?: string;
  client_id?: string;
  last_message_at: string | null;
  otherName: string;
  otherAvatar: string | null;
  lastMessage: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  is_read: boolean;
  sent_at: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AvatarFallback({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-full h-full object-cover rounded-full"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 rounded-full text-white font-semibold text-sm">
      {getInitials(name)}
    </div>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const [showNewMsg, setShowNewMsg] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [userResults, setUserResults] = useState<
    { id: string; name: string; avatar: string | null; type: "talent" | "client" }[]
  >([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate("/login");
        return;
      }
      const uid = data.user.id;
      setUserId(uid);

      // Fetch profile IDs
      const [{ data: talent }, { data: client }] = await Promise.all([
        (supabase as any)
          .from("talent_profiles")
          .select("id")
          .eq("user_id", uid)
          .single(),
        (supabase as any)
          .from("client_profiles")
          .select("id")
          .eq("user_id", uid)
          .single(),
      ]);

      if (talent) setTalentProfileId(talent.id);
      if (client) setClientProfileId(client.id);
    });
  }, [navigate]);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setConvLoading(true);

    // ── Marketplace (job) conversations ──
    let convs: any[] = [];
    if (talentProfileId || clientProfileId) {
      const orFilters = [];
      if (talentProfileId)
        orFilters.push(`talent_id.eq.${talentProfileId}`);
      if (clientProfileId)
        orFilters.push(`client_id.eq.${clientProfileId}`);

      const { data } = await (supabase as any)
        .from("marketplace_conversations")
        .select("id, talent_id, client_id, last_message_at, job_id")
        .or(orFilters.join(","))
        .order("last_message_at", { ascending: false });
      convs = data || [];
    }

    // Enrich with other party's info
    const enriched: ConversationItem[] = await Promise.all(
      convs.map(async (conv: any) => {
        const isClient = clientProfileId && conv.client_id === clientProfileId;
        let otherName = "Unknown";
        let otherAvatar: string | null = null;

        if (isClient) {
          // I'm the client, other is talent
          const { data: tp } = await (supabase as any)
            .from("talent_profiles")
            .select("full_name, profile_photo_url")
            .eq("id", conv.talent_id)
            .single();
          if (tp) {
            otherName = tp.full_name || "Talent";
            otherAvatar = tp.profile_photo_url;
          }
        } else {
          // I'm the talent, other is client
          const { data: cp } = await (supabase as any)
            .from("client_profiles")
            .select("company_name, logo_url")
            .eq("id", conv.client_id)
            .single();
          if (cp) {
            otherName = cp.company_name || "Client";
            otherAvatar = cp.logo_url;
          }
        }

        // Last message
        const { data: lastMsgArr } = await (supabase as any)
          .from("marketplace_messages")
          .select("content, is_read, sender_id")
          .eq("conversation_id", conv.id)
          .order("sent_at", { ascending: false })
          .limit(1);

        const lastMsg = lastMsgArr?.[0] || null;

        // Unread count
        const { count: unreadCount } = await (supabase as any)
          .from("marketplace_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", userId || "");

        return {
          id: conv.id,
          kind: "marketplace" as const,
          talent_id: conv.talent_id,
          client_id: conv.client_id,
          last_message_at: conv.last_message_at,
          otherName,
          otherAvatar,
          lastMessage: lastMsg?.content || null,
          unreadCount: unreadCount || 0,
        };
      })
    );

    // ── Direct (Collab) conversations ──
    const { data: dms } = await (supabase as any)
      .from("direct_conversations")
      .select("id, user_a, user_b, last_message_at")
      .order("last_message_at", { ascending: false });

    const dmOtherIds = [...new Set((dms || []).map((d: any) => (d.user_a === userId ? d.user_b : d.user_a)))];
    const dmNames: Record<string, { name: string; avatar: string | null }> = {};
    if (dmOtherIds.length) {
      const [{ data: tps }, { data: cps }] = await Promise.all([
        (supabase as any).from("talent_profiles").select("user_id, full_name, profile_photo_url").in("user_id", dmOtherIds),
        (supabase as any).from("client_profiles").select("user_id, company_name, logo_url").in("user_id", dmOtherIds),
      ]);
      (tps || []).forEach((t: any) => { dmNames[t.user_id] = { name: t.full_name || "Talent", avatar: t.profile_photo_url }; });
      (cps || []).forEach((c: any) => { if (!dmNames[c.user_id]) dmNames[c.user_id] = { name: c.company_name || "Client", avatar: c.logo_url }; });
    }

    const dmItems: ConversationItem[] = await Promise.all(
      (dms || []).map(async (d: any) => {
        const otherId = d.user_a === userId ? d.user_b : d.user_a;
        const prof = dmNames[otherId] || { name: "User", avatar: null };
        const { data: lastArr } = await (supabase as any)
          .from("direct_messages")
          .select("body")
          .eq("conversation_id", d.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const { count: unread } = await (supabase as any)
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", d.id)
          .is("read_at", null)
          .neq("sender_id", userId);
        return {
          id: d.id,
          kind: "direct" as const,
          last_message_at: d.last_message_at,
          otherName: prof.name,
          otherAvatar: prof.avatar,
          lastMessage: lastArr?.[0]?.body || null,
          unreadCount: unread || 0,
        };
      })
    );

    const all = [...enriched, ...dmItems].sort(
      (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
    );

    setConversations(all);
    setConvLoading(false);
  }, [talentProfileId, clientProfileId, userId]);

  useEffect(() => {
    if (userId) fetchConversations();
  }, [userId, talentProfileId, clientProfileId, fetchConversations]);

  const fetchMessages = useCallback(
    async (convId: string) => {
      setMsgLoading(true);
      const { data, error } = await (supabase as any)
        .from("marketplace_messages")
        .select("id, conversation_id, sender_id, content, attachment_url, is_read, sent_at")
        .eq("conversation_id", convId)
        .order("sent_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        // Mark incoming as read
        if (userId) {
          await (supabase as any)
            .from("marketplace_messages")
            .update({ is_read: true })
            .eq("conversation_id", convId)
            .eq("is_read", false)
            .neq("sender_id", userId);
        }
      }
      setMsgLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    if (!activeConvId) return;
    const conv = conversations.find((c) => c.id === activeConvId) || null;
    setActiveConv(conv);
    fetchMessages(activeConvId);
  }, [activeConvId, conversations, fetchMessages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime for messages
  useEffect(() => {
    if (!activeConvId || !userId) return;

    const channel = supabase
      .channel(`messages-${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read if from other user
          if (msg.sender_id !== userId) {
            await (supabase as any)
              .from("marketplace_messages")
              .update({ is_read: true })
              .eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, userId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConvId || !userId) return;
    setSending(true);
    const content = inputText.trim();
    setInputText("");

    const { error } = await (supabase as any)
      .from("marketplace_messages")
      .insert({
        conversation_id: activeConvId,
        sender_id: userId,
        content,
        is_read: false,
        sent_at: new Date().toISOString(),
      });

    if (!error) {
      await (supabase as any)
        .from("marketplace_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConvId);
      fetchConversations();
    } else {
      toast({ title: "Failed to send message", variant: "destructive" });
      setInputText(content);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // User search for new message
  useEffect(() => {
    if (!searchUsers.trim()) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingUsers(true);
      const [{ data: talents }, { data: clients }] = await Promise.all([
        (supabase as any)
          .from("talent_profiles")
          .select("id, full_name, profile_photo_url, user_id")
          .ilike("full_name", `%${searchUsers}%`)
          .limit(10),
        (supabase as any)
          .from("client_profiles")
          .select("id, company_name, logo_url, user_id")
          .ilike("company_name", `%${searchUsers}%`)
          .limit(10),
      ]);

      const results: typeof userResults = [];
      (talents || []).forEach((t: any) => {
        if (t.user_id !== userId) {
          results.push({
            id: t.id,
            name: t.full_name || "Talent",
            avatar: t.profile_photo_url,
            type: "talent",
          });
        }
      });
      (clients || []).forEach((c: any) => {
        if (c.user_id !== userId) {
          results.push({
            id: c.id,
            name: c.company_name || "Client",
            avatar: c.logo_url,
            type: "client",
          });
        }
      });
      setUserResults(results);
      setSearchingUsers(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchUsers, userId]);

  const startConversation = async (
    otherId: string,
    type: "talent" | "client"
  ) => {
    if (!userId) return;

    let tId: string | null = null;
    let cId: string | null = null;

    if (type === "talent") {
      // I must be client
      tId = otherId;
      cId = clientProfileId;
    } else {
      // Other is client, I must be talent
      tId = talentProfileId;
      cId = otherId;
    }

    if (!tId || !cId) {
      toast({
        title: "Cannot start conversation",
        description: "You need a profile on this platform.",
        variant: "destructive",
      });
      return;
    }

    // Check existing
    const { data: existing } = await (supabase as any)
      .from("marketplace_conversations")
      .select("id")
      .eq("talent_id", tId)
      .eq("client_id", cId)
      .maybeSingle();

    let convId: string;
    if (existing) {
      convId = existing.id;
    } else {
      const { data: newConv, error } = await (supabase as any)
        .from("marketplace_conversations")
        .insert({
          talent_id: tId,
          client_id: cId,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !newConv) {
        toast({ title: "Failed to create conversation", variant: "destructive" });
        return;
      }
      convId = newConv.id;
    }

    setShowNewMsg(false);
    setSearchUsers("");
    setActiveConvId(convId);
    setMobileView("thread");
    fetchConversations();
  };

  const filteredConvs = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-[320px_1fr]">
        {/* Left panel */}
        <div
          className={`border-r flex flex-col overflow-hidden ${
            mobileView === "thread" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between shrink-0">
            <h1 className="text-xl font-bold">Messages</h1>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setShowNewMsg(true)}
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <div
                  key={`${conv.kind}-${conv.id}`}
                  onClick={() => {
                    if (conv.kind === "direct") {
                      navigate(`/dm/${conv.id}`);
                      return;
                    }
                    setActiveConvId(conv.id);
                    setMobileView("thread");
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/40 ${
                    activeConvId === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="w-10 h-10 shrink-0">
                    <AvatarFallback
                      name={conv.otherName}
                      url={conv.otherAvatar}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate flex items-center gap-1.5">
                        {conv.otherName}
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                          {conv.kind === "direct" ? "Direct" : "Job"}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">
                        {conv.last_message_at
                          ? formatDistanceToNow(
                              new Date(conv.last_message_at),
                              { addSuffix: false }
                            )
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {conv.lastMessage
                          ? conv.lastMessage.slice(0, 50)
                          : "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center shrink-0 ml-1">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div
          className={`flex flex-col overflow-hidden ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {!activeConvId || !activeConv ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">
                  Select a conversation
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose from your conversations on the left.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-9 h-9 shrink-0">
                  <AvatarFallback
                    name={activeConv.otherName}
                    url={activeConv.otherAvatar}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {activeConv.otherName}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                            isOwn
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span
                              className={`text-xs ${
                                isOwn
                                  ? "text-blue-200"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatDistanceToNow(new Date(msg.sent_at), {
                                addSuffix: false,
                              })}
                            </span>
                            {isOwn && (
                              <span className="text-blue-200">
                                {msg.is_read ? (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    size="icon"
                    className="shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMsg} onOpenChange={setShowNewMsg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or company..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchingUsers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : userResults.length === 0 && searchUsers ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No users found
                </p>
              ) : (
                userResults.map((u) => (
                  <div
                    key={`${u.type}-${u.id}`}
                    onClick={() => startConversation(u.id, u.type)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 shrink-0">
                      <AvatarFallback name={u.name} url={u.avatar} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {u.type}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
