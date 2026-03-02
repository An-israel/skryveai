import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SitePage {
  id: string;
  route: string;
  name: string;
  is_enabled: boolean;
  updated_at: string;
}

export function PageToggleManager() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_pages")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      toast({ title: "Failed to load pages", variant: "destructive" });
    }
    setPages((data as SitePage[]) || []);
    setLoading(false);
  };

  const handleToggle = async (page: SitePage) => {
    setToggling(page.id);
    const { error } = await supabase
      .from("site_pages")
      .update({ is_enabled: !page.is_enabled, updated_at: new Date().toISOString() })
      .eq("id", page.id);

    if (error) {
      toast({ title: "Failed to update page", variant: "destructive" });
    } else {
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, is_enabled: !p.is_enabled } : p));
      toast({ title: `${page.name} ${!page.is_enabled ? "enabled" : "disabled"}` });
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Page Visibility</CardTitle>
          <CardDescription>Toggle pages on or off across the website. Disabled pages show a "Page Unavailable" message.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={loadPages}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Toggle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell className="font-medium">{page.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">{page.route}</TableCell>
                <TableCell>
                  <Badge variant={page.is_enabled ? "default" : "secondary"}>
                    {page.is_enabled ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={page.is_enabled}
                    onCheckedChange={() => handleToggle(page)}
                    disabled={toggling === page.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
