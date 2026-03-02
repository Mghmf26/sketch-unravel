import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processes, risks, controls, incidents, regulations, mfImports, mfQuestions } = await req.json();

    const prompt = `You are a senior mainframe risk and business process consultant. Analyze the following data and produce a structured JSON report with exactly 4 sections. Each section must have: title, badge, badgeVariant (one of: default, secondary, destructive, outline), and items (array of 4 actionable insight strings).

The 4 sections must be:
1. "Cost Reduction Opportunities" (badge: "HIGH IMPACT", badgeVariant: "default") — identify process consolidation, control automation, and data pipeline optimizations.
2. "Revenue & Value Optimization" (badge: "STRATEGIC", badgeVariant: "secondary") — identify service model opportunities, compliance-as-a-service, and SLA improvements.
3. "Risk Mitigation & Control Gaps" (badge based on severity: if critical incidents exist use "CRITICAL"/"destructive", otherwise "MODERATE"/"outline") — identify high risks, control gaps, compliance issues, and cross-process correlations.
4. "AI-Recommended Next Steps" (badge: "ACTIONABLE", badgeVariant: "outline") — provide concrete next actions based on data maturity.

DATA CONTEXT:
- Business Processes (${processes.length}): ${JSON.stringify(processes.slice(0, 10).map((p: any) => ({ name: p.process_name, department: p.department, owner: p.owner })))}
- Risks (${risks.length}): ${JSON.stringify(risks.slice(0, 15).map((r: any) => ({ description: r.description, likelihood: r.likelihood, impact: r.impact })))}
- Controls (${controls.length}): ${JSON.stringify(controls.slice(0, 15).map((c: any) => ({ name: c.name, type: c.type, effectiveness: c.effectiveness })))}
- Incidents (${incidents.length}): ${JSON.stringify(incidents.slice(0, 10).map((i: any) => ({ title: i.title, severity: i.severity, status: i.status })))}
- Regulations (${regulations.length}): ${JSON.stringify(regulations.slice(0, 10).map((r: any) => ({ name: r.name, compliance_status: r.compliance_status, authority: r.authority })))}
- Mainframe Imports (${mfImports.length}): ${JSON.stringify(mfImports.slice(0, 10).map((m: any) => ({ source_name: m.source_name, source_type: m.source_type, dataset_name: m.dataset_name })))}
- MF Q&A (${mfQuestions.length}): ${JSON.stringify(mfQuestions.slice(0, 5).map((q: any) => ({ question: q.question, category: q.category })))}

Respond ONLY with a valid JSON array of 4 section objects. No markdown, no code fences.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a mainframe risk consultant AI. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response, handling potential markdown code fences
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    const sections = JSON.parse(cleaned);

    return new Response(JSON.stringify({ sections }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating AI report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
