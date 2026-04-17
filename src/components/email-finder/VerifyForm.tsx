import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerifyResult {
  email: string;
  status: "valid" | "risky" | "invalid" | "unknown";
  isDeliverable: boolean;
  isDisposable: boolean;
  hasMx: boolean;
  isRoleBased: boolean;
  score: number;
}

export function VerifyForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("email-finder-verify", {
        body: { email: email.trim() },
      });
      if (error) throw error;
      setResult(data as VerifyResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = result?.status === "valid"
    ? ShieldCheck
    : result?.status === "risky"
    ? ShieldAlert
    : ShieldX;

  const statusColor =
    result?.status === "valid"
      ? "text-emerald-500"
      : result?.status === "risky"
      ? "text-amber-500"
      : "text-destructive";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify an email address</CardTitle>
        <CardDescription>
          Check deliverability via DNS MX lookup, disposable-domain detection, and role-based pattern checks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email address</Label>
            <Input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.smith@acmecorp.com"
              maxLength={255}
            />
          </div>
          <Button type="submit" disabled={loading || !email.trim()} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? "Verifying…" : "Verify Email"}
          </Button>
        </form>

        {result && (
          <div className="mt-6 space-y-4 border-t pt-6">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-6 w-6 ${statusColor}`} />
              <div>
                <p className="font-mono font-semibold break-all">{result.email}</p>
                <p className={`text-sm capitalize ${statusColor}`}>{result.status}</p>
              </div>
              <Badge variant="outline" className="ml-auto">{result.score}/100</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Stat label="Deliverable" value={result.isDeliverable ? "Yes" : "No"} positive={result.isDeliverable} />
              <Stat label="MX Records" value={result.hasMx ? "Found" : "Missing"} positive={result.hasMx} />
              <Stat label="Disposable" value={result.isDisposable ? "Yes" : "No"} positive={!result.isDisposable} />
              <Stat label="Role-based" value={result.isRoleBased ? "Yes" : "No"} positive={!result.isRoleBased} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-medium ${positive ? "text-emerald-500" : "text-muted-foreground"}`}>{value}</p>
    </div>
  );
}
