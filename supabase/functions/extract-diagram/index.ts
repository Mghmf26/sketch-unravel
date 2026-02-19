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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
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
- Example: If XOR-2 has "Yes" going to 4 different interface nodes, that's 4 separate connections:
  * XOR-2 → Interface-A (Yes)
  * XOR-2 → Interface-B (Yes)  
  * XOR-2 → Interface-C (Yes)
  * XOR-2 → Interface-D (Yes)
- If XOR-2 has "No" going to End, that's a 5th connection:
  * XOR-2 → End (No)

### CRITICAL: Connect nodes to the CORRECT XOR
- When there are MULTIPLE XOR gateways in a diagram, each node connects to the XOR that its arrow ACTUALLY touches
- Do NOT connect a node to a distant XOR just because they're in the same horizontal line
- TRACE the arrow line from the node and see EXACTLY which XOR circle it enters
- A node upstream of XOR-1 connects to XOR-1, NOT to XOR-2 (unless an arrow goes directly from that node to XOR-2)

### General rules:
- Input interfaces (LEFT side) have arrows FROM them TO in-scope steps
- In-scope steps connect to output interfaces (RIGHT side)
- Arrows can BEND or follow L-shaped paths — follow them to their TRUE endpoints
- Do NOT invent connections. Only report arrows you can actually SEE

## EXAMPLE

Diagram: [A] → [B] → [XOR-1 "Q1?"] —No→ [XOR-2 "Q2?"] —No→ [End], —Yes→ [C]
                                       —Yes→ [D]

Correct connections:
- A → B (no label)
- B → XOR-1 (no label)  
- XOR-1 → XOR-2 (No)     ← Note: XOR-1's "No" goes to XOR-2
- XOR-1 → D (Yes)         ← Note: XOR-1's "Yes" goes to D
- XOR-2 → End (No)        ← Note: XOR-2's "No" goes to End
- XOR-2 → C (Yes)         ← Note: XOR-2's "Yes" goes to C

WRONG: B → XOR-2 (B connects to XOR-1, not XOR-2!)

## OUTPUT FORMAT

Return ONLY valid JSON, no markdown, no explanation:
{
  "processId": "string",
  "processName": "string",
  "nodes": [{"id": "string", "label": "string", "type": "in-scope|interface|event|xor"}],
  "connections": [{"source": "string", "target": "string", "label": "string"}]
}

## FINAL VERIFICATION — For each connection:
1. Can I see an actual arrow line between these two nodes? (If not, REMOVE it)
2. Does the arrow physically touch/enter BOTH the source and target nodes? (If not, find the correct endpoints)
3. Is the arrowhead pointing at the target? (If not, swap source and target)
4. For XOR connections: Is this node connected to the NEAREST XOR in the flow, or am I accidentally connecting it to a further XOR?`;

    // Use two-pass: first extract, then validate
    const userPrompt = `Carefully analyze this EPC business process diagram. 

Step 1: Identify ALL nodes — scan the entire image systematically from left to right, top to bottom. Count and list every colored shape you see.

Step 2: Trace EVERY arrow — for each arrow, identify exactly which two nodes it connects and which direction the arrowhead points. Be very precise about arrow direction.

Step 3: Return the complete JSON with all nodes and all connections.

IMPORTANT: Pay extra attention to arrows around XOR gateways. Each XOR typically has arrows coming IN from one or more nodes, and arrows going OUT to two or more nodes (Yes/No branches). Make sure you get the direction right — arrows go INTO the XOR from upstream nodes, and OUT FROM the XOR to downstream nodes.`;

    // Strip the data URI prefix to get raw base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          parts: [
            { text: userPrompt },
            { inlineData: { mimeType: 'image/png', data: base64Data } },
          ],
        }],
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
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
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
