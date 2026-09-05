import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const auditId = body.auditId;

    if (!auditId) throw new Error("auditId is required");

    const { data: audit, error: auditError } = await supabase
      .from("waste_audits")
      .select("*")
      .eq("id", auditId)
      .maybeSingle();
    if (auditError) throw new Error(`Failed to fetch audit: ${auditError.message}`);
    if (!audit) throw new Error("Audit not found");

    const { data: streams, error: streamsError } = await supabase
      .from("waste_streams")
      .select("*")
      .in("id", audit.selected_waste_streams.map((s: any) => s.id));
    if (streamsError) throw new Error(`Failed to fetch waste streams: ${streamsError.message}`);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const streamsInfo = streams.map((s: any) => {
      const custom = audit.selected_waste_streams.find((cs: any) => cs.id === s.id);
      return `- Name: ${s.name}\n  EWC Code: ${s.ewc_code}\n  Description: ${s.description}\n  Container: ${s.container_type}\n  Colour: ${s.colour_code}\n  Hazardous Properties: ${s.hazardous_properties}\n  Disposal Route: ${s.disposal_route}\n  Estimated Annual Volume: ${custom?.estimated_volume || "Not specified"}\n  Is Hazardous: ${s.is_hazardous}`;
    }).join("\n\n");

    const prompt = `You are a clinical waste compliance expert for MediWaste, producing pre-acceptance waste audits for healthcare practices in the UK. Your task is to generate a comprehensive pre-acceptance waste audit document.

CLIENT DETAILS:
- Practice Name: ${audit.practice_name || "Not specified"}
- Legal Entity: ${audit.legal_entity || "Not specified"}
- Address: ${audit.address || "Not specified"}
- Practice Type: ${audit.practice_type || "Not specified"}
- Services Provided: ${audit.services_provided || "Not specified"}
- Number of Surgeries: ${audit.number_of_surgeries || "Not specified"}
- Number of Staff: ${audit.number_of_staff || "Not specified"}
- Amalgam Use: ${audit.amalgam_use || "Not specified"}

WASTE STREAMS IDENTIFIED:
${streamsInfo}

Generate a detailed audit report following this exact structure:

1. PRACTICE & SITE DETAILS
   - Practice Information table (Practice Name, Legal Entity, Address, Practice Type, Services, Number of Surgeries, Number of Staff, Amalgam Use)
   - Functional Areas & Waste Generation Points table (Area, Description, Waste Types Generated) — describe typical areas for this type of practice

2. WASTE STREAMS IDENTIFIED
   - Summary of Waste Streams table (Waste Stream, EWC Code, Container, Colour Code, Estimated Annual Volume)

3. DETAILED WASTE STREAM ASSESSMENT
   - For EACH waste stream, create a subsection with a table containing: EWC Code, Description, Physical Form, Hazardous Properties, Container, Packaging, Storage, Estimated Weight, Disposal Route, Segregation Controls, and Audit Findings (with a compliance status emoji: ✅ or ⚠️)

4. SEGREGATION & STORAGE OBSERVATIONS
   - Segregation Practices table (Observation, Status, Action Required)
   - Storage Arrangements table (Observation, Status, Action Required)
   - Staff Training table (Observation, Status, Action Required)

5. WASTE CLASSIFICATION & CODING
   - EWC Codes Used table (EWC Code, Description, Applicable to Practice?)

6. COMPLIANCE & RECOMMENDATIONS
   - Summary of Compliance table (Area, Compliance Status)
   - Recommendations table (Recommendation, Priority, Action Owner)

7. AUDITOR DECLARATION
   - Auditor Name, Job Title, Signature placeholder, Date

8. PRACTICE DECLARATION
   - Practice Representative Name, Job Title, Signature placeholder, Date

Use a professional, clear tone compliant with UK regulations (HTM 07-01, Hazardous Waste Regulations 2005, Environmental Protection Act 1990).

Return the content as a structured JSON object with these keys:
{
  "practice_details": { "info_table": [["Item","Detail"],...], "functional_areas_table": [["Area","Description","Waste Types Generated"],...] },
  "waste_streams_summary": [["Waste Stream","EWC Code","Container","Colour Code","Estimated Annual Volume"],...],
  "detailed_assessment": [ { "name": "stream name", "table": [["Attribute","Detail"],...], "findings": "text" }, ... ],
  "segregation_storage": { "segregation_table": [...], "storage_table": [...], "training_table": [...] },
  "classification": [["EWC Code","Description","Applicable?"],...],
  "compliance": { "summary_table": [...], "recommendations_table": [...] },
  "auditor_declaration": { "name": "", "title": "", "signature": "", "date": "" },
  "practice_declaration": { "name": "", "title": "", "signature": "", "date": "" }
}

Each table is an array of arrays (rows). The first row is always the header row.`;

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a clinical waste compliance expert for MediWaste, a UK clinical waste disposal company. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      throw new Error(`OpenAI API error: ${openaiResp.status} - ${errText}`);
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    const { error: updateError } = await supabase
      .from("waste_audits")
      .update({
        ai_generated_content: parsed,
        admin_edited_content: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auditId);
    if (updateError) throw new Error(`Failed to save draft: ${updateError.message}`);

    await supabase.from("waste_audit_logs").insert({
      audit_id: auditId,
      action: "draft_generated",
      details: "AI generated draft content",
    });

    return new Response(
      JSON.stringify({ success: true, content: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Generate audit draft error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
