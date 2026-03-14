import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Search, ChevronDown, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SendUserEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  userId?: string;
  userName?: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

const EMAIL_TEMPLATES = {
  welcome: {
    subject: "Welcome to SkryveAI — Let's get you started",
    body: `Hey {name},

Thanks for signing up for SkryveAI! I'm here to help you get the most out of the platform.

Here's how to get started:

1. Search for a business (try 'web designers in Lagos' as a test)
2. Click 'Audit' to see what problems we find
3. Review the personalized email we generate

Takes about 3 minutes total.

Any questions? Just reply to this email.

Let's get you your first client 💪`,
  },
  followup_inactive: {
    subject: "Need help getting started with SkryveAI?",
    body: `Hey {name},

I saw you signed up for SkryveAI a couple days ago but haven't run an audit yet.

Any blockers? Anything confusing?

I'm happy to walk you through it real quick — literally takes 3 minutes and you'll see how it works.

Let me know 👍`,
  },
  upgrade: {
    subject: "How's SkryveAI working for you?",
    body: `Hey {name}!

I noticed you've been using SkryveAI quite a bit — that's awesome.

Just curious — how's it working for you so far? Getting any replies yet?

Also — what's keeping you on the free plan? Is it the price, or are you still testing it out?

We're working on making the paid plan more accessible for early users like you.

Let me know!`,
  },
  custom: {
    subject: "",
    body: "",
  },
};

export function SendUserEmailDialog({ open, onOpenChange, userEmail, userId, userName }: SendUserEmailDialogProps) {
  const [template, setTemplate] = useState<string>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [toEmail, setToEmail] = useState(userEmail || "");
  const [selectedUserId, setSelectedUserId] = useState(userId || "");
  const [selectedUserName, setSelectedUserName] = useState(userName || "");
  const { toast } = useToast();

  // User picker state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync props when dialog opens
  useEffect(() => {
    if (open) {
      setToEmail(userEmail || "");
      setSelectedUserId(userId || "");
      setSelectedUserName(userName || "");
    }
  }, [open, userEmail, userId, userName]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = userSearch.trim()
    ? users.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const selectUser = (user: UserProfile) => {
    setToEmail(user.email);
    setSelectedUserId(user.user_id);
    setSelectedUserName(user.full_name);
    setShowUserDropdown(false);
    setUserSearch("");

    // If a template is already selected, update the body with the new name
    if (template !== "custom") {
      const tmpl = EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES];
      if (tmpl) {
        setBody(tmpl.body.replace(/\{name\}/g, user.full_name || "there"));
      }
    }
  };

  const clearSelectedUser = () => {
    setToEmail("");
    setSelectedUserId("");
    setSelectedUserName("");
  };

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const tmpl = EMAIL_TEMPLATES[value as keyof typeof EMAIL_TEMPLATES];
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body.replace(/\{name\}/g, selectedUserName || userName || "there"));
    }
  };

  const handleSend = async () => {
    if (!toEmail || !subject || !body) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          toEmail: toEmail,
          toUserId: selectedUserId || userId,
          subject,
          body,
          templateType: template !== "custom" ? template : null,
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        throw new Error(error.message || "Edge function error");
      }
      if (data?.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      toast({ title: "Email sent successfully!" });
      onOpenChange(false);
      setSubject("");
      setBody("");
      setTemplate("custom");
      clearSelectedUser();
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Send Email to User
          </DialogTitle>
          <DialogDescription>
            Select a user from the list or type an email manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User Picker */}
          <div className="space-y-2">
            <Label>To</Label>

            {/* Selected user chip */}
            {selectedUserName && toEmail ? (
              <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedUserName}</p>
                    <p className="text-xs text-muted-foreground truncate">{toEmail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedUser}
                  className="p-1 rounded-full hover:bg-background transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Search by name or email..."
                    className="pl-9 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showUserDropdown && "rotate-180")} />
                  </button>
                </div>

                {showUserDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {userSearch ? `No users found for "${userSearch}"` : "No users found"}
                      </div>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <button
                            key={user.user_id}
                            type="button"
                            onClick={() => selectUser(user)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{user.full_name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Manual entry option */}
                    {userSearch && userSearch.includes("@") && (
                      <button
                        type="button"
                        onClick={() => {
                          setToEmail(userSearch);
                          setSelectedUserName("");
                          setShowUserDropdown(false);
                          setUserSearch("");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-t hover:bg-accent transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Send className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Send to "{userSearch}"</p>
                          <p className="text-xs text-muted-foreground">Use this email directly</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Show manual email input if user selected without name (manual entry) */}
            {toEmail && !selectedUserName && (
              <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm truncate">{toEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedUser}
                  className="p-1 rounded-full hover:bg-background transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Email</SelectItem>
                <SelectItem value="welcome">Welcome / Onboarding</SelectItem>
                <SelectItem value="followup_inactive">Follow-up (Inactive User)</SelectItem>
                <SelectItem value="upgrade">Upgrade Conversion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={10}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
