import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Loader2, Check, CheckCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img src={url} alt={name} className="w-full h-full object-cover rounded-full" />
    );
  }
  return (
    <span className="text-[12px] font-bold text-primary">{getInitials(name)}</span>
  );
}

export default function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("Conversation");
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
      else setUserId(data.user.id);
    });
  }, [navigate]);

  // Fetch conversation info to resolve names
  useEffect(() => {
    if (!conversationId || !userId) return;

    const fetchConvInfo = async () => {
      const { data: conv } = await (supabase as any)
        .from("marketplace_conversations")
        .select("talent_id, client_id")
        .eq("id", conversationId)
        .single();

      if (!conv) return;

      const { data: talentProfile } = await (supabase as any)
        .from("talent_profiles")
        .select("id, user_id")
        .eq("id", conv.talent_id)
        .single();

      const { data: clientProfile } = await (supabase as any)
        .from("client_profiles")
        .select("id, user_id")
        .eq("id", conv.client_id)
        .single();

      const isTalent = talentProfile?.user_id === userId;
      const isClient = clientProfile?.user_id === userId;

      if (isTalent) {
        const { data: cp } = await (supabase as any)
          .from("client_profiles")
          .select("company_name, logo_url")
          .eq("id", conv.client_id)
          .single();
        if (cp) {
          setOtherName(cp.company_name || "Client");
          setOtherAvatar(cp.logo_url);
        }
      } else if (isClient) {
        const { data: tp } = await (supabase as any)
          .from("talent_profiles")
          .select("full_name, profile_photo_url")
          .eq("id", conv.talent_id)
          .single();
        if (tp) {
          setOtherName(tp.full_name || "Talent");
          setOtherAvatar(tp.profile_photo_url);
        }
      }
    };

    fetchConvInfo();
  }, [conversationId, userId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !userId) return;
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("marketplace_messages")
      .select("id, conversation_id, sender_id, content, attachment_url, is_read, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      // Mark incoming messages as read
      await (supabase as any)
        .from("marketplace_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("is_read", false)
        .neq("sender_id", userId);
    }
    setLoading(false);
  }, [conversationId, userId]);

  useEffect(() => {
    if (userId && conversationId) {
      fetchMessages();
    }
  }, [userId, conversationId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId, userId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId || !userId) return;
    setSending(true);
    const content = inputText.trim();
    setInputText("");

    const { error } = await (supabase as any)
      .from("marketplace_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        is_read: false,
        sent_at: new Date().toISOString(),
      });

    if (!error) {
      await (supabase as any)
        .from("marketplace_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/messages")}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          <Avatar name={otherName} url={otherAvatar} />
        </div>
        <span className="text-[13px] font-semibold text-foreground truncate">{otherName}</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No messages yet — say hello!</p>
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
                  className={`max-w-[75%] px-4 py-2.5 text-[14px] ${
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
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border px-4 py-3 flex gap-2 shrink-0">
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
    </div>
  );
}
