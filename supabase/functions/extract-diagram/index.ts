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
      return new Response(JSON.stringify({ error: 'Lovable API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert at analyzing EPC (Event-driven Process Chain) business process diagrams from images.

Your task: Extract EVERY SINGLE node and EVERY SINGLE connection (arrow) from the diagram with 100% completeness and accuracy.

## NODE TYPES — Color & Shape Guide

1. **"in-scope"** (GREEN rounded rectangles)
   - These are STEPS — the actual process steps of the CURRENT business process
   - GREEN filled background with text labels inside
   - Often have a process ID displayed ABOVE or NEAR the shape (e.g., "CP-060-020")

2. **"interface"** (WHITE pentagon/chevron/arrow-shaped boxes)
   - These are PROCESS INTERFACES — they represent OTHER business processes that interact with this one
   - Some are INPUTS (arrows flow FROM them INTO steps) — typically on the LEFT side
   - Some are OUTPUTS (arrows flow FROM steps INTO them) — typically on the RIGHT side
   - WHITE or very light colored with a distinctive pointed/folded edge (pentagon or chevron shape)
   - Have IDs like "CP-010", "CP-030", "CP-050"
   - The SAME interface ID can appear multiple times. If so, give each a unique ID (e.g., "CP-050-left", "CP-050-right")

3. **"event"** (PINK/MAGENTA hexagonal shapes)
   - Events — typically "Start" or "End"
   - PINK or MAGENTA color, hexagonal shape

4. **"xor"** (BLUE/LIGHT BLUE circles with "XOR" text)
   - Exclusive decision gateways
   - CIRCULAR shapes filled with LIGHT BLUE / CYAN
   - Contain text "XOR" inside
   - A QUESTION/DECISION LABEL is positioned NEAR the circle — use it as the node label
   - Have MULTIPLE outgoing arrows labeled "Yes" and "No"
   - Generate IDs like "XOR-1", "XOR-2" if no explicit ID

5. **"start-end"** (Oval/pill shapes) - Start or End terminators
6. **"decision"** (Diamond shapes) - Decision points
7. **"storage"** (Triangle shapes) - Storage/inventory
8. **"delay"** (D-shapes / half-circles) - Delay or wait steps
9. **"document"** (Rectangle with wavy bottom) - Document outputs

## ARROW/CONNECTION TRACING — CRITICAL

This is the most important part. You MUST trace each arrow VISUALLY along its full path.

### How to trace an arrow:
1. Start at one end of a line/arrow
2. Follow the line pixel by pixel — it may go straight, bend at right angles, or curve
3. Find where the ARROWHEAD (triangle) is — that end is the TARGET
4. The other end (where the line starts, no arrowhead) touches the SOURCE node
5. Record: source → target

### XOR GATEWAY PATTERNS — Pay extra attention:
- An XOR gateway is a DECISION POINT. It has:
  * ONE or MORE arrows coming IN (from upstream nodes)
  * TWO or MORE arrows going OUT (the Yes/No decision branches)
- Each OUTGOING arrow from an XOR is an INDEPENDENT connection

### CRITICAL: Connect nodes to the CORRECT XOR
- When there are MULTIPLE XOR gateways in a diagram, each node connects to the XOR that its arrow ACTUALLY touches
- TRACE the arrow line from the node and see EXACTLY which XOR circle it enters

### General rules:
- Input interfaces (LEFT side) have arrows FROM them TO in-scope steps
- In-scope steps connect to output interfaces (RIGHT side)
- Arrows can BEND or follow L-shaped paths — follow them to their TRUE endpoints
- Do NOT invent connections. Only report arrows you can actually SEE

## OUTPUT FORMAT

Return ONLY valid JSON, no markdown, no explanation:
{
  "processId": "string",
  "processName": "string",
  "nodes": [{"id": "string", "label": "string", "type": "in-scope|interface|event|xor|start-end|decision|storage|delay|document"}],
  "connections": [{"source": "string", "target": "string", "label": "string"}]
}

## FINAL VERIFICATION — For each connection:
1. Can I see an actual arrow line between these two nodes? (If not, REMOVE it)
2. Does the arrow physically touch/enter BOTH the source and target nodes? (If not, find the correct endpoints)
3. Is the arrowhead pointing at the target? (If not, swap source and target)
4. For XOR connections: Is this node connected to the NEAREST XOR in the flow, or am I accidentally connecting it to a further XOR?`;

    const userPrompt = `Carefully analyze this EPC business process diagram. 

Step 1: Identify ALL nodes — scan the entire image systematically from left to right, top to bottom.
Step 2: Trace EVERY arrow — for each arrow, identify exactly which two nodes it connects and which direction the arrowhead points.
Step 3: Return the complete JSON with all nodes and all connections.

IMPORTANT: Pay extra attention to arrows around XOR gateways.`;

    // Strip the data URI prefix to get raw base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const imageDataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${base64Data}`;

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
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageDataUrl } },
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
    
    // Extract JSON from the response
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
