import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OBVIOUS_PINS = ["0000", "1234", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { newPin, confirmPin, currentPin, action } = body;

    // Get user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Authentication required");

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Invalid authentication");
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Validate new PIN
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be exactly 4 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPin !== confirmPin) {
      return new Response(
        JSON.stringify({ error: "PINs do not match." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (OBVIOUS_PINS.includes(newPin)) {
      return new Response(
        JSON.stringify({ error: "That PIN is too obvious. Please choose a different one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if PIN already exists
    const { data: existingPin } = await supabase
      .from("financial_pins")
      .select("pin_hash, pin_salt")
      .eq("user_id", userId)
      .maybeSingle();

    // If changing PIN, verify current PIN
    if (existingPin && action === "change" && currentPin) {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(currentPin + existingPin.pin_salt),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      const derivedHash = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: encoder.encode(existingPin.pin_salt), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        256
      );
      const computedHash = Array.from(new Uint8Array(derivedHash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (computedHash !== existingPin.pin_hash) {
        return new Response(
          JSON.stringify({ error: "Current PIN is incorrect." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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

    // Upsert PIN record
    if (existingPin) {
      await supabase.from("financial_pins").update({
        pin_hash: pinHash,
        pin_salt: pinSalt,
        failed_attempts: 0,
        locked_until: null,
        last_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    } else {
      await supabase.from("financial_pins").insert({
        user_id: userId,
        pin_hash: pinHash,
        pin_salt: pinSalt,
        last_changed_at: new Date().toISOString(),
      });
    }

    // Invalidate all existing sessions
    await supabase.from("financial_pin_sessions").delete().eq("user_id", userId);

    // Log event
    await supabase.from("invoice_events").insert({
      event_type: existingPin ? "pin_changed" : "pin_created",
      created_by: userEmail || userId,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("set-financial-pin error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
