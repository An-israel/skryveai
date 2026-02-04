import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Email address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(RESEND_API_KEY);

    // Sample email that mimics what clients receive
    const sampleEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="margin: 0 0 16px 0;">Hi there,</p>
        
        <p style="margin: 0 0 16px 0;">I came across <strong>ABC Restaurant</strong> while researching businesses in Lagos, and I was impressed by what you've built. However, I noticed a few opportunities that could help improve your online presence and attract more customers.</p>
        
        <p style="margin: 0 0 16px 0;">After reviewing your website, I found:</p>
        
        <ul style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;"><strong>Mobile Experience:</strong> Your site could be better optimized for mobile users, who make up 70% of web traffic</li>
          <li style="margin-bottom: 8px;"><strong>Page Speed:</strong> Slow loading times may be causing visitors to leave before seeing your menu</li>
          <li style="margin-bottom: 8px;"><strong>Local SEO:</strong> Some improvements could help you rank higher when people search "restaurants near me"</li>
        </ul>
        
        <p style="margin: 0 0 16px 0;">I specialize in web development and digital marketing for local businesses. I've helped restaurants like yours increase online orders by 40% and boost foot traffic from Google searches.</p>
        
        <p style="margin: 0 0 16px 0;">Would you be open to a quick 15-minute call this week to discuss how I can help? No pressure at all – just a friendly chat to see if we're a good fit.</p>
        
        <p style="margin: 0 0 16px 0;">Best regards,<br/>
        <strong>Aniekan Essien</strong><br/>
        Freelance Web Developer & Digital Marketer<br/>
        <a href="https://yourportfolio.com" style="color: #0066cc;">View My Portfolio</a></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="font-size: 12px; color: #666;">
          <a href="#" style="color: #666;">Unsubscribe</a> from future emails
        </p>
      </body>
      </html>
    `;

    const { data: emailResponse, error: sendError } = await resend.emails.send({
      from: "Aniekan Essien <outreach@skryveai.com>",
      to: [to],
      reply_to: "reply-sample123@inbound.outreachpro.app",
      subject: "Quick Question About Your Website - I Can Help",
      html: sampleEmail,
    });

    if (sendError) {
      console.error("Send error:", sendError);
      throw new Error(sendError.message || "Failed to send email");
    }

    console.log(`Sample email sent to ${to}, ID: ${emailResponse?.id}`);

    return new Response(
      JSON.stringify({ success: true, resendId: emailResponse?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
