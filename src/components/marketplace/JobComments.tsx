import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSkryveRole } from "@/hooks/use-skryve-role";
import { notifyUser } from "@/lib/notify";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
}

interface JobCommentsProps {
  jobId: string;
  jobTitle: string;
  clientUserId?: string | null;
  userId?: string | null;
}

export function JobComments({ jobId, jobTitle, clientUserId, userId }: JobCommentsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const role = useSkryveRole(userId);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("feed_comments")
        .select("id, user_id, body, created_at")
        .eq("item_source", "marketplace")
        .eq("item_id", jobId)
        .order("created_at", { ascending: true })
        .limit(100);

      const rows = data || [];
      const userIds = [...new Set(rows.map((c: any) => c.user_id))];
      const infoMap: Record<string, { name: string; avatar_url: string | null }> = {};
      if (userIds.length) {
        const { data: tps } = await (supabase as any)
          .from("talent_profiles")
          .select("user_id, full_name, profile_photo_url")
          .in("user_id", userIds);
        (tps || []).forEach((t: any) => {
          infoMap[t.user_id] = { name: t.full_name || "Talent", avatar_url: t.profile_photo_url || null };
        });
      }
      setComments(
        rows.map((c: any) => ({
          ...c,
          name: infoMap[c.user_id]?.name || "User",
          avatar_url: infoMap[c.user_id]?.avatar_url || null,
        })),
      );
      setLoading(false);
    })();
  }, [jobId]);

  const postComment = async () => {
    const body = input.trim();
    if (!body || !userId) return;
    setPosting(true);
    const { data, error } = await (supabase as any)
      .from("feed_comments")
      .insert({ user_id: userId, item_source: "marketplace", item_id: jobId, body })
      .select("id, user_id, body, created_at")
      .single();
    setPosting(false);
    if (error || !data) {
      toast({ title: "Couldn't post comment", description: error?.message, variant: "destructive" });
      return;
    }
    const { data: tp } = await (supabase as any)
      .from("talent_profiles").select("full_name, profile_photo_url").eq("user_id", userId).maybeSingle();
    setComments((p) => [
      ...p,
      { ...data, name: tp?.full_name || "You", avatar_url: tp?.profile_photo_url || null },
    ]);
    setInput("");

    if (clientUserId && clientUserId !== userId) {
      notifyUser({
        userId: clientUserId,
        type: "comment",
        title: "New comment on your job",
        message: `Someone commented on "${jobTitle}".`,
        link: `/marketplace/${jobId}`,
        emailCategory: "jobs",
      });
    }
  };

  const messageCommenter = async (commenterId: string) => {
    if (!userId) { navigate("/login"); return; }
    if (commenterId === userId) return;
    setMessagingId(commenterId);
    const { data, error } = await (supabase as any).rpc("get_or_create_direct_conversation", {
      _other: commenterId,
    });
    setMessagingId(null);
    if (error || !data) {
      toast({ title: "Couldn't start conversation", description: error?.message, variant: "destructive" });
      return;
    }
    navigate(`/dm/${data}`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Comments {comments.length > 0 && <span className="text-muted-foreground font-normal">({comments.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <button onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0" aria-label={`View ${c.name}'s profile`}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/profile/${c.user_id}`)}
                      className="text-sm font-medium hover:underline"
                    >
                      {c.name}
                    </button>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{c.body}</p>
                  {userId && c.user_id !== userId && (
                    <Button
                      variant="ghost" size="sm"
                      className="mt-1 h-7 px-2 text-xs text-primary"
                      disabled={messagingId === c.user_id}
                      onClick={() => messageCommenter(c.user_id)}
                    >
                      {messagingId === c.user_id
                        ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        : <MessageSquare className="w-3 h-3 mr-1" />}
                      Message
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {role === "talent" && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a comment…"
              onKeyDown={(e) => { if (e.key === "Enter" && !posting) postComment(); }}
            />
            <Button size="icon" disabled={posting || !input.trim()} onClick={postComment} aria-label="Post comment">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
