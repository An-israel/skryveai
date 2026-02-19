import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => 
      ["super_admin", "content_editor", "support_agent"].includes(r.role)
    );

    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    // Get stats
    const [
      { count: totalUsers },
      { count: activeSubscriptions },
      { count: trialUsers },
      { count: totalCampaigns },
      { count: totalEmails },
      { data: recentActivity },
      { data: revenueData },
      { data: signupTrend },
      { data: allCampaigns },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "trial"),
      supabase.from("campaigns").select("*", { count: "exact", head: true }),
      supabase.from("emails").select("*", { count: "exact", head: true }),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("payment_history").select("amount, currency, created_at").eq("status", "success"),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
      supabase.from("campaigns").select("emails_sent, replies"),
    ]);

    // Calculate total revenue
    const totalRevenue = revenueData?.reduce((sum, p) => {
      if (p.currency === "NGN") return sum + p.amount;
      if (p.currency === "USD") return sum + (p.amount * 1500);
      return sum + p.amount;
    }, 0) || 0;

    // Calculate total emails sent and replies across all users
    const totalEmailsSentByAll = allCampaigns?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0;
    const totalRepliesByAll = allCampaigns?.reduce((sum, c) => sum + (c.replies || 0), 0) || 0;

    // Group signups by month
    const signupsByMonth: Record<string, number> = {};
    signupTrend?.forEach(profile => {
      const month = new Date(profile.created_at).toISOString().substring(0, 7);
      signupsByMonth[month] = (signupsByMonth[month] || 0) + 1;
    });

    return new Response(JSON.stringify({
      stats: {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        trialUsers: trialUsers || 0,
        totalCampaigns: totalCampaigns || 0,
        totalEmails: totalEmails || 0,
        totalRevenue: totalRevenue,
        totalEmailsSentByAll,
        totalRepliesByAll,
      },
      recentActivity,
      signupsByMonth,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin stats error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: message.includes("Unauthorized") ? 401 : 
             message.includes("Forbidden") ? 403 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
