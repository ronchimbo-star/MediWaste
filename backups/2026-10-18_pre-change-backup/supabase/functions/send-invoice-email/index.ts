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
    const { invoiceId, pdfBase64, pdfFileName, resend } = body;

    if (!invoiceId) throw new Error("Invoice ID is required");

    // Fetch invoice with customer and line items
    const { data: invoice, error: invError } = await supabase
      .from("mw_invoices")
      .select(`
        *,
        customer:mw_customers(*),
        line_items:mw_invoice_line_items(*)
      `)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invError || !invoice) throw new Error("Invoice not found");

    const { data: settings } = await supabase
      .from("mw_invoice_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    const recipientEmail = invoice.recipient_email || invoice.customer?.email;
    if (!recipientEmail) throw new Error("No recipient email address");

    const subject = invoice.email_subject || `Invoice ${invoice.invoice_number} from MediWaste`;
    const salutation = invoice.email_salutation || `Dear ${invoice.customer?.contact_name || "Customer"},`;
    const emailBody = invoice.email_body || `Please find attached invoice ${invoice.invoice_number} for £${Number(invoice.total_amount).toFixed(2)}, payable by ${new Date(invoice.due_date).toLocaleDateString("en-GB")}.`;
    const signOff = invoice.email_sign_off || "Kind regards,\nMediWaste";

    const origin = req.headers.get("origin") || "https://mediwaste.co.uk";
    const invoiceUrl = `${origin}/invoice/${invoice.public_token}`;

    const html = buildEmailHtml(salutation, emailBody, signOff, invoice, invoiceUrl, settings);

    const emailPayload: any = {
      from: "MediWaste <hello@mediwaste.co.uk>",
      to: [recipientEmail],
      subject,
      html,
      reply_to: "hello@mediwaste.co.uk",
    };

    if (invoice.cc_emails) {
      emailPayload.cc = invoice.cc_emails.split(",").map((e: string) => e.trim()).filter(Boolean);
    }
    if (invoice.bcc_emails) {
      emailPayload.bcc = invoice.bcc_emails.split(",").map((e: string) => e.trim()).filter(Boolean);
    }

    if (pdfBase64) {
      emailPayload.attachments = [{
        filename: pdfFileName || `${invoice.invoice_number}.pdf`,
        content: pdfBase64,
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

    // Update invoice status if not a resend
    if (!resend) {
      await supabase
        .from("mw_invoices")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      await supabase.from("invoice_events").insert({
        invoice_id: invoiceId,
        event_type: "invoice_sent",
        new_status: "sent",
        event_data: { recipient: recipientEmail, subject, messageId: sendResult.id },
        created_by: "system",
      });
    } else {
      await supabase.from("invoice_events").insert({
        invoice_id: invoiceId,
        event_type: "invoice_resent",
        event_data: { recipient: recipientEmail, subject, messageId: sendResult.id },
        created_by: "system",
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: sendResult.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-invoice-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml(salutation: string, body: string, signOff: string, invoice: any, invoiceUrl: string, settings: any): string {
  const total = Number(invoice.total_amount).toFixed(2);
  const dueDate = new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const bankName = settings?.bank_name || "Tide Business Banking";
  const accountName = settings?.account_name || "Circular Horizons International LTD";
  const sortCode = settings?.sort_code || "04-06-05";
  const accountNumber = settings?.account_number || "2283 7469";
  const paymentLink = settings?.payment_link_url || "";

  return `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #FF0000; height: 6px; border-radius: 3px; margin-bottom: 24px;"></div>
  <img src="https://mediwaste.co.uk/mediwaste-logo.png" alt="MediWaste" style="width: 180px; margin-bottom: 24px;" />
  <p style="font-size: 15px;">${salutation}</p>
  <div style="font-size: 15px; line-height: 1.6; white-space: pre-line;">${body}</div>
  <div style="margin: 24px 0; padding: 16px; background: #f8f8f8; border-radius: 8px; border: 1px solid #eee;">
    <p style="margin: 0 0 8px; font-weight: bold; font-size: 14px;">Invoice Summary</p>
    <p style="margin: 0 0 4px; font-size: 14px;">Invoice: <strong>${invoice.invoice_number}</strong></p>
    <p style="margin: 0 0 4px; font-size: 14px;">Amount Due: <strong>£${total}</strong></p>
    <p style="margin: 0 0 4px; font-size: 14px;">Due Date: ${dueDate}</p>
    <p style="margin: 0; font-size: 14px;">Payment Reference: ${invoice.payment_reference || invoice.invoice_number}</p>
  </div>
  <a href="${invoiceUrl}" style="display: inline-block; background: #FF0000; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 16px 0;">View & Pay Invoice</a>
  <div style="margin: 24px 0; padding: 14px; background: #fafafa; border-radius: 8px; font-size: 13px; color: #555;">
    <p style="margin: 0 0 4px; font-weight: bold;">Bank Transfer Details</p>
    <p style="margin: 0 0 2px;">Bank: ${bankName}</p>
    <p style="margin: 0 0 2px;">Account Name: ${accountName}</p>
    <p style="margin: 0 0 2px;">Sort Code: ${sortCode}</p>
    <p style="margin: 0;">Account Number: ${accountNumber}</p>
    ${paymentLink ? `<p style="margin: 8px 0 0;"><a href="${paymentLink}" style="color: #FF0000;">Pay online</a></p>` : ""}
  </div>
  <p style="font-size: 15px; white-space: pre-line; margin-top: 24px;">${signOff}</p>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p>MediWaste LTD | Company No. 15821509 | Registered in England and Wales</p>
    <p>Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ</p>
  </div>
</body></html>`;
}
