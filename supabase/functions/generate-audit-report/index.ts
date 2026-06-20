import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AuditRequest {
  session_id: string;
}

function buildPrompt(session: any, answers: any): string {
  const wasteList = (answers.waste_streams || [])
    .map((w: any) => `${w.type}: ~${w.volume} ${w.unit}/month`)
    .join(", ");

  return `You are an expert UK clinical waste compliance consultant. Analyse the following clinical waste audit data and produce a professional audit report.

BUSINESS INFORMATION:
- Sector: ${session.sector}
- Business: ${session.business_name}
- Location: ${session.town || ""}${session.county ? ", " + session.county : ""}
- Staff: ${answers.staff_count || "Not specified"}
- Treatment rooms: ${answers.treatment_rooms || "N/A"}
- Sites: ${answers.sites_count || 1}

WASTE STREAMS PRODUCED:
${wasteList || "Not specified"}

CURRENT WASTE MANAGEMENT:
- Current contractor: ${answers.current_contractor || "None / Unknown"}
- Collection frequency: ${answers.collection_frequency || "Unknown"}
- Container types: ${(answers.container_types || []).join(", ") || "Not specified"}
- Segregation method: ${answers.segregation_method || "Unknown"}

STORAGE & COMPLIANCE:
- Storage location: ${answers.storage_location || "Not specified"}
- Storage conditions: ${answers.storage_conditions || "Not specified"}
- Waste policy in place: ${answers.has_waste_policy ? "Yes" : "No"}
- Staff trained: ${answers.staff_trained ? "Yes" : "No"}
- Last audit date: ${answers.last_audit_date || "Unknown / Never"}
- Compliance concerns: ${answers.compliance_concerns || "None stated"}

PAIN POINTS:
${(answers.pain_points || []).join(", ") || "None stated"}
${answers.pain_points_other ? "Additional: " + answers.pain_points_other : ""}

Additional notes: ${answers.additional_notes || "None"}

Respond ONLY with valid JSON in this exact structure:
{
  "executive_summary": "2-3 paragraph professional summary of the audit findings. Written for a healthcare business manager. UK English. Factual and direct.",
  "risk_rating": "low|medium|high|critical",
  "risk_score": 0-100,
  "compliance_risks": [
    {
      "title": "Risk title",
      "description": "Clear description of the compliance risk",
      "regulation": "Relevant UK regulation or guidance (e.g. Hazardous Waste Regulations 2005, HTM 07-01)",
      "severity": "low|medium|high|critical",
      "action": "Recommended action to mitigate this risk"
    }
  ],
  "waste_stream_breakdown": [
    {
      "waste_type": "Name of waste type",
      "ewc_code": "EWC code if applicable",
      "container": "Recommended container type",
      "frequency": "Suggested collection frequency",
      "notes": "Any specific handling or compliance notes"
    }
  ],
  "recommendations": [
    {
      "priority": "immediate|short_term|ongoing",
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "benefit": "Expected benefit of implementing this recommendation"
    }
  ],
  "report_summary_html": "A full HTML report body (use semantic HTML with h2, h3, p, table, ul tags). Include all sections: Executive Summary, Compliance Risks (as a styled table), Waste Stream Breakdown (as a table), Recommendations. Professional formatting. No inline styles needed."
}

IMPORTANT RULES:
- Base advice on HTM 07-01, Hazardous Waste Regulations 2005, Environmental Protection Act 1990, and Duty of Care.
- Never invent legal facts. Phrase advice as guidance.
- UK English spelling throughout.
- Write for non-technical healthcare managers.
- Keep risk assessments realistic — not every business is high risk.
- If waste streams are not specified, note this as a gap to address.`;
}

