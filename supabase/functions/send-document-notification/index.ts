import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("Resend API key not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { documentType, documentId, customMessage, attachmentBase64, attachmentFilename } = body;

    if (!documentType || !documentId) {
      throw new Error("documentType and documentId are required");
    }

    const validTypes = ["wtn", "hwcn", "certificate"];
    if (!validTypes.includes(documentType)) {
      throw new Error(`documentType must be one of: ${validTypes.join(", ")}`);
    }

    // Fetch the document and customer based on type
    let customer: any = null;
    let docNumber = "";
    let docLabel = "";
    let complianceUrl = "";

    if (documentType === "certificate") {
      const { data: cert, error } = await supabase
        .from("mw_certificates")
        .select(`
          id, certificate_number, qr_code_token, customer_id,
          customer:mw_customers(id, company_name, contact_name, email)
        `)
        .eq("id", documentId)
        .maybeSingle();
      if (error || !cert) throw new Error("Certificate not found");
      customer = Array.isArray(cert.customer) ? cert.customer[0] : cert.customer;
      docNumber = cert.certificate_number;
      docLabel = "Waste Disposal Certificate";
      complianceUrl = `https://mediwaste.co.uk/compliance/${cert.qr_code_token}`;
    } else if (documentType === "wtn") {
      const { data: wtn, error } = await supabase
        .from("mw_waste_transfer_notes")
        .select(`
          id, wtn_number, customer_id,
          customer:mw_customers!inner(id, company_name, contact_name, email, qr_token)
        `)
        .eq("id", documentId)
        .maybeSingle();
      if (error || !wtn) throw new Error("Waste Transfer Note not found");
      customer = Array.isArray(wtn.customer) ? wtn.customer[0] : wtn.customer;
      docNumber = wtn.wtn_number;
      docLabel = "Waste Transfer Note";
      // Link to the customer's certificate compliance page if they have a qr_token
      const { data: cert } = await supabase
        .from("mw_certificates")
        .select("qr_code_token")
        .eq("customer_id", customer.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      complianceUrl = cert?.qr_code_token
        ? `https://mediwaste.co.uk/compliance/${cert.qr_code_token}`
        : "https://mediwaste.co.uk";
    } else if (documentType === "hwcn") {
      const { data: hwcn, error } = await supabase
        .from("mw_hw_consignment_notes")
        .select(`
          id, hwcn_number, customer_id,
          customer:mw_customers!inner(id, company_name, contact_name, email)
        `)
        .eq("id", documentId)
        .maybeSingle();
      if (error || !hwcn) throw new Error("Hazardous Waste Consignment Note not found");
      customer = Array.isArray(hwcn.customer) ? hwcn.customer[0] : hwcn.customer;
      docNumber = hwcn.hwcn_number;
      docLabel = "Hazardous Waste Consignment Note";
      const { data: cert } = await supabase
        .from("mw_certificates")
        .select("qr_code_token")
        .eq("customer_id", customer.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      complianceUrl = cert?.qr_code_token
        ? `https://mediwaste.co.uk/compliance/${cert.qr_code_token}`
        : "https://mediwaste.co.uk";
    }

    if (!customer?.email) {
      throw new Error("This customer does not have an email address on file");
    }

    const recipientName = customer.contact_name || customer.company_name || "Customer";
    const subject = `Your ${docLabel} (${docNumber}) from MediWaste`;
    const message = customMessage || `Your ${docLabel.toLowerCase()} (reference ${docNumber}) has been generated and is now available. You can view all your compliance documents via your compliance portal using the link below.`;

    const html = buildEmailHtml(recipientName, docLabel, docNumber, message, complianceUrl);

    const emailPayload: any = {
      from: "MediWaste <hello@mediwaste.co.uk>",
      to: [customer.email],
      subject,
      html,
      reply_to: "hello@mediwaste.co.uk",
    };

    if (attachmentBase64) {
      emailPayload.attachments = [{
        filename: attachmentFilename || `${docNumber}.pdf`,
        content: attachmentBase64,
      }];
    }

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!sendResponse.ok) {
      const errText = await sendResponse.text();
      throw new Error(`Email send failed: ${sendResponse.status} — ${errText}`);
    }

    const sendResult = await sendResponse.json();

    // Check if we've sent a notification for this doc before (for resend count)
    const { data: existing } = await supabase
      .from("mw_document_notifications")
      .select("id, resend_count")
      .eq("document_type", documentType)
      .eq("document_id", documentId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("mw_document_notifications")
        .update({ resend_count: (existing.resend_count || 0) + 1, sent_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("mw_document_notifications").insert({
        document_type: documentType,
        document_id: documentId,
        customer_id: customer.id,
        recipient_email: customer.email,
        subject,
        message,
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: sendResult.id, recipient: customer.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-document-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml(recipientName: string, docLabel: string, docNumber: string, message: string, complianceUrl: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #FF0000; height: 6px; border-radius: 3px; margin-bottom: 24px;"></div>
  <img src="https://mediwaste.co.uk/mediwaste-logo.png" alt="MediWaste" style="width: 180px; margin-bottom: 24px;" />
  <p style="font-size: 15px;">Dear ${recipientName},</p>
  <div style="font-size: 15px; line-height: 1.6; white-space: pre-line; margin-bottom: 24px;">${message}</div>
  <div style="margin: 24px 0; padding: 16px; background: #f8f8f8; border-radius: 8px; border: 1px solid #eee;">
    <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px;">Document Details</p>
    <p style="margin: 0 0 4px; font-size: 14px;">Document: <strong>${docLabel}</strong></p>
    <p style="margin: 0; font-size: 14px;">Reference: <strong>${docNumber}</strong></p>
  </div>
  <a href="${complianceUrl}" style="display: inline-block; background: #FF0000; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 16px 0;">View Your Compliance Portal</a>
  <p style="font-size: 13px; color: #666; margin-top: 16px;">If you have any questions about this document, please contact us at hello@mediwaste.co.uk or call 01322 879 713.</p>
  <p style="font-size: 15px; margin-top: 24px;">Kind regards,<br>MediWaste Team</p>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p>MediWaste LTD | Company No. 15821509 | Registered in England and Wales</p>
    <p>Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ</p>
  </div>
</body></html>`;
}
