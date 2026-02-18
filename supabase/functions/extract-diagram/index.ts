import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert at analyzing EPC (Event-driven Process Chain) business process diagrams.
Given an image of a diagram, extract ALL nodes and connections with COMPLETE accuracy. Do NOT miss any element.

CRITICAL NODE TYPES - identify every single one:
1. "in-scope" — GREEN filled rounded rectangles. These are main process steps. They have green background with text labels and often an ID above them (e.g., "CP-060-020").
2. "interface" — WHITE or light-colored pentagon/arrow-shaped boxes. These are interface or external process steps. They typically have a folded or pointed edge (like a chevron/pentagon shape). They also have IDs (e.g., "CP-010", "CP-030", "CP-050").
3. "event" — PINK or MAGENTA hexagonal shapes. These represent Start or End events. Look for "Start", "End", or similar labels.
4. "xor" — BLUE/CYAN circles containing the text "XOR". These are exclusive decision gateways. They are CIRCULAR shapes with a light blue fill. There is often a question/label NEAR the XOR circle (e.g., "Do Plans Require Updating?") — capture that as the XOR node's label.

For each node provide:
- id: The node ID shown in the diagram (e.g., "CP-060-020"). For XOR nodes without a visible ID, generate one like "XOR-1", "XOR-2", etc.
- label: The full text label. For XOR nodes, use the nearby question text as the label (e.g., "Do Plans Require Updating?").
- type: One of exactly: "in-scope", "interface", "event", "xor"

For each connection (arrow/line), identify:
- source: The ID of the source node where the arrow STARTS
- target: The ID of the target node where the arrow ENDS
- label: Any label on the arrow itself (e.g., "Yes", "No"), or empty string if none. XOR gateways typically have "Yes"/"No" on their outgoing arrows.

Also extract:
- processId: The main process ID (e.g., "CP-060" or "AL-020")
- processName: The process name if visible, or derive from context

Return ONLY valid JSON in this exact format, no other text:
{
  "processId": "string",
  "processName": "string",
  "nodes": [{"id": "string", "label": "string", "type": "in-scope|interface|event|xor"}],
  "connections": [{"source": "string", "target": "string", "label": "string"}]
}

IMPORTANT RULES:
- Extract EVERY node visible in the diagram, including ALL XOR gateway circles
- Extract EVERY arrow/connection, including those with Yes/No labels
- Pay careful attention to arrow DIRECTION (which end has the arrowhead)
- A single XOR gateway can have MULTIPLE outgoing connections
- Do NOT skip any nodes even if they appear small or are at the edges of the diagram
- Interface nodes (white pentagons) that appear multiple times with the same ID should each be listed separately if they have different labels`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this EPC business process diagram and extract all nodes and connections. Return only the JSON.' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to analyze image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-diagram error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
