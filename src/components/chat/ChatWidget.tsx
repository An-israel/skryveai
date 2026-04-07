import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_type: "user" | "admin" | "system";
  message: string;
  created_at: string;
}

const AUTO_REPLY =
  "Hey! 👋 Thanks for reaching out. Our customer success team has been notified and will get back to you personally as soon as possible. We typically respond within a few hours.";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load or create conversation ──────────────────────────────────────────
  const initConversation = useCallback(async () => {
    if (!user) return;

    const { data: existing } = await (supabase as any)
      .from("chat_conversations")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setConversationId(existing.id);
      loadMessages(existing.id);
    }
    // Don't create until user sends first message
  }, [user]);

  const loadMessages = async (convId: string) => {
    const { data } = await (supabase as any)
      .from("chat_messages")
      .select("id, sender_type, message, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  // ── Count unread admin messages ───────────────────────────────────────────
  const countUnread = useCallback(async (convId: string) => {
    const { count } = await (supabase as any)
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", convId)
      .eq("sender_type", "admin")
      .eq("read_by_user", false);
    setUnreadCount(count || 0);
  }, []);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // ── Mark messages as read when panel opens ────────────────────────────────
  useEffect(() => {
    if (open && conversationId) {
      (supabase as any)
        .from("chat_messages")
        .update({ read_by_user: true })
        .eq("conversation_id", conversationId)
        .eq("sender_type", "admin");
      setUnreadCount(0);
    }
  }, [open, conversationId]);

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const channel = (supabase as any)
      .channel(`chat_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_type === "admin" && !open) {
            setUnreadCount((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, open]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input when opened ───────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !user) return;
    setInput("");
    setSending(true);

    try {
      let convId = conversationId;

      // Create conversation on first message
      if (!convId) {
        const { data: conv, error: convErr } = await (supabase as any)
          .from("chat_conversations")
          .insert({ user_id: user.id, status: "open", unread_by_admin: 1 })
          .select("id")
          .single();
        if (convErr) throw convErr;
        convId = conv.id;
        setConversationId(convId);
      } else {
        // Update last_message_at — unread_by_admin is incremented by chat-notify
        await (supabase as any)
          .from("chat_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", convId);
      }

      // Insert user message
      await (supabase as any).from("chat_messages").insert({
        conversation_id: convId,
        user_id: user.id,
        sender_type: "user",
        message: text,
        read_by_admin: false,
        read_by_user: true,
      });

      // Auto-reply (only if this is the first user message)
      const isFirstMessage = messages.filter((m) => m.sender_type === "user").length === 0;
      if (isFirstMessage) {
        setTimeout(async () => {
          await (supabase as any).from("chat_messages").insert({
            conversation_id: convId,
            user_id: user.id,
            sender_type: "system",
            message: AUTO_REPLY,
            read_by_admin: true,
            read_by_user: false,
          });
        }, 1200);
      }

      // Notify admin via edge function (fire and forget)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conversationId: convId,
            message: text,
            userName: user.email,
          }),
        }).catch(() => {});
      }

      // Load messages if first message (no real-time yet)
      if (!conversationId) {
        loadMessages(convId!);
      }
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Chat Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[340px] sm:w-[380px] rounded-2xl shadow-2xl border border-border bg-background overflow-hidden flex flex-col"
            style={{ height: 500 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold text-sm">
                  S
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">SkryveAI Support</p>
                <p className="text-xs text-primary-foreground/70">Customer Success Team</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-primary-foreground/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">How can we help?</p>
                  <p className="text-xs opacity-70">Send us a message and we'll get back to you shortly.</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-0.5",
                    msg.sender_type === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.sender_type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : msg.sender_type === "admin"
                        ? "bg-card border border-border rounded-bl-sm"
                        : "bg-muted text-muted-foreground rounded-bl-sm text-xs italic"
                    )}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {msg.sender_type === "user" ? "You" : msg.sender_type === "admin" ? "Support" : "System"} · {formatTime(msg.created_at)}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-background">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 resize-none bg-muted/50 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground max-h-24 overflow-y-auto"
                  style={{ minHeight: 40 }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                We typically reply within a few hours
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ───────────────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_4px_24px_hsl(var(--primary)/0.5)] flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        {unreadCount > 0 && !open && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {unreadCount}
          </motion.span>
        )}

        {/* Pulse ring when no conversation yet */}
        {messages.length === 0 && !open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20" />
        )}
      </motion.button>
    </div>
  );
}
