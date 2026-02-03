import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  RefreshCw, 
  Trash2, 
  Search,
  Loader2,
  Globe,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface SignupIP {
  id: string;
  ip_address: string;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export function IPAddressManager() {
  const [ips, setIps] = useState<SignupIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadIPs();
  }, []);

  const loadIPs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("signup_ips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch associated profiles
      if (data) {
        const ipsWithProfiles = await Promise.all(
          data.map(async (ip) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", ip.user_id)
              .single();
            return { ...ip, profile: profile || undefined };
          })
        );
        setIps(ipsWithProfiles);
      }
    } catch (error) {
      console.error("Failed to load IPs:", error);
      toast({ 
        title: "Failed to load IP addresses", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIP = async (ipId: string) => {
    if (!confirm("Are you sure you want to remove this IP restriction? This will allow a new signup from this IP address.")) {
      return;
    }

    setDeleting(ipId);
    try {
      const { error } = await supabase
        .from("signup_ips")
        .delete()
        .eq("id", ipId);

      if (error) throw error;

      toast({ title: "IP restriction removed successfully" });
      loadIPs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to remove IP";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const filteredIPs = ips.filter(ip =>
    ip.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ip.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ip.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-xs">Total Tracked IPs</span>
            </div>
            <p className="text-2xl font-bold">{ips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Blocked Signups</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              {ips.length > 0 ? ips.length : 0}
            </p>
            <p className="text-xs text-muted-foreground">IPs that can't signup again</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Latest Signup</span>
            </div>
            <p className="text-sm font-medium">
              {ips.length > 0 
                ? formatDistanceToNow(new Date(ips[0].created_at), { addSuffix: true })
                : "No signups yet"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IP Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              IP Address Restrictions
            </CardTitle>
            <CardDescription>
              Each IP address can only create one account. Remove an IP to allow another signup.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search IP or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={loadIPs}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No IP addresses tracked yet</p>
              <p className="text-sm">IPs will appear here when users sign up</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIPs.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono text-sm">
                      {ip.ip_address}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ip.profile?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ip.profile?.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(ip.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="w-3 h-3" />
                        Blocked
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteIP(ip.id)}
                        disabled={deleting === ip.id}
                      >
                        {deleting === ip.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
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
