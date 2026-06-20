import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function riskBadge(rating: string) {
  const colours: Record<string, string> = {
    low: "#16a34a", medium: "#d97706", high: "#dc2626", critical: "#7c3aed",
  };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${colours[rating] || "#6b7280"};color:#fff;font-weight:700;font-size:12px;text-transform:uppercase;">${rating}</span>`;
}

function buildAuditEmailHtml(session: any, report: any, type: "user" | "admin"): string {
  const risks = (report.compliance_risks || [])
    .map((r: any) => `<tr>
      <td style="border:1px solid #e5e7eb;padding:8px 12px;font-size:13px;">${r.title}</td>
      <td style="border:1px solid #e5e7eb;padding:8px 12px;font-size:13px;">${r.description}</td>
      <td style="border:1px solid #e5e7eb;padding:8px 12px;font-size:13px;">${r.action}</td>
    </tr>`).join("");

  const recs = (report.recommendations || [])
    .map((r: any) => `<li style="margin-bottom:8px;"><strong>${r.title}</strong><br><span style="color:#4b5563;font-size:13px;">${r.description}</span></li>`)
    .join("");

  const adminSection = type === "admin" ? `
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px;margin:20px 0;">
      <h3 style="margin:0 0 8px;color:#854d0e;font-size:14px;">Admin Details</h3>
      <p style="margin:4px 0;font-size:13px;"><strong>Email:</strong> ${session.email}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Phone:</strong> ${session.phone || "Not provided"}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Address:</strong> ${session.site_address || ""}, ${session.town || ""} ${session.postcode || ""}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Risk Score:</strong> ${report.risk_score}/100 — ${report.risk_rating?.toUpperCase()}</p>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr><td style="background:#dc2626;padding:28px 36px;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Clinical Waste Audit Report</h1>
        <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">MediWaste.co.uk — Compliance &amp; Waste Management</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:28px 36px;">
        <p style="margin:0 0 16px;font-size:15px;color:#111;">Dear ${type === "admin" ? "MediWaste Team" : session.contact_name || "there"},</p>
        ${type === "user"
          ? `<p style="margin:0 0 20px;font-size:14px;color:#374151;">Thank you for completing your Clinical Waste Audit with MediWaste. Your personalised audit report is below.</p>`
          : `<p style="margin:0 0 20px;font-size:14px;color:#374151;">A new clinical waste audit has been completed by <strong>${session.business_name}</strong> (${session.sector}).</p>`}
        ${adminSection}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;">Business</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111;">${session.business_name}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#374151;">${session.sector} &mdash; ${session.town || ""}${session.county ? ", " + session.county : ""}</p>
        </div>
        <div style="margin:0 0 20px;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;">Overall Risk Rating</p>
          ${riskBadge(report.risk_rating || "medium")}
          <span style="margin-left:8px;font-size:14px;color:#374151;">Risk score: ${report.risk_score}/100</span>
        </div>
        <h2 style="font-size:16px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin:20px 0 12px;">Executive Summary</h2>
        <p style="font-size:14px;color:#374151;line-height:1.6;">${report.executive_summary}</p>
        ${risks ? `
        <h2 style="font-size:16px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin:20px 0 12px;">Compliance Risks Identified</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead><tr style="background:#fef2f2;">
            <th style="border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-size:12px;color:#dc2626;">Risk</th>
            <th style="border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-size:12px;color:#dc2626;">Description</th>
            <th style="border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-size:12px;color:#dc2626;">Action Required</th>
          </tr></thead>
          <tbody>${risks}</tbody>
        </table>` : ""}
        ${recs ? `
        <h2 style="font-size:16px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin:20px 0 12px;">Recommendations</h2>
        <ul style="padding-left:20px;margin:0;">${recs}</ul>` : ""}
        <!-- CTA -->
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:24px 0 0;text-align:center;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#dc2626;">Need help managing your clinical waste?</p>
          <p style="margin:0 0 16px;font-size:13px;color:#374151;">Get a free, no-obligation quote from MediWaste.co.uk today.</p>
          <a href="https://mediwaste.co.uk/quote" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Request a Free Quote</a>
          <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Call us free: <strong>0800 046 9806</strong></p>
        </div>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 36px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">MediWaste &mdash; Circular Horizons International Ltd t/a MediWaste</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Registered waste carrier (upper tier) &mdash; audited annually by the Environment Agency</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { session_id, send_to_user = true } = await req.json();
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const { data: session } = await supabase
      .from("mw_audit_sessions").select("*").eq("id", session_id).single();
    if (!session) throw new Error("Session not found");

    const { data: report } = await supabase
      .from("mw_audit_reports").select("*").eq("session_id", session_id).maybeSingle();
    if (!report) throw new Error("Report not found");

    const sent: string[] = [];

    // Email to user
    if (send_to_user && session.email) {
      const userHtml = buildAuditEmailHtml(session, report, "user");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "MediWaste Audits <onboarding@resend.dev>",
          to: [session.email],
          subject: `Your Clinical Waste Audit Report — ${session.business_name}`,
          html: userHtml,
          reply_to: "info@mediwaste.co.uk",
        }),
      });
      sent.push("user");
    }

    // Notification to admin
    const adminHtml = buildAuditEmailHtml(session, report, "admin");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "MediWaste Audits <onboarding@resend.dev>",
        to: ["ronchimbo@gmail.com"],
        subject: `New Audit: ${session.business_name} (${session.sector}) — Risk: ${report.risk_rating?.toUpperCase()}`,
        html: adminHtml,
        reply_to: session.email || "noreply@mediwaste.co.uk",
      }),
    });
    sent.push("admin");

    // Record download event for email
    await supabase.from("mw_audit_download_events").insert({ session_id, format: "email" });

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-audit-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
