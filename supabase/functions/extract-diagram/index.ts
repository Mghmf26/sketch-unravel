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

    const systemPrompt = `You are an expert at analyzing EPC (Event-driven Process Chain) business process diagrams from images.

Your task: Extract EVERY SINGLE node and EVERY SINGLE connection (arrow) from the diagram with 100% completeness and accuracy.

## NODE TYPES — Color & Shape Guide

1. **"in-scope"** (GREEN rounded rectangles)
   - These are the main business process steps of the CURRENT business process
   - They have a GREEN filled background with text labels inside
   - They often have a process ID displayed ABOVE or NEAR the shape (e.g., "CP-060-020", "AL-020-010")
   - Extract both the ID and the label text inside the shape

2. **"interface"** (WHITE pentagon/chevron/arrow-shaped boxes)
   - These represent INTERFACES to OTHER business processes (not the current one)
   - They are WHITE or very light colored with a distinctive pointed/folded edge shape (pentagon or chevron)
   - They have IDs like "CP-010", "CP-030", "CP-050"
   - IMPORTANT: Their role depends on arrow direction:
     * If arrows point FROM this node → it's an INPUT process (usually on the LEFT side)
     * If arrows point TO this node → it's an OUTPUT process (usually on the RIGHT side)  
     * Some appear in the MIDDLE as supporting/linked processes with arrows going both directions
   - The SAME interface ID can appear multiple times in the diagram (e.g., "CP-050" may appear on both left and right sides). List each occurrence as a separate node with a unique ID suffix like "CP-050-input" and "CP-050-output", or use the label to differentiate.

3. **"event"** (PINK/MAGENTA hexagonal shapes)
   - These represent events — typically "Start" or "End" events
   - They have a distinctive PINK or MAGENTA color and hexagonal shape
   - Common labels: "Start", "End"

4. **"xor"** (BLUE/LIGHT BLUE circles with "XOR" text)
   - These are EXCLUSIVE decision gateways (XOR splits/joins)
   - They are CIRCULAR shapes filled with LIGHT BLUE / CYAN color
   - They contain the text "XOR" inside
   - CRITICAL: There is usually a QUESTION or DECISION LABEL positioned NEAR the XOR circle (above, below, or beside it), e.g., "Do Plans Require Updating?" or "Does The Budget Require Updating?"
   - Use that nearby question as the node's label
   - XOR gateways have MULTIPLE outgoing arrows, typically labeled "Yes" and "No"
   - Generate IDs like "XOR-1", "XOR-2", etc. if no explicit ID is shown

## CONNECTION RULES

For EVERY arrow/line in the diagram:
- **source**: The node ID where the arrow ORIGINATES (where the line starts, without arrowhead)
- **target**: The node ID where the arrow POINTS TO (where the arrowhead is)
- **label**: Text written ON or NEAR the arrow line (e.g., "Yes", "No"), or empty string ""

CRITICAL connection rules:
- Follow the ARROWHEAD direction precisely — source is where it starts, target is where it points
- XOR gateways typically have 2+ outgoing arrows labeled "Yes" and "No"
- A single node can have MULTIPLE incoming and MULTIPLE outgoing connections
- Arrows can be horizontal, vertical, or diagonal — trace ALL of them
- Some arrows may bend/curve — follow them to their actual endpoints

## OUTPUT FORMAT

Return ONLY valid JSON, no markdown, no explanation:
{
  "processId": "string (the main process ID, e.g. CP-060)",
  "processName": "string (the process name if visible)",
  "nodes": [
    {"id": "string", "label": "string", "type": "in-scope|interface|event|xor"}
  ],
  "connections": [
    {"source": "string", "target": "string", "label": "string"}
  ]
}

## FINAL CHECKLIST — Verify before responding:
✓ Did I extract ALL green rectangles (in-scope)?
✓ Did I extract ALL white pentagon shapes (interfaces)?
✓ Did I extract ALL pink hexagons (events)?
✓ Did I extract ALL blue circles with XOR text (xor gateways)?
✓ Did I extract ALL arrows and their correct direction?
✓ Did I include Yes/No labels on XOR gateway arrows?
✓ Are arrow directions correct (source → arrowhead = target)?
✓ Did I capture the question/decision text near each XOR gateway?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
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
