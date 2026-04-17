import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Search {
  id: string;
  first_name: string | null;
  last_name: string | null;
  domain: string | null;
  company: string | null;
  found_email: string | null;
  confidence: number;
  status: string;
  created_at: string;
}

export function SearchHistory() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("email_finder_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setSearches((data as unknown as Search[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("email_finder_searches").delete().eq("id", id);
    setSearches((s) => s.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const copy = async (email: string) => {
    await navigator.clipboard.writeText(email);
    toast.success("Copied");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search history</CardTitle>
        <CardDescription>Your last 50 email lookups.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : searches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No searches yet.</p>
        ) : (
          <div className="space-y-2">
            {searches.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.found_email ? (
                      <p className="font-mono text-sm font-medium truncate">{s.found_email}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No email found</p>
                    )}
                    {s.found_email && <Badge variant="outline" className="text-xs">{s.confidence}%</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[s.first_name, s.last_name].filter(Boolean).join(" ")} · {s.domain || s.company} · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
                {s.found_email && (
                  <Button variant="ghost" size="icon" onClick={() => copy(s.found_email!)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
