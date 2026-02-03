import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PasswordResetRequest {
  email: string;
  resetUrl: string;
  userName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl, userName }: PasswordResetRequest = await req.json();

    if (!email || !resetUrl) {
      throw new Error("Missing required fields");
    }

    const emailResponse = await resend.emails.send({
      from: "SkryveAI <noreply@resend.dev>",
      to: [email],
      subject: "Reset your SkryveAI password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f766e 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
              <span style="background: linear-gradient(135deg, #14b8a6, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">SkryveAI</span>
            </h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a2e; margin: 0 0 20px;">Password Reset Request</h2>
            
            <p style="margin: 0 0 20px; color: #64748b;">
              Hi${userName ? ` ${userName}` : ''},
            </p>
            
            <p style="margin: 0 0 20px; color: #64748b;">
              We received a request to reset your password for your SkryveAI account. Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block;
                        background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); 
                        color: white; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: 16px;
                        box-shadow: 0 4px 15px rgba(15, 118, 110, 0.3);">
                Reset Password
              </a>
            </div>
            
            <p style="margin: 0 0 20px; color: #64748b; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} SkryveAI. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-password-reset function:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
