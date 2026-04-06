import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  user_id: string;
  status: string;
  last_message_at: string;
  unread_by_admin: number;
  created_at: string;
  user_email?: string;
  user_name?: string;
  last_message?: string;
}

interface Message {
  id: string;
  sender_type: "user" | "admin" | "system";
  message: string;
  created_at: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminChatManager() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // ── Load all conversations ────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data: convs } = await (supabase as any)
      .from("chat_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Enrich with profile data + last message
    const enriched = await Promise.all(
      convs.map(async (conv: Conversation) => {
        const [{ data: profile }, { data: lastMsgs }] = await Promise.all([
          (supabase as any)
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", conv.user_id)
            .maybeSingle(),
          (supabase as any)
            .from("chat_messages")
            .select("message, sender_type")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);
        return {
          ...conv,
          user_name: profile?.full_name || profile?.email || "Unknown user",
          user_email: profile?.email,
          last_message: lastMsgs?.[0]?.message || "",
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages for selected conversation ───────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await (supabase as any)
      .from("chat_messages")
      .select("id, sender_type, message, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);

    // Mark all user messages as read
    await (supabase as any)
      .from("chat_messages")
      .update({ read_by_admin: true })
      .eq("conversation_id", convId)
      .eq("sender_type", "user");

    // Reset unread count
    await (supabase as any)
      .from("chat_conversations")
      .update({ unread_by_admin: 0 })
      .eq("id", convId);

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_by_admin: 0 } : c))
    );
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
    setSelected(conv);
    setMessages([]);
    loadMessages(conv.id);
  };

  // ── Real-time for selected conversation ──────────────────────────────────
  useEffect(() => {
    if (!selected) return;

    const channel = (supabase as any)
      .channel(`admin_chat_${selected.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selected.id}`,
        },
        (payload: any) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read immediately
          if (msg.sender_type === "user") {
            (supabase as any)
              .from("chat_messages")
              .update({ read_by_admin: true })
              .eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  // ── Real-time for conversation list (new convos) ──────────────────────────
  useEffect(() => {
    const channel = (supabase as any)
      .channel("admin_convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send reply ────────────────────────────────────────────────────────────
  const handleReply = async () => {
    const text = reply.trim();
    if (!text || !selected || sending) return;
    setReply("");
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("chat_messages").insert({
        conversation_id: selected.id,
        user_id: selected.user_id,
        sender_type: "admin",
        message: text,
        read_by_admin: true,
        read_by_user: false,
      });

      await (supabase as any)
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selected.id);
    } catch (err) {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // ── Resolve conversation ──────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!selected) return;
    await (supabase as any)
      .from("chat_conversations")
      .update({ status: "resolved" })
      .eq("id", selected.id);
    setSelected((prev) => prev ? { ...prev, status: "resolved" } : prev);
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, status: "resolved" } : c))
    );
    toast({ title: "Conversation resolved" });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_by_admin || 0), 0);

  return (
    <div className="flex gap-4 h-[600px]">
      {/* ── Conversation list ──────────────────────────────────────────── */}
      <Card className="w-72 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Conversations
            {totalUnread > 0 && (
              <Badge className="ml-auto bg-red-500 text-white text-xs">{totalUnread}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm px-4">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No conversations yet
            </div>
          ) : (
            <ScrollArea className="h-full">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors",
                    selected?.id === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{conv.user_name}</span>
                        {conv.status === "resolved" && (
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.last_message || "No messages yet"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(conv.last_message_at)}
                      </span>
                      {conv.unread_by_admin > 0 && (
                        <span className="w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread_by_admin}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ── Message view ──────────────────────────────────────────────── */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageCircle className="w-10 h-10 opacity-20" />
            <p className="text-sm">Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <CardHeader className="pb-3 border-b flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">{selected.user_name}</CardTitle>
                <p className="text-xs text-muted-foreground">{selected.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selected.status === "resolved" ? "secondary" : "default"} className="text-xs">
                  {selected.status === "resolved" ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />Resolved</>
                  ) : (
                    <><Clock className="w-3 h-3 mr-1" />Open</>
                  )}
                </Badge>
                {selected.status !== "resolved" && (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleResolve}>
                    Mark Resolved
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-0.5",
                      msg.sender_type === "admin" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                        msg.sender_type === "admin"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : msg.sender_type === "user"
                          ? "bg-muted rounded-bl-sm"
                          : "bg-muted/50 text-muted-foreground text-xs italic rounded-bl-sm"
                      )}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {msg.sender_type === "admin" ? "You (Support)" : msg.sender_type === "user" ? selected.user_name : "Auto-reply"} · {formatFull(msg.created_at)}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Reply input */}
            {selected.status !== "resolved" && (
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }
                    }}
                    placeholder="Type your reply... (Enter to send)"
                    className="flex-1 resize-none bg-muted/50 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={!reply.trim() || sending}
                    className="h-10 px-3"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
