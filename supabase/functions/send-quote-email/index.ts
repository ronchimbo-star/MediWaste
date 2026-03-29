import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Product {
  type: string;
  quantity: string;
  size: string;
}

interface QuoteSubmission {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  postcode: string;
  service_type: string;
  products: Product[];
  frequency: string;
  additional_info?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const submission: QuoteSubmission = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const productsHtml = submission.products
      .map(
        (product) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.type}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.size}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.quantity}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <h2>New Quote Request</h2>

      <h3>Business Information</h3>
      <p><strong>Business Name:</strong> ${submission.business_name}</p>
      <p><strong>Contact Name:</strong> ${submission.contact_name}</p>
      <p><strong>Email:</strong> ${submission.email}</p>
      <p><strong>Phone:</strong> ${submission.phone}</p>
      <p><strong>Postcode:</strong> ${submission.postcode}</p>

      <h3>Service Details</h3>
      <p><strong>Service Type:</strong> ${submission.service_type}</p>
      <p><strong>Collection Frequency:</strong> ${submission.frequency}</p>

      <h3>Products Required</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Waste Type</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Container Size</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${productsHtml}
        </tbody>
      </table>

      ${submission.additional_info ? `
        <h3>Additional Information</h3>
        <p>${submission.additional_info.replace(/\n/g, '<br>')}</p>
      ` : ''}

      <hr>
      <p style="color: #666; font-size: 12px;">Submitted via MediWaste Quote Form</p>
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
        subject: `New Quote Request from ${submission.business_name}`,
        html: emailHtml,
        reply_to: submission.email,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
