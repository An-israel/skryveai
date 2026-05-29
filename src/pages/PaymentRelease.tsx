import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, DollarSign, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PaymentRelease() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [talent, setTalent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const { data: proj } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!proj) { navigate("/projects"); return; }
      setProject(proj);

      const { data: miles } = await (supabase as any)
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");
      setMilestones(miles || []);

      // Get talent profile
      const { data: talentProfile } = await (supabase as any)
        .from("talent_profiles")
        .select("full_name, profile_photo_url, primary_skill")
        .eq("user_id", proj.talent_id)
        .single();
      setTalent(talentProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const { error } = await (supabase as any)
        .from("projects")
        .update({
          payment_status: "released",
          status: "completed",
        })
        .eq("id", projectId);

      if (error) throw error;

      // Notify talent
      if (project?.talent_id) {
        await (supabase as any).from("notifications").insert({
          user_id: project.talent_id,
          type: "payment",
          title: "Payment released!",
          body: `Your payment of ${project.currency} ${project.total_amount} has been released for "${project.title}".`,
          link: `/projects/${projectId}`,
        });
      }

      setReleased(true);
      toast({ title: "Payment released!", description: "Funds have been released to the talent." });
    } catch (err: any) {
      toast({ title: "Release failed", description: err.message, variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (released) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Payment Released!</h2>
        <p className="text-muted-foreground mb-8">
          {project?.currency} {project?.total_amount} has been released to {talent?.full_name || "the talent"}.
        </p>
        <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Release Payment</h1>
        <p className="text-sm text-muted-foreground">Confirm payment for completed work</p>
      </div>

      {/* Project summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{project?.title}</CardTitle>
          {talent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {talent.profile_photo_url && (
                <img src={talent.profile_photo_url} className="w-6 h-6 rounded-full object-cover" alt={talent.full_name} />
              )}
              <span>{talent.full_name}</span>
              {talent.primary_skill && <span>· {talent.primary_skill}</span>}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payment Amount</span>
            <span className="text-xl font-bold text-[#1E3A5F]">
              {project?.currency} {project?.total_amount?.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline" className={
              project?.payment_status === "released"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }>
              {project?.payment_status || "Pending"}
            </Badge>
          </div>

          {project?.deadline && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deadline</span>
              <span>{formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}</span>
            </div>
          )}

          {milestones.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">Milestones</p>
                <div className="space-y-2">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{m.title}</span>
                      <div className="flex items-center gap-2">
                        {m.amount > 0 && <span>{project?.currency} {m.amount}</span>}
                        <Badge variant="outline" className={
                          m.status === "completed"
                            ? "bg-green-50 text-green-700 border-green-200 text-xs"
                            : "text-xs"
                        }>
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Warning */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">This action cannot be undone</p>
          <p>Releasing payment confirms you are satisfied with the work delivered. Only proceed when you have reviewed and accepted all deliverables.</p>
        </div>
      </div>

      {/* Confirm button */}
      {project?.payment_status !== "released" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full bg-[#059669] hover:bg-[#047857]" size="lg">
              <DollarSign className="w-4 h-4 mr-2" />
              Release Payment — {project?.currency} {project?.total_amount?.toLocaleString()}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment Release</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to release {project?.currency} {project?.total_amount} to {talent?.full_name}. This will mark the project as complete and cannot be reversed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[#059669] hover:bg-[#047857]"
                onClick={handleRelease}
                disabled={releasing}
              >
                {releasing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Releasing...</> : "Yes, Release Payment"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      )}
    </div>
  );
}
