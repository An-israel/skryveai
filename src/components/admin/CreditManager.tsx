import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Coins, Plus, Minus, Search, Loader2, UserPlus, Percent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserWithCredits {
  user_id: string;
  email: string;
  full_name: string;
  credits: number;
  plan: string;
  status: string;
}

export function CreditManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"add" | "remove" | "promote" | "commission">("add");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [commissionRate, setCommissionRate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-credits"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name");

      if (profilesError) throw profilesError;

      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("user_id, credits, plan, status");

      if (subsError) throw subsError;

      const usersWithCredits: UserWithCredits[] = profiles.map((profile) => {
        const sub = subscriptions.find((s) => s.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          credits: sub?.credits || 0,
          plan: sub?.plan || "none",
          status: sub?.status || "none",
        };
      });

      return usersWithCredits;
    },
  });

  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, action }: { userId: string; amount: number; action: "add" | "remove" }) => {
      const user = users?.find((u) => u.user_id === userId);
      if (!user) throw new Error("User not found");

      const newCredits = action === "add" 
        ? user.credits + amount 
        : Math.max(0, user.credits - amount);

      const { error } = await supabase
        .from("subscriptions")
        .update({ credits: newCredits })
        .eq("user_id", userId);

      if (error) throw error;
      return { newCredits };
    },
    onSuccess: (data) => {
      toast({
        title: "Credits updated",
        description: `User now has ${data.newCredits} credits`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users-credits"] });
      setDialogOpen(false);
      setCreditAmount("");
    },
    onError: (error) => {
      toast({
        title: "Error updating credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const promoteUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "super_admin" | "content_editor" | "support_agent" }) => {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .single();

      if (existingRole) {
        throw new Error("User already has this role");
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "User promoted",
        description: "Role assigned successfully",
      });
      setDialogOpen(false);
      setSelectedRole("");
    },
    onError: (error) => {
      toast({
        title: "Error promoting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ userId, rate }: { userId: string; rate: number }) => {
      // Update all referrals for this user with new commission rate
      const { error } = await supabase
        .from("referrals")
        .update({ commission_rate: rate })
        .eq("referrer_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Commission rate updated",
        description: "New referral commission rate set",
      });
      setDialogOpen(false);
      setCommissionRate("");
    },
    onError: (error) => {
      toast({
        title: "Error updating commission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDialog = (user: UserWithCredits, action: "add" | "remove" | "promote" | "commission") => {
    setSelectedUser(user);
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleDialogSubmit = () => {
    if (!selectedUser) return;

    if (dialogAction === "add" || dialogAction === "remove") {
      const amount = parseInt(creditAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({ title: "Invalid amount", variant: "destructive" });
        return;
      }
      updateCreditsMutation.mutate({ userId: selectedUser.user_id, amount, action: dialogAction });
    } else if (dialogAction === "promote") {
      if (!selectedRole) {
        toast({ title: "Select a role", variant: "destructive" });
        return;
      }
      promoteUserMutation.mutate({ userId: selectedUser.user_id, role: selectedRole as "super_admin" | "content_editor" | "support_agent" });
    } else if (dialogAction === "commission") {
      const rate = parseFloat(commissionRate) / 100;
      if (isNaN(rate) || rate < 0 || rate > 1) {
        toast({ title: "Invalid rate (0-100%)", variant: "destructive" });
        return;
      }
      updateCommissionMutation.mutate({ userId: selectedUser.user_id, rate });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credit & User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredUsers?.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{user.plan}</Badge>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{user.credits}</p>
                      <p className="text-xs text-muted-foreground">credits</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(user, "add")}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(user, "remove")}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(user, "promote")}
                          title="Promote to staff"
                        >
                          <UserPlus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(user, "commission")}
                          title="Set commission rate"
                        >
                          <Percent className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "add" && "Add Credits"}
              {dialogAction === "remove" && "Remove Credits"}
              {dialogAction === "promote" && "Promote User"}
              {dialogAction === "commission" && "Set Commission Rate"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {(dialogAction === "add" || dialogAction === "remove") && (
            <div className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Enter credit amount"
                />
              </div>
            </div>
          )}

          {dialogAction === "promote" && (
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="content_editor">Content Editor</SelectItem>
                    <SelectItem value="support_agent">Support Agent</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {dialogAction === "commission" && (
            <div className="space-y-4">
              <div>
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="e.g., 25 for 25%"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDialogSubmit}
              disabled={updateCreditsMutation.isPending || promoteUserMutation.isPending || updateCommissionMutation.isPending}
            >
              {(updateCreditsMutation.isPending || promoteUserMutation.isPending || updateCommissionMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
