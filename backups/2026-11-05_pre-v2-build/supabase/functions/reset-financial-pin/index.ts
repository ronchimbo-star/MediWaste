import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESET_EXPIRY_MINUTES = 15;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, email, resetToken, newPin, confirmPin } = body;

    if (action === "request") {
      // Request reset — find user by email
      if (!email) throw new Error("Email is required");

      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find((u: any) => u.email === email);

      // Always return success — don't reveal whether account exists
      if (!user || !RESEND_KEY) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate reset token
      const rawToken = crypto.randomUUID() + crypto.randomUUID();
      const tokenBytes = new TextEncoder().encode(rawToken);
      const hashBuffer = await crypto.subtle.digest("SHA-256", tokenBytes);
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Invalidate old tokens for this user
      await supabase.from("pin_reset_tokens").delete().eq("user_id", user.id);

      // Insert new token
      await supabase.from("pin_reset_tokens").insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + RESET_EXPIRY_MINUTES * 60000).toISOString(),
      });

      // Log reset request
      await supabase.from("invoice_events").insert({
        event_type: "pin_reset_requested",
        created_by: user.email,
      });

      // Send reset email
      const origin = req.headers.get("origin") || "https://mediwaste.co.uk";
      const resetUrl = `${origin}/admin/settings/financial-pin?reset=${rawToken}`;

      const html = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #FF0000; height: 6px; border-radius: 3px; margin-bottom: 24px;"></div>
  <img src="https://mediwaste.co.uk/mediwaste-logo.png" alt="MediWaste" style="width: 180px; margin-bottom: 24px;" />
  <h2 style="color: #111;">Reset your financial PIN</h2>
  <p style="font-size: 15px;">We received a request to reset the PIN used to protect financial information in your MediWaste application.</p>
  <p style="font-size: 15px;">Use the button below to create a new PIN. This link expires in ${RESET_EXPIRY_MINUTES} minutes.</p>
  <a href="${resetUrl}" style="display: inline-block; background: #FF0000; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 16px 0;">Reset PIN</a>
  <p style="font-size: 14px; color: #666;">If you did not request this, you can safely ignore this email.</p>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p>MediWaste LTD | Company No. 15821509 | Registered in England and Wales</p>
  </div>
</body></html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from: "MediWaste <hello@mediwaste.co.uk>",
          to: [email],
          subject: "Reset your MediWaste financial information PIN",
          html,
          reply_to: "hello@mediwaste.co.uk",
        }),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "complete") {
      // Complete reset with token + new PIN
      if (!resetToken || !newPin || !confirmPin) throw new Error("All fields are required");
      if (newPin !== confirmPin) throw new Error("PINs do not match");
      if (!/^\d{4}$/.test(newPin)) throw new Error("PIN must be exactly 4 digits");

      // Hash the provided token
      const tokenBytes = new TextEncoder().encode(resetToken);
      const hashBuffer = await crypto.subtle.digest("SHA-256", tokenBytes);
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Find token
      const { data: resetRecord } = await supabase
        .from("pin_reset_tokens")
        .select("user_id, expires_at, used_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (!resetRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired reset link." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (resetRecord.used_at) {
        return new Response(
          JSON.stringify({ error: "This reset link has already been used." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(resetRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "This reset link has expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark token as used
      await supabase.from("pin_reset_tokens").update({
        used_at: new Date().toISOString(),
      }).eq("token_hash", tokenHash);

      // Generate new salt and hash
      const saltBytes = new Uint8Array(16);
      crypto.getRandomValues(saltBytes);
      const pinSalt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(newPin + pinSalt),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      const derivedHash = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: encoder.encode(pinSalt), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        256
      );
      const pinHash = Array.from(new Uint8Array(derivedHash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Upsert PIN
      const { data: existing } = await supabase.from("financial_pins").select("user_id").eq("user_id", resetRecord.user_id).maybeSingle();
      if (existing) {
        await supabase.from("financial_pins").update({
          pin_hash: pinHash,
          pin_salt: pinSalt,
          failed_attempts: 0,
          locked_until: null,
          last_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", resetRecord.user_id);
      } else {
        await supabase.from("financial_pins").insert({
          user_id: resetRecord.user_id,
          pin_hash: pinHash,
          pin_salt: pinSalt,
        });
      }

      // Invalidate all sessions
      await supabase.from("financial_pin_sessions").delete().eq("user_id", resetRecord.user_id);

      // Log reset completion
      await supabase.from("invoice_events").insert({
        event_type: "pin_reset_completed",
        created_by: resetRecord.user_id,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");
  } catch (err) {
    console.error("reset-financial-pin error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
