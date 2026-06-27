import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const morningMessages = [
  { title: "🌅 Fresh jobs are in", body: "New roles from across the web just landed on Skryve. Browse today's matches and apply early." },
  { title: "☀️ Good morning!", body: "The best applications go out early. Check today's job matches and send one before lunch." },
  { title: "🚀 Your morning boost", body: "A complete profile gets hired faster. Add a skill or portfolio piece and stand out to clients." },
  { title: "💪 New day, new openings", body: "Remote jobs posted in the last 24 hours are waiting. Open Skryve and find your next gig." },
  { title: "🎯 Start strong today", body: "Apply to one new job and reply to any client messages. Small steps land big projects." },
  { title: "⚡ Morning momentum", body: "Clients are reviewing talent right now. Make sure your profile is ready to impress." },
  { title: "🌟 Seize the day", body: "Learn a new skill, earn a certificate, get more hireable. A few minutes today pays off." },
];

const eveningMessages = [
  { title: "🌙 Evening check-in", body: "Still time to apply to a fresh job today — new remote roles are added around the clock." },
  { title: "📊 How'd today go?", body: "Did you apply, reply, or learn something? A little progress each day adds up fast." },
  { title: "🔥 Don't miss out", body: "New job matches may have arrived since this morning. Take a quick look before the day ends." },
  { title: "💡 Pro tip", body: "Reply quickly to client messages and offers — fast responses win more projects." },
  { title: "🎯 End the day strong", body: "Save the jobs you like and apply tomorrow, or send one more application tonight." },
  { title: "⭐ You're doing great", body: "Every application and course brings your next opportunity closer. Keep it up!" },
  { title: "🏆 Final push", body: "Check your messages, offers, and new job matches before you log off for the day." },
];

function getRandomMessage(messages: typeof morningMessages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

// Base64url decode helper
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function createVapidJwt(endpoint: string, privateKeyBase64url: string, publicKeyBase64url: string) {
  const audience = new URL(endpoint).origin;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:hello@skryve.ai",
  };

  const encodeBase64url = (data: string) =>
    btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const headerB64 = encodeBase64url(JSON.stringify(header));
  const payloadB64 = encodeBase64url(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64urlToUint8Array(privateKeyBase64url);
  const publicKeyBytes = base64urlToUint8Array(publicKeyBase64url);

  // Build JWK for import
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyBase64url,
    x: btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...publicKeyBytes.slice(33, 65)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(signature);
  let sigBase64url: string;
  if (sigBytes.length === 64) {
    sigBase64url = btoa(String.fromCharCode(...sigBytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } else {
    // DER format - extract r and s
    const r = sigBytes.slice(sigBytes[3] === 33 ? 5 : 4, sigBytes[3] === 33 ? 37 : 36);
    const sOffset = sigBytes[3] === 33 ? 37 : 36;
    const sLen = sigBytes[sOffset + 1];
    const s = sigBytes.slice(sOffset + 2, sOffset + 2 + sLen);
    const rPad = new Uint8Array(32); rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    const sPad = new Uint8Array(32); sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
    const rawSig = new Uint8Array(64);
    rawSig.set(rPad, 0);
    rawSig.set(sPad, 32);
    sigBase64url = btoa(String.fromCharCode(...rawSig))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  return `${unsignedToken}.${sigBase64url}`;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  try {
    const jwt = await createVapidJwt(subscription.endpoint, vapidPrivateKey, vapidPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (e) {
    console.error("Push send error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys
    const { data: config } = await supabase
      .from("push_config")
      .select("*")
      .eq("id", 1)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if morning or evening based on UTC hour
    // 7 AM WAT = 6 AM UTC, 5 PM WAT = 4 PM UTC
    const hour = new Date().getUTCHours();
    const isMorning = hour >= 5 && hour <= 9;
    const messages = isMorning ? morningMessages : eveningMessages;
    const message = getRandomMessage(messages);

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        message,
        config.public_key,
        config.private_key
      );

      if (success) {
        sent++;
      } else {
        failed++;
        // Remove invalid subscriptions
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }

      // Small delay between sends
      if (subscriptions.indexOf(sub) < subscriptions.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`Push notifications sent: ${sent}, failed: ${failed}`);

    return new Response(JSON.stringify({ sent, failed, message: message.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Send push error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
