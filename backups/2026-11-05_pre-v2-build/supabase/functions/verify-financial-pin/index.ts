import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;
const SESSION_MINUTES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { pin, sessionToken, action } = body;

    // If verifying with session token (re-check on page navigation)
    if (action === "check_session" && sessionToken) {
      const { data: session } = await supabase
        .from("financial_pin_sessions")
        .select("user_id, expires_at")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (!session) {
        return new Response(
          JSON.stringify({ valid: false, reason: "session_not_found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(session.expires_at) < new Date()) {
        await supabase.from("financial_pin_sessions").delete().eq("session_token", sessionToken);
        return new Response(
          JSON.stringify({ valid: false, reason: "expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, expiresAt: session.expires_at }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Authentication required");

      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Invalid authentication");
    const userId = userData.user.id;

    // Fetch PIN record
    const { data: pinRecord, error: pinErr } = await supabase
      .from("financial_pins")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (pinErr) throw new Error("Database error");
    if (!pinRecord) {
      return new Response(
        JSON.stringify({ error: "No PIN set. Please set a financial PIN first.", noPin: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check lockout
    if (pinRecord.locked_until && new Date(pinRecord.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(pinRecord.locked_until).getTime() - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ error: `Too many attempts. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.`, locked: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify PIN using Web Crypto API
    const { pin_hash, pin_salt } = pinRecord;
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(pin + pin_salt),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedHash = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: encoder.encode(pin_salt), iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const computedHash = Array.from(new Uint8Array(derivedHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHash !== pin_hash) {
      // Increment failed attempts
      const newAttempts = (pinRecord.failed_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      await supabase.from("financial_pins").update({
        failed_attempts: newAttempts,
        locked_until: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString() : null,
      }).eq("user_id", userId);

      // Log failed attempt
      await supabase.from("invoice_events").insert({
        event_type: "pin_failed_attempt",
        event_data: { attempts: newAttempts },
        created_by: userId,
      });

      if (shouldLock) {
        return new Response(
          JSON.stringify({ error: `Too many incorrect attempts. Locked for ${LOCKOUT_MINUTES} minutes.`, locked: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Incorrect PIN. Please try again.", attemptsRemaining: MAX_ATTEMPTS - newAttempts }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PIN correct — reset attempts, create session
    await supabase.from("financial_pins").update({
      failed_attempts: 0,
      locked_until: null,
    }).eq("user_id", userId);

    // Delete old sessions for this user
    await supabase.from("financial_pin_sessions").delete().eq("user_id", userId);

    // Create new session
    const sessionToken = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60000).toISOString();

    await supabase.from("financial_pin_sessions").insert({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt,
    });

    // Log unlock
    await supabase.from("invoice_events").insert({
      event_type: "financial_section_unlocked",
      created_by: userId,
    });

    return new Response(
      JSON.stringify({ success: true, sessionToken, expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-financial-pin error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
