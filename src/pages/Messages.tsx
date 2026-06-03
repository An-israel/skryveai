import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
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
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConversationItem {
  id: string;
  talent_id: string;
  client_id: string;
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

function AvatarCircle({ name, url }: { name: string; url: string | null }) {
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
    <span className="text-[12px] font-bold text-primary">
      {getInitials(name)}
    </span>
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
    if (!talentProfileId && !clientProfileId) return;
    setConvLoading(true);

    const orFilters = [];
    if (talentProfileId) orFilters.push(`talent_id.eq.${talentProfileId}`);
    if (clientProfileId) orFilters.push(`client_id.eq.${clientProfileId}`);

    const { data: convs, error } = await (supabase as any)
      .from("marketplace_conversations")
      .select("id, talent_id, client_id, last_message_at, job_id")
      .or(orFilters.join(","))
      .order("last_message_at", { ascending: false });

    if (error || !convs) {
      setConvLoading(false);
      return;
    }

    const enriched: ConversationItem[] = await Promise.all(
      convs.map(async (conv: any) => {
        const isClient = clientProfileId && conv.client_id === clientProfileId;
        let otherName = "Unknown";
        let otherAvatar: string | null = null;

        if (isClient) {
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

        const { data: lastMsgArr } = await (supabase as any)
          .from("marketplace_messages")
          .select("content, is_read, sender_id")
          .eq("conversation_id", conv.id)
          .order("sent_at", { ascending: false })
          .limit(1);

        const lastMsg = lastMsgArr?.[0] || null;

        const { count: unreadCount } = await (supabase as any)
          .from("marketplace_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", userId || "");

        return {
          id: conv.id,
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

    setConversations(enriched);
    setConvLoading(false);
  }, [talentProfileId, clientProfileId, userId]);

  useEffect(() => {
    if (talentProfileId !== null || clientProfileId !== null) {
      fetchConversations();
    }
  }, [talentProfileId, clientProfileId, fetchConversations]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription for messages
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

  // User search for new message dialog
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
          results.push({ id: t.id, name: t.full_name || "Talent", avatar: t.profile_photo_url, type: "talent" });
        }
      });
      (clients || []).forEach((c: any) => {
        if (c.user_id !== userId) {
          results.push({ id: c.id, name: c.company_name || "Client", avatar: c.logo_url, type: "client" });
        }
      });
      setUserResults(results);
      setSearchingUsers(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchUsers, userId]);

  const startConversation = async (otherId: string, type: "talent" | "client") => {
    if (!userId) return;

    let tId: string | null = null;
    let cId: string | null = null;

    if (type === "talent") {
      tId = otherId;
      cId = clientProfileId;
    } else {
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
        .insert({ talent_id: tId, client_id: cId, last_message_at: new Date().toISOString() })
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
      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-[300px_1fr]">

        {/* ── Left panel: conversation list ── */}
        <div
          className={`border-r border-border flex flex-col overflow-hidden ${
            mobileView === "thread" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Panel header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-[13px] font-semibold text-foreground">Messages</span>
            <button
              onClick={() => setShowNewMsg(true)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-muted/40 border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {convLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-16 px-6">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-[13px] font-medium text-foreground mb-0.5">No conversations yet</p>
                <p className="text-[12px] text-muted-foreground">
                  Start a new message to connect with someone.
                </p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setMobileView("thread");
                  }}
                  className={`w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors ${
                    activeConvId === conv.id ? "bg-muted/50" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    <AvatarCircle name={conv.otherName} url={conv.otherAvatar} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[14px] font-medium text-foreground truncate ${conv.unreadCount > 0 ? "font-semibold" : ""}`}>
                        {conv.otherName}
                      </span>
                      <span className="text-[12px] text-muted-foreground shrink-0">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className={`text-[12px] truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {conv.lastMessage ? conv.lastMessage.slice(0, 48) : "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: thread ── */}
        <div
          className={`flex flex-col overflow-hidden ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {!activeConvId || !activeConv ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-primary/60" />
                </div>
                <p className="text-[14px] font-semibold text-foreground mb-1">
                  Select a conversation
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Choose from your conversations on the left, or start a new one.
                </p>
                <button
                  onClick={() => setShowNewMsg(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New message
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0">
                <button
                  className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <AvatarCircle name={activeConv.otherName} url={activeConv.otherAvatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {activeConv.otherName}
                  </p>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1.5">
                {msgLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-[13px] text-muted-foreground">
                    No messages yet — say hello!
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.sender_id === userId;
                    const prevMsg = messages[idx - 1];
                    const showDateSep =
                      !prevMsg ||
                      new Date(msg.sent_at).toDateString() !==
                        new Date(prevMsg.sent_at).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {new Date(msg.sent_at).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[68%] px-4 py-2.5 text-[14px] ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </p>
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isOwn ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span
                                className={`text-[11px] ${
                                  isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                                }`}
                              >
                                {formatDistanceToNow(new Date(msg.sent_at), { addSuffix: false })}
                              </span>
                              {isOwn && (
                                <span className="text-primary-foreground/60">
                                  {msg.is_read ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-border px-4 py-3 flex gap-2 shrink-0 bg-background">
                <input
                  placeholder="Type a message…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1 px-3 py-2 text-[14px] bg-muted/40 border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  className="w-9 h-9 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMsg} onOpenChange={setShowNewMsg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search by name or company…"
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-[13px] bg-muted/40 border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {searchingUsers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : userResults.length === 0 && searchUsers ? (
                <p className="text-center text-[13px] text-muted-foreground py-6">No users found</p>
              ) : userResults.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-6">
                  Start typing to search
                </p>
              ) : (
                userResults.map((u) => (
                  <button
                    key={`${u.type}-${u.id}`}
                    onClick={() => startConversation(u.id, u.type)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      <AvatarCircle name={u.name} url={u.avatar} />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{u.name}</p>
                      <p className="text-[12px] text-muted-foreground capitalize">{u.type}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
