import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendAgreementPayload {
  to: string;
  client_name: string;
  contact_name: string;
  agreement_number: string;
  agreement_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: SendAgreementPayload = await req.json();

    if (!payload.to || !payload.agreement_url || !payload.agreement_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (to, agreement_url, agreement_number)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background-color: #dc2626; padding: 24px; text-align: center;">
          <img src="https://mediwaste.co.uk/mediwaste-logo-white.png" alt="MediWaste" style="max-height: 48px;" />
        </div>
        <div style="padding: 32px 24px;">
          <h1 style="font-size: 24px; margin-bottom: 16px; color: #111827;">Your Service Agreement from MediWaste</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Hello ${payload.contact_name ? escapeHtml(payload.contact_name) : "there"},
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            ${escapeHtml(payload.client_name)} has prepared a service agreement for your review and acceptance.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            <strong>Agreement reference:</strong> ${escapeHtml(payload.agreement_number)}
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Please click the button below to view and sign your agreement online. The link is private to you — please do not share it.
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${escapeHtml(payload.agreement_url)}"
               style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View and Sign Agreement
            </a>
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-top: 24px;">
            If the button above doesn't work, copy and paste this link into your browser:<br />
            <a href="${escapeHtml(payload.agreement_url)}" style="color: #dc2626; word-break: break-all;">${escapeHtml(payload.agreement_url)}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="font-size: 13px; color: #6b7280;">
            If you have any questions about this agreement, please contact us on 01322 879 713 or reply to this email.
          </p>
          <p style="font-size: 12px; color: #9ca3af;">
            Circular Horizons International LTD T/A MediWaste · Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ
          </p>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MediWaste <hello@mediwaste.co.uk>",
        to: [payload.to],
        subject: `Service Agreement ${payload.agreement_number} — Action Required`,
        html: emailHtml,
        reply_to: "hello@mediwaste.co.uk",
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const data = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
