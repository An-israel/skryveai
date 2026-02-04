import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get client IP from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

    if (clientIp === "unknown") {
      return new Response(
        JSON.stringify({ error: "Unable to determine client IP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if IP already has an account
    const { data: existingIp, error: ipCheckError } = await supabaseAdmin
      .from("signup_ips")
      .select("id")
      .eq("ip_address", clientIp)
      .maybeSingle();

    if (ipCheckError) {
      console.error("IP check error:", ipCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to verify IP address" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingIp) {
      return new Response(
        JSON.stringify({ 
          error: "An account has already been created from this network. Only one account per network is allowed.",
          code: "IP_ALREADY_USED"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, password, fullName, phone, portfolioUrl, bio, expertise, referralCode } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with Supabase Auth Admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        portfolio_url: portfolioUrl || null,
        bio: bio || null,
        expertise: expertise || [],
        referral_code: referralCode ? referralCode.toUpperCase() : null,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the IP address
    const { error: ipInsertError } = await supabaseAdmin
      .from("signup_ips")
      .insert({
        ip_address: clientIp,
        user_id: authData.user.id,
      });

    if (ipInsertError) {
      console.error("IP insert error:", ipInsertError);
      // Don't fail the signup, just log the error
    }

    // Update profile with signup IP
    await supabaseAdmin
      .from("profiles")
      .update({ 
        signup_ip: clientIp,
        phone: phone || null,
        portfolio_url: portfolioUrl || null,
        bio: bio || null,
        expertise: expertise || [],
      })
      .eq("user_id", authData.user.id);

    // Update user settings with service description
    if (expertise && expertise.length > 0) {
      await supabaseAdmin
        .from("user_settings")
        .update({ service_description: expertise.join(", ") })
        .eq("user_id", authData.user.id);
    }

    // Send confirmation email
    const { error: emailError } = await supabaseAdmin.auth.resend({
      type: "signup",
      email,
    });

    if (emailError) {
      console.error("Email resend error:", emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account created successfully. Please check your email to verify your account.",
        user: { id: authData.user.id, email: authData.user.email }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Signup error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
