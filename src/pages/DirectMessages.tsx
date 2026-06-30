import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  Loader2,
  Check,
  CheckCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DirectConversationItem {
  id: string;
  otherUserId: string;
  last_message_at: string | null;
  otherName: string;
  otherAvatar: string | null;
  lastMessage: string | null;
  unreadCount: number;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
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
      <img src={url} alt={name} className="w-full h-full object-cover rounded-full" />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 rounded-full text-white font-semibold text-sm">
      {getInitials(name || "?")}
    </div>
  );
}

/** Resolve display name + avatar for a set of user_ids using public profiles. */
async function resolveProfiles(
  userIds: string[]
): Promise<Record<string, { name: string; avatar: string | null }>> {
  const map: Record<string, { name: string; avatar: string | null }> = {};
  if (userIds.length === 0) return map;

  const [{ data: talents }, { data: clients }] = await Promise.all([
    (supabase as any)
      .from("talent_profiles")
      .select("user_id, full_name, profile_photo_url")
      .in("user_id", userIds),
    (supabase as any)
      .from("client_profiles")
      .select("user_id, company_name, logo_url")
      .in("user_id", userIds),
  ]);

  (talents || []).forEach((t: any) => {
    map[t.user_id] = { name: t.full_name || "Talent", avatar: t.profile_photo_url || null };
  });
  (clients || []).forEach((c: any) => {
    // Prefer an existing talent identity; otherwise use company.
    if (!map[c.user_id]) {
      map[c.user_id] = { name: c.company_name || "Client", avatar: c.logo_url || null };
    }
  });
  return map;
}

export default function DirectMessages() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<DirectConversationItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId ?? null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    conversationId ? "thread" : "list"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUserId(data.user.id);
    });
  }, [navigate]);

  // Keep active conversation in sync with the URL param.
  useEffect(() => {
    if (conversationId) {
      setActiveConvId(conversationId);
      setMobileView("thread");
    }
  }, [conversationId]);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setConvLoading(true);

    const { data: convs, error } = await (supabase as any)
      .from("direct_conversations")
      .select("id, user_a, user_b, last_message_at")
      .order("last_message_at", { ascending: false });

    if (error || !convs) {
      setConvLoading(false);
      return;
    }

    const otherIds: string[] = convs.map((c: any) =>
      c.user_a === userId ? c.user_b : c.user_a
    );
    const profileMap = await resolveProfiles([...new Set(otherIds)]);

    const enriched: DirectConversationItem[] = await Promise.all(
      convs.map(async (conv: any) => {
        const otherUserId = conv.user_a === userId ? conv.user_b : conv.user_a;
        const prof = profileMap[otherUserId] || { name: "User", avatar: null };

        const { data: lastMsgArr } = await (supabase as any)
          .from("direct_messages")
          .select("body")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const { count: unreadCount } = await (supabase as any)
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .is("read_at", null)
          .neq("sender_id", userId);

        return {
          id: conv.id,
          otherUserId,
          last_message_at: conv.last_message_at,
          otherName: prof.name,
          otherAvatar: prof.avatar,
          lastMessage: lastMsgArr?.[0]?.body || null,
          unreadCount: unreadCount || 0,
        };
      })
    );

    setConversations(enriched);
    setConvLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) fetchConversations();
  }, [userId, fetchConversations]);

  const fetchMessages = useCallback(
    async (convId: string) => {
      setMsgLoading(true);
      const { data, error } = await (supabase as any)
        .from("direct_messages")
        .select("id, conversation_id, sender_id, body, read_at, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        if (userId) {
          await (supabase as any)
            .from("direct_messages")
            .update({ read_at: new Date().toISOString() })
            .eq("conversation_id", convId)
            .is("read_at", null)
            .neq("sender_id", userId);
        }
      }
      setMsgLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
  }, [activeConvId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime for the active thread.
  useEffect(() => {
    if (!activeConvId || !userId) return;

    const channel = supabase
      .channel(`direct-messages-${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        async (payload) => {
          const msg = payload.new as DirectMessage;
          setMessages((prev) =>
            prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          if (msg.sender_id !== userId) {
            await (supabase as any)
              .from("direct_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, userId]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConvId || !userId) return;
    setSending(true);
    const body = inputText.trim();
    setInputText("");

    const { error } = await (supabase as any).from("direct_messages").insert({
      conversation_id: activeConvId,
      sender_id: userId,
      body,
    });

    if (!error) {
      await (supabase as any)
        .from("direct_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConvId);
      fetchConversations();
    } else {
      toast({ title: "Failed to send message", variant: "destructive" });
      setInputText(body);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openConversation = (convId: string) => {
    setActiveConvId(convId);
    setMobileView("thread");
    navigate(`/dm/${convId}`, { replace: true });
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
          <div className="p-4 border-b flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-xl font-bold">Collaborate</h1>
              <p className="text-xs text-muted-foreground">Direct messages with other talents</p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/talent")}>
              <Users className="w-4 h-4" />
              Find
            </Button>
          </div>

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

          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No conversations yet</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/talent")}>
                  Find talent to collaborate with
                </Button>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/40 ${
                    activeConvId === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="w-10 h-10 shrink-0">
                    <AvatarFallback name={conv.otherName} url={conv.otherAvatar} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.otherName}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: false,
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {conv.lastMessage ? conv.lastMessage.slice(0, 50) : "No messages yet"}
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
          {!activeConvId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Or find talent to start collaborating.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => {
                    setMobileView("list");
                    navigate("/dm", { replace: true });
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-9 h-9 shrink-0">
                  <AvatarFallback
                    name={activeConv?.otherName || "User"}
                    url={activeConv?.otherAvatar || null}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {activeConv?.otherName || "Conversation"}
                  </p>
                </div>
              </div>

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
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span
                              className={`text-xs ${
                                isOwn ? "text-blue-200" : "text-muted-foreground"
                              }`}
                            >
                              {formatDistanceToNow(new Date(msg.created_at), {
                                addSuffix: false,
                              })}
                            </span>
                            {isOwn && (
                              <span className="text-blue-200">
                                {msg.read_at ? (
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
    </div>
  );
}
