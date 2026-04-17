import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";

export interface SearchInput {
  firstName?: string;
  lastName?: string;
  domain?: string;
  website?: string;
  company?: string;
}

interface Props {
  onSearch: (input: SearchInput) => void;
  loading: boolean;
}

export function EmailSearchForm({ onSearch, loading }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [domain, setDomain] = useState("");
  const [company, setCompany] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() && !company.trim()) return;
    onSearch({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      domain: domain.trim() || undefined,
      website: domain.trim() || undefined,
      company: company.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find an email address</CardTitle>
        <CardDescription>
          Enter a domain (or company) plus optional first/last name. We'll crawl the site,
          detect the email pattern, verify deliverability, and return the best match.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" maxLength={100} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain or website *</Label>
            <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acmecorp.com" maxLength={255} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company name <span className="text-muted-foreground text-xs">(optional fallback)</span></Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" maxLength={255} />
          </div>

          <Button type="submit" disabled={loading || (!domain.trim() && !company.trim())} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? "Searching…" : "Find Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
