import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Search, 
  Loader2,
  Send 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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

interface SenderProfile {
  user_id: string;
  full_name: string;
}

export function AdminEmailTracker() {
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [senders, setSenders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(e => e.sent_by))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", senderIds);

        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: SenderProfile) => {
            map[p.user_id] = p.full_name;
          });
          setSenders(map);
        }
      }
    } catch (error) {
      console.error("Failed to load admin emails:", error);
    } finally {
      setLoading(false);
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
            <p className="text-2xl font-bold text-green-600">{stats.opened}</p>
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
              Sent Emails Tracker
            </CardTitle>
            <CardDescription>Track all emails sent by support staff</CardDescription>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email) => (
                  <TableRow key={email.id}>
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
                      {email.template_type ? (
                        <Badge variant="outline" className="text-xs">
                          {email.template_type}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Custom</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email.opened_at ? (
                        <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Eye className="w-3 h-3" /> Opened
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="w-3 h-3" /> Not opened
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
