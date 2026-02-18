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
   - Main business process steps of the CURRENT business process
   - GREEN filled background with text labels inside
   - Often have a process ID displayed ABOVE or NEAR the shape (e.g., "CP-060-020")

2. **"interface"** (WHITE pentagon/chevron/arrow-shaped boxes)
   - Interfaces to OTHER business processes
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

## ARROW/CONNECTION TRACING — CRITICAL

This is the most important part. You MUST trace each arrow precisely:

1. **Find the arrowhead** (the pointed triangle at one end of the line)
2. **The node at the arrowhead end is the TARGET**
3. **The node at the other end (no arrowhead) is the SOURCE**
4. **source → target** (follow the arrowhead direction)

COMMON PATTERNS to watch for:
- Input interfaces (LEFT side) have arrows going FROM them TO in-scope steps: source=interface, target=in-scope
- In-scope steps connect to output interfaces (RIGHT side): source=in-scope, target=interface  
- XOR gateways receive input and split into Yes/No branches
- Multiple nodes can feed INTO a single XOR (converging)
- A single XOR can feed OUT TO multiple nodes (diverging)
- Arrows can BEND or follow L-shaped/curved paths — follow them to their TRUE endpoints
- An arrow going RIGHT from node A, then DOWN, then RIGHT to node B means: source=A, target=B

IMPORTANT: Do NOT invent connections that don't exist. Only report arrows you can actually SEE in the diagram. If two nodes are near each other but no arrow connects them, do NOT create a connection.

## EXAMPLE

For a simple diagram with: [Interface A] → [Process B] → [XOR "Question?"] —Yes→ [Interface C], —No→ [End]

The correct output would be:
{
  "nodes": [
    {"id": "A", "label": "Interface A", "type": "interface"},
    {"id": "B", "label": "Process B", "type": "in-scope"},
    {"id": "XOR-1", "label": "Question?", "type": "xor"},
    {"id": "C", "label": "Interface C", "type": "interface"},
    {"id": "END", "label": "End", "type": "event"}
  ],
  "connections": [
    {"source": "A", "target": "B", "label": ""},
    {"source": "B", "target": "XOR-1", "label": ""},
    {"source": "XOR-1", "target": "C", "label": "Yes"},
    {"source": "XOR-1", "target": "END", "label": "No"}
  ]
}

## OUTPUT FORMAT

Return ONLY valid JSON, no markdown, no explanation:
{
  "processId": "string",
  "processName": "string",
  "nodes": [{"id": "string", "label": "string", "type": "in-scope|interface|event|xor"}],
  "connections": [{"source": "string", "target": "string", "label": "string"}]
}

## FINAL VERIFICATION — Check each connection:
For EACH connection you output, verify:
1. Can I see an actual arrow line between these two nodes?
2. Is the arrowhead pointing at the target node?
3. Is the source the node where the line originates (no arrowhead)?
If any answer is "no", fix or remove that connection.`;

    // Use two-pass: first extract, then validate
    const userPrompt = `Carefully analyze this EPC business process diagram. 

Step 1: Identify ALL nodes — scan the entire image systematically from left to right, top to bottom. Count and list every colored shape you see.

Step 2: Trace EVERY arrow — for each arrow, identify exactly which two nodes it connects and which direction the arrowhead points. Be very precise about arrow direction.

Step 3: Return the complete JSON with all nodes and all connections.

IMPORTANT: Pay extra attention to arrows around XOR gateways. Each XOR typically has arrows coming IN from one or more nodes, and arrows going OUT to two or more nodes (Yes/No branches). Make sure you get the direction right — arrows go INTO the XOR from upstream nodes, and OUT FROM the XOR to downstream nodes.`;

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
              { type: 'text', text: userPrompt },
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
