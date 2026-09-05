import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const data = await req.json();
    const { type, auditId, recipientEmail, recipientName, auditNumber, shareToken, customSubject, customMessage } = data;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    const siteUrl = data.siteUrl || "https://mediwaste.co.uk";
    const auditLink = `${siteUrl}/audit/${shareToken}`;

    let subject = "";
    let emailHtml = "";

    switch (type) {
      case "sent_to_client":
        subject = customSubject || `MediWaste Pre-Acceptance Waste Audit — ${auditNumber}`;
        {
          const customBody = customMessage
            ? `<p style="color:#333;font-size:15px;line-height:1.6;">${customMessage.replace(/\n/g, '<br/>')}</p>`
            : `<p style="color:#333;font-size:15px;line-height:1.6;">Your Pre-Acceptance Waste Audit (<strong>${auditNumber}</strong>) has been prepared by MediWaste and is ready for your review.</p><p style="color:#333;font-size:15px;line-height:1.6;">Please click the button below to view, review, and sign the audit document. You can make edits or add comments before submitting it back to us.</p>`;
          emailHtml = `
<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#1a1a1a;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">MediWaste</h1>
<p style="color:#dc2626;margin:4px 0 0;font-size:13px;">Clinical Waste Management Solutions</p>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
<h2 style="color:#dc2626;margin:0 0 12px;">Pre-Acceptance Waste Audit Ready for Review</h2>
<p style="color:#333;font-size:15px;line-height:1.6;">Hello ${recipientName || ""},</p>
${customBody}
<div style="text-align:center;margin:28px 0;">
<a href="${auditLink}" style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">Review &amp; Sign Audit</a>
</div>
<p style="color:#666;font-size:13px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${auditLink}" style="color:#dc2626;">${auditLink}</a></p>
<p style="color:#333;font-size:15px;line-height:1.6;">If you have any questions, please don't hesitate to contact us.</p>
<p style="color:#333;font-size:15px;line-height:1.6;">Kind regards,<br/><strong>MediWaste Team</strong></p>
</div>
<div style="text-align:center;padding:16px;color:#999;font-size:12px;">© MediWaste — Clinical Waste Management Solutions</div>
</body></html>`;
        }
        break;

      case "client_edited":
        subject = `Client has reviewed audit ${auditNumber}`;
        emailHtml = `
<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#1a1a1a;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">MediWaste</h1>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
<h2 style="color:#dc2626;">Client Has Reviewed Audit ${auditNumber}</h2>
<p style="color:#333;font-size:15px;line-height:1.6;">The client has submitted their edits for audit <strong>${auditNumber}</strong>. Please log in to your admin dashboard to review the changes and finalise the document.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${siteUrl}/admin/waste-audits" style="background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">Review in Dashboard</a>
</div>
</div>
</body></html>`;
        break;

      case "ready_for_signature":
        subject = `Audit ${auditNumber} ready for your signature`;
        emailHtml = `
<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#1a1a1a;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">MediWaste</h1>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
<h2 style="color:#dc2626;">Audit Ready for Signature</h2>
<p style="color:#333;font-size:15px;line-height:1.6;">Your Pre-Acceptance Waste Audit (<strong>${auditNumber}</strong>) has been finalised and is ready for your signature.</p>
<p style="color:#333;font-size:15px;line-height:1.6;">Please click below to review and sign the document.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${auditLink}" style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">Review &amp; Sign</a>
</div>
</div>
</body></html>`;
        break;

      case "fully_signed":
        subject = `Audit ${auditNumber} fully signed`;
        emailHtml = `
<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#28a745;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">MediWaste</h1>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
<h2 style="color:#28a745;">Audit Fully Signed</h2>
<p style="color:#333;font-size:15px;line-height:1.6;">The Pre-Acceptance Waste Audit (<strong>${auditNumber}</strong>) has been signed by both parties and is now complete.</p>
<p style="color:#333;font-size:15px;line-height:1.6;">You can download the signed PDF from your portal.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${auditLink}" style="background:#28a745;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">View &amp; Download PDF</a>
</div>
</div>
</body></html>`;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const recipients = type === "client_edited" || type === "fully_signed"
      ? ["ronchimbo@gmail.com"]
      : [recipientEmail || "ronchimbo@gmail.com"];

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MediWaste <hello@mediwaste.co.uk>",
        to: recipients,
        subject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      throw new Error(`Failed to send email: ${errText}`);
    }

    const result = await resendResponse.json();

    await supabase.from("waste_audit_logs").insert({
      audit_id: auditId,
      action: `notification_${type}`,
      details: `Email sent: ${subject}`,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
