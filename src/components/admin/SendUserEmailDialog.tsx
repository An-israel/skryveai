import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Search, ChevronDown, User, X, Users, CheckCircle2, AlertCircle } from "lucide-react";
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
  const { toast } = useToast();

  // Multi-select user state
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Bulk send progress
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [failedUsers, setFailedUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
      // Pre-select if a specific user was passed
      if (userEmail && userId && userName) {
        setSelectedUsers([{ user_id: userId, full_name: userName, email: userEmail }]);
      }
    } else {
      setShowProgress(false);
      setSendProgress({ sent: 0, failed: 0, total: 0 });
      setFailedUsers([]);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const isUserSelected = (userId: string) => selectedUsers.some((u) => u.user_id === userId);

  const toggleUser = (user: UserProfile) => {
    setSelectedUsers((prev) =>
      isUserSelected(user.user_id)
        ? prev.filter((u) => u.user_id !== user.user_id)
        : [...prev, user]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const selectAll = () => {
    // Select all currently filtered users
    const newSelected = [...selectedUsers];
    filteredUsers.forEach((u) => {
      if (!isUserSelected(u.user_id)) {
        newSelected.push(u);
      }
    });
    setSelectedUsers(newSelected);
  };

  const deselectAll = () => {
    // Deselect only the filtered ones
    const filteredIds = new Set(filteredUsers.map((u) => u.user_id));
    setSelectedUsers((prev) => prev.filter((u) => !filteredIds.has(u.user_id)));
  };

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const tmpl = EMAIL_TEMPLATES[value as keyof typeof EMAIL_TEMPLATES];
    if (tmpl) {
      setSubject(tmpl.subject);
      // Use {name} placeholder — edge function will personalize per user
      setBody(tmpl.body);
    }
  };

  const sendToUsers = async (usersToSend: UserProfile[]) => {
    if (usersToSend.length === 0) {
      toast({ title: "No users to send to", variant: "destructive" });
      return;
    }
    if (!subject || !body) {
      toast({ title: "Please fill subject and body", variant: "destructive" });
      return;
    }

    setSending(true);
    setShowProgress(true);
    setFailedUsers([]);
    const total = usersToSend.length;
    setSendProgress({ sent: 0, failed: 0, total });

    let sent = 0;
    let failed = 0;
    const newFailedUsers: UserProfile[] = [];

    // Send one at a time with 600ms delay to respect 2/sec rate limit
    for (let i = 0; i < usersToSend.length; i++) {
      const user = usersToSend[i];
      try {
        const personalizedBody = body.replace(/\{name\}/g, user.full_name || "there");
        const { data, error } = await supabase.functions.invoke("send-admin-email", {
          body: {
            toEmail: user.email,
            toUserId: user.user_id,
            subject,
            body: personalizedBody,
            templateType: template !== "custom" ? template : null,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        sent++;
      } catch {
        failed++;
        newFailedUsers.push(user);
      }
      setSendProgress({ sent, failed, total });

      // Wait 600ms between sends to stay under 2/sec rate limit
      if (i < usersToSend.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setSending(false);
    setFailedUsers(newFailedUsers);

    if (failed === 0) {
      toast({ title: `✅ All ${sent} email${sent !== 1 ? "s" : ""} sent successfully!` });
      setTimeout(() => {
        onOpenChange(false);
        setSelectedUsers([]);
        setSubject("");
        setBody("");
        setTemplate("custom");
        setShowProgress(false);
        setFailedUsers([]);
      }, 1500);
    } else {
      toast({
        title: `Sent ${sent} of ${total} emails`,
        description: `${failed} failed. You can retry the failed ones.`,
        variant: "destructive",
      });
    }
  };

  const handleSend = () => sendToUsers(selectedUsers);

  const handleRetryFailed = () => sendToUsers(failedUsers);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => isUserSelected(u.user_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Send Email to Users
          </DialogTitle>
          <DialogDescription>
            Select one or multiple users — use {`{name}`} in the body to personalize
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selected user badges */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-2 rounded-md border bg-muted/30">
                {selectedUsers.map((user) => (
                  <Badge key={user.user_id} variant="secondary" className="gap-1 pr-1 text-xs">
                    {user.full_name || user.email}
                    <button
                      type="button"
                      onClick={() => removeUser(user.user_id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* User search & dropdown */}
          <div className="space-y-2">
            <Label>Search & select users</Label>
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
                  {/* Select all / Deselect all bar */}
                  {!loadingUsers && filteredUsers.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                      <span className="text-xs text-muted-foreground">
                        {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                        {userSearch && " matching"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={allFilteredSelected ? deselectAll : selectAll}
                      >
                        {allFilteredSelected ? "Deselect all" : "Select all"}
                      </Button>
                    </div>
                  )}

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
                    <div className="max-h-[220px] overflow-y-auto">
                      {filteredUsers.map((user) => {
                        const selected = isUserSelected(user.user_id);
                        return (
                          <button
                            key={user.user_id}
                            type="button"
                            onClick={() => toggleUser(user)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                              selected ? "bg-primary/5" : "hover:bg-accent"
                            )}
                          >
                            <Checkbox checked={selected} className="pointer-events-none" />
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{user.full_name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <span className="text-xs text-muted-foreground">Use {`{name}`} for personalization</span>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={10}
            />
          </div>

          {/* Bulk send progress */}
          {showProgress && (
            <div className="space-y-2 p-3 rounded-md border bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Sending {sendProgress.sent + sendProgress.failed} of {sendProgress.total}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100)}%
                </span>
              </div>
              <Progress
                value={((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}
                className="h-2"
              />
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {sendProgress.sent} sent
                </span>
                {sendProgress.failed > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="w-3.5 h-3.5" /> {sendProgress.failed} failed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || selectedUsers.length === 0} className="gap-2">
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {selectedUsers.length > 1
              ? `Send to ${selectedUsers.length} users`
              : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
