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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { invoiceId, amount, paymentDate, paymentMethod, recipientEmail, emailSubject, emailSalutation, emailBody, emailSignOff } = body;

    if (!invoiceId) throw new Error("Invoice ID is required");

    const { data: invoice, error: invError } = await supabase
      .from("mw_invoices")
      .select(`*, customer:mw_customers(*)`)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invError || !invoice) throw new Error("Invoice not found");

    const toEmail = recipientEmail || invoice.recipient_email || invoice.customer?.email;
    if (!toEmail) throw new Error("No recipient email address");

    const subject = emailSubject || `Payment Received — Invoice ${invoice.invoice_number}`;
    const salutation = emailSalutation || `Dear ${invoice.customer?.contact_name || "Customer"},`;
    const bodyText = emailBody || `Thank you. We confirm receipt of £${Number(amount).toFixed(2)} against invoice ${invoice.invoice_number}. The invoice is now marked as paid.`;
    const signOff = emailSignOff || "Kind regards,\nMediWaste";

    const html = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #28a745; height: 6px; border-radius: 3px; margin-bottom: 24px;"></div>
  <img src="https://mediwaste.co.uk/mediwaste-logo.png" alt="MediWaste" style="width: 180px; margin-bottom: 24px;" />
  <p style="font-size: 15px;">${salutation}</p>
  <div style="font-size: 15px; line-height: 1.6; white-space: pre-line;">${bodyText}</div>
  <div style="margin: 24px 0; padding: 16px; background: #f0fff4; border-radius: 8px; border: 1px solid #c3e6cb;">
    <p style="margin: 0 0 4px; font-size: 14px;"><strong>Invoice:</strong> ${invoice.invoice_number}</p>
    <p style="margin: 0 0 4px; font-size: 14px;"><strong>Amount Received:</strong> £${Number(amount).toFixed(2)}</p>
    <p style="margin: 0 0 4px; font-size: 14px;"><strong>Payment Date:</strong> ${new Date(paymentDate).toLocaleDateString("en-GB")}</p>
    <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Paid</span></p>
  </div>
  <p style="font-size: 15px; white-space: pre-line; margin-top: 24px;">${signOff}</p>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p>MediWaste LTD | Company No. 15821509 | Registered in England and Wales</p>
    <p>Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ</p>
  </div>
</body></html>`;

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "MediWaste <hello@mediwaste.co.uk>",
        to: [toEmail],
        subject,
        html,
        reply_to: "hello@mediwaste.co.uk",
      }),
    });

    if (!sendResponse.ok) {
      const errText = await sendResponse.text();
      throw new Error(`Email send failed: ${sendResponse.status} — ${errText}`);
    }

    const sendResult = await sendResponse.json();

    await supabase.from("invoice_events").insert({
      invoice_id: invoiceId,
      event_type: "payment_email_sent",
      event_data: { recipient: toEmail, subject, amount, messageId: sendResult.id },
      created_by: "system",
    });

    return new Response(
      JSON.stringify({ success: true, messageId: sendResult.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-payment-receipt error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
