import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WasteItem {
  waste_type: string;
  quantity: number;
  volume_unit: string;
  container_type: string | null;
  notes: string | null;
}

interface SupplyItem {
  supply_type: string;
  quantity: number;
}

interface CollectionRequest {
  request_number: string;
  customer_name: string;
  customer_address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  waste_items: WasteItem[];
  supplies: SupplyItem[];
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_days: string[] | null;
  preferred_time_slot: string;
  special_instructions: string | null;
  source: string;
}

function formatTimeSlot(slot: string): string {
  const map: Record<string, string> = {
    morning: "Morning (08:00 – 12:00)",
    midday: "Midday (12:00 – 16:00)",
    afternoon: "Afternoon (16:00 – 20:00)",
    any: "Any time (no preference)",
  };
  return map[slot] ?? slot;
}

function formatSource(source: string): string {
  const map: Record<string, string> = {
    public_form: "Public website form",
    customer_portal: "Customer portal",
    qr_form: "QR code scan",
    compliance_page: "Compliance page",
  };
  return map[source] ?? source;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const data: CollectionRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const wasteItemsHtml = data.waste_items.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;font-size:12px;">Waste Type</th>
              <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;font-size:12px;">Qty</th>
              <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;font-size:12px;">Container</th>
              <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;font-size:12px;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${data.waste_items.map(item => `
              <tr>
                <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.waste_type}</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.quantity} ${item.volume_unit}</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.container_type ?? '—'}</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${item.notes ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      : '<p style="color:#6b7280;font-size:13px;">No waste items specified</p>';

    const suppliesHtml = data.supplies.length > 0
      ? `<ul style="margin:4px 0;padding-left:20px;">
          ${data.supplies.map(s => `<li style="font-size:13px;">${s.quantity}x ${s.supply_type}</li>`).join('')}
        </ul>`
      : '<p style="color:#6b7280;font-size:13px;">None requested</p>';

    const schedulingHtml = data.preferred_days && data.preferred_days.length > 0
      ? `<p style="margin:4px 0;font-size:13px;"><strong>Preferred days:</strong> ${data.preferred_days.join(', ')}</p>`
      : `<p style="margin:4px 0;font-size:13px;"><strong>Earliest date:</strong> ${data.preferred_date_from ?? '—'}</p>
         ${data.preferred_date_to ? `<p style="margin:4px 0;font-size:13px;"><strong>Latest date:</strong> ${data.preferred_date_to}</p>` : ''}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background:#dc2626;padding:16px 20px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">New Collection Request</h1>
          <p style="color:#fca5a5;margin:4px 0 0;font-size:14px;">Reference: ${data.request_number}</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">

          <h2 style="font-size:15px;color:#374151;margin:0 0 12px;">Customer / Contact Details</h2>
          <p style="margin:4px 0;font-size:13px;"><strong>Customer:</strong> ${data.customer_name}</p>
          ${data.customer_address ? `<p style="margin:4px 0;font-size:13px;"><strong>Address:</strong> ${data.customer_address}</p>` : ''}
          ${data.contact_name ? `<p style="margin:4px 0;font-size:13px;"><strong>Contact name:</strong> ${data.contact_name}</p>` : ''}
          ${data.contact_phone ? `<p style="margin:4px 0;font-size:13px;"><strong>Phone:</strong> ${data.contact_phone}</p>` : ''}
          ${data.contact_email ? `<p style="margin:4px 0;font-size:13px;"><strong>Email:</strong> ${data.contact_email}</p>` : ''}
          <p style="margin:4px 0;font-size:13px;"><strong>Submitted via:</strong> ${formatSource(data.source)}</p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">

          <h2 style="font-size:15px;color:#374151;margin:0 0 12px;">Waste Items to Collect</h2>
          ${wasteItemsHtml}

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">

          <h2 style="font-size:15px;color:#374151;margin:0 0 8px;">Supplies Requested from Driver</h2>
          ${suppliesHtml}

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">

          <h2 style="font-size:15px;color:#374151;margin:0 0 8px;">Scheduling Preference</h2>
          ${schedulingHtml}
          <p style="margin:4px 0;font-size:13px;"><strong>Time slot:</strong> ${formatTimeSlot(data.preferred_time_slot)}</p>
          ${data.special_instructions ? `<p style="margin:8px 0 4px;font-size:13px;"><strong>Special instructions:</strong></p><p style="margin:0;font-size:13px;background:#f9fafb;padding:10px;border-radius:6px;border:1px solid #e5e7eb;">${data.special_instructions.replace(/\n/g, '<br>')}</p>` : ''}

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">This request has been saved to the admin dashboard at /admin/collection-requests</p>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MediWaste <onboarding@resend.dev>",
        to: ["ronchimbo@gmail.com"],
        subject: `New Collection Request ${data.request_number} — ${data.customer_name}`,
        html: emailHtml,
        reply_to: data.contact_email ?? undefined,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend API error:", errText);
      throw new Error(`Failed to send email: ${errText}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
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