function fallbackReport(session: any, answers: any): any {
  const hasContractor = answers.current_contractor && answers.current_contractor !== "none";
  const hasTraining = answers.staff_trained;
  const hasPolicy = answers.has_waste_policy;
  const wasteCount = (answers.waste_streams || []).length;

  let score = 50;
  if (hasContractor) score -= 15;
  if (hasTraining) score -= 10;
  if (hasPolicy) score -= 10;
  if (wasteCount > 3) score += 15;
  if (!answers.last_audit_date || answers.last_audit_date === "never") score += 10;
  score = Math.max(10, Math.min(90, score));

  const rating = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

  return {
    executive_summary: `This audit summary has been generated for ${session.business_name || "your business"} based on the information provided. The audit identifies ${wasteCount} waste stream(s) and highlights areas for compliance improvement. As a ${session.sector || "healthcare"} business, you are subject to UK clinical waste regulations including HTM 07-01 and the Hazardous Waste Regulations 2005. We recommend reviewing the compliance risks below and contacting MediWaste for a tailored waste management solution.`,
    risk_rating: rating,
    risk_score: score,
    compliance_risks: [
      {
        title: "Duty of Care Documentation",
        description: "All businesses producing clinical waste must maintain waste transfer notes and consignment notes as required by the Environmental Protection Act 1990.",
        regulation: "Environmental Protection Act 1990 (Section 34)",
        severity: "high",
        action: "Ensure all waste movements are documented with appropriate transfer notes. MediWaste provides compliant documentation with every collection.",
      },
      ...(!hasTraining ? [{
        title: "Staff Training Gap",
        description: "Staff who handle clinical waste must receive appropriate training on segregation, containment, and safe handling procedures.",
        regulation: "HTM 07-01: Safe Management of Healthcare Waste",
        severity: "medium",
        action: "Implement a formal clinical waste training programme and maintain records of training completion.",
      }] : []),
      ...(!hasPolicy ? [{
        title: "Waste Management Policy",
        description: "A documented clinical waste management policy should be in place covering procedures, responsibilities, and emergency contacts.",
        regulation: "HTM 07-01 Section 3",
        severity: "medium",
        action: "Create and implement a written clinical waste management policy reviewed at least annually.",
      }] : []),
    ],
    waste_stream_breakdown: (answers.waste_streams || []).map((w: any) => ({
      waste_type: w.type,
      ewc_code: "18 01 03*",
      container: "Yellow-lidded container",
      frequency: answers.collection_frequency || "Monthly",
      notes: `Estimated volume: ${w.volume} ${w.unit}/month`,
    })),
    recommendations: [
      {
        priority: "immediate",
        title: "Request a Free Waste Audit from MediWaste",
        description: "MediWaste can conduct a full on-site waste audit and provide a compliant, cost-effective collection solution tailored to your business.",
        benefit: "Ensure full regulatory compliance and potentially reduce waste management costs.",
      },
      {
        priority: "short_term",
        title: "Review Waste Segregation Procedures",
        description: "Ensure all clinical waste is segregated at source using the correct colour-coded containers in line with HTM 07-01 guidance.",
        benefit: "Reduces risk of cross-contamination and potential regulatory penalties.",
      },
      {
        priority: "ongoing",
        title: "Maintain Waste Transfer Documentation",
        description: "Keep records of all waste transfer notes and consignment notes for at least 3 years.",
        benefit: "Demonstrates Duty of Care compliance and protects your business in the event of an Environment Agency inspection.",
      },
    ],
    report_summary_html: `<h2>Executive Summary</h2><p>This audit summary has been generated for <strong>${session.business_name || "your business"}</strong>. Based on the information provided, ${wasteCount} waste stream(s) have been identified. Please review the compliance risks and recommendations below.</p><h2>Key Findings</h2><p>Risk Rating: <strong>${rating.toUpperCase()}</strong> (${score}/100)</p>`,
  };
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
    const { session_id }: AuditRequest = await req.json();

    const { data: session, error: sessionErr } = await supabase
      .from("mw_audit_sessions")
      .select("*")
      .eq("id", session_id)
      .single();
    if (sessionErr || !session) throw new Error("Session not found");

    const { data: answers } = await supabase
      .from("mw_audit_answers")
      .select("*")
      .eq("session_id", session_id)
      .maybeSingle();

    // Mark report as generating
    await supabase.from("mw_audit_reports").upsert({
      session_id,
      generation_status: "generating",
    }, { onConflict: "session_id" });

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let reportData: any;
    let status = "complete";
    let tokensUsed = 0;

    if (openaiKey) {
      try {
        const prompt = buildPrompt(session, answers || {});
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
        const aiResult = await response.json();
        tokensUsed = aiResult.usage?.total_tokens || 0;
        reportData = JSON.parse(aiResult.choices[0].message.content);
      } catch (aiErr) {
        console.error("AI generation failed, using fallback:", aiErr);
        reportData = fallbackReport(session, answers || {});
        status = "fallback";
      }
    } else {
      reportData = fallbackReport(session, answers || {});
      status = "fallback";
    }

    const { error: reportErr } = await supabase.from("mw_audit_reports").upsert({
      session_id,
      executive_summary: reportData.executive_summary,
      compliance_risks: reportData.compliance_risks || [],
      waste_stream_breakdown: reportData.waste_stream_breakdown || [],
      recommendations: reportData.recommendations || [],
      risk_rating: reportData.risk_rating || "medium",
      risk_score: reportData.risk_score || 50,
      report_html: reportData.report_summary_html || "",
      ai_model: "gpt-4o-mini",
      ai_tokens_used: tokensUsed,
      generation_status: status,
      generated_at: new Date().toISOString(),
    }, { onConflict: "session_id" });

    if (reportErr) throw reportErr;

    // Mark session completed
    await supabase.from("mw_audit_sessions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", session_id);

    return new Response(JSON.stringify({ success: true, status, report: reportData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-audit-report error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
