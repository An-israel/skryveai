import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Private key d parameter is already base64url
  const privateKeyBase64 = privateKeyJwk.d!;

  return { publicKey: publicKeyBase64, privateKey: privateKeyBase64 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, subscription } = await req.json();

    if (action === "get-public-key") {
      // Get or generate VAPID keys
      let { data: config } = await supabase
        .from("push_config")
        .select("public_key")
        .eq("id", 1)
        .single();

      if (!config) {
        const keys = await generateVapidKeys();
        const { error } = await supabase
          .from("push_config")
          .insert({ id: 1, public_key: keys.publicKey, private_key: keys.privateKey });
        if (error) throw error;
        config = { public_key: keys.publicKey };
      }

      return new Response(JSON.stringify({ publicKey: config.public_key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "subscribe") {
      // Get user from auth header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Not authenticated");

      const { endpoint, keys } = subscription;

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,endpoint" });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unsubscribe") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error("Not authenticated");

      const { endpoint } = subscription;
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
