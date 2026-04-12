/* /api/ask — SeenShown v5.0 — Sonnet for quality simulation */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'No API key' });

    const prompt = `You are the simulation director for SeenShown. A human asked: "${question}"

Design a 5-step particle simulation that shows the REAL PROCESS visually. Each step is a scene where particles show actual biological/physical/chemical actors doing real things to each other.

THE ACTORS: First identify the 2-4 main physical entities in this process. Give each a consistent position, colour, and role across all 5 steps. Show them INTERACTING — moving toward each other, merging, separating, changing.

CANVAS: x=0.0(left) to 1.0(right), y=0.0(top) to 1.0(bottom)

STORYTELLING RULES:
- The same actor keeps its colour across all steps but changes position/size as it acts
- Show MOVEMENT by changing an actor's x,y between steps (bacteria start at edges, move to center by step 3)
- Show TRANSFORMATION by changing colour (healthy cell green → infected red-green → dead dark)
- Show SCALE by changing density and size (growing = larger size and density, dying = smaller and dimmer)
- Background field = one large spread group (spread 0.7-0.9) showing the environment (extracellular fluid, bloodstream, space, etc.)

COLOUR MEANINGS (be consistent):
- Healthy cell/tissue: r:50, g:200, b:100 (green)
- Pathogen/threat: r:220, g:30, b:30 (red)  
- Neuron/electrical: r:60, g:160, b:255 (blue)
- Dream/memory: r:160, g:60, b:255 (purple)
- Energy/signal: r:255, g:180, b:30 (gold)
- Immune cell: r:255, g:255, b:200 (white-gold)
- Dead/damaged: r:80, g:20, b:20 (dark red)
- Sleep state: r:20, g:20, b:80 (deep blue)
- Environment/fluid: r:10, g:15, b:30 (near black)

SPREAD:
- Distinct object (cell, bacterium, nucleus): 0.05-0.12
- Loose cloud (group of cells, wave): 0.15-0.25  
- Field/environment/fluid: 0.6-0.9

EXAMPLE — "How do bacteria attack cells":
Step 1 (Before Attack): Cell at center (0.5,0.45) green spread:0.13. 4 bacteria at corners spread:0.05. Dark fluid background spread:0.85.
Step 2 (Bacteria Approach): Same cell. Bacteria now at (0.25,0.3),(0.75,0.3),(0.25,0.7),(0.75,0.7) — closer to cell.
Step 3 (Membrane Contact): Bacteria at (0.38,0.38),(0.62,0.38),(0.38,0.62),(0.62,0.62) — touching cell edge. Cell slightly darker.
Step 4 (Invasion): Bacteria now INSIDE cell position (0.5,0.45). Cell colour shifts to dark red-green. Cell spread increases (fragmenting).
Step 5 (Immune Response): White immune cells arrive from top (0.2,0.1),(0.5,0.05),(0.8,0.1). Bacteria shrinking. Cell still damaged.

NARRATION — each step description must say: "Watch [specific visual thing happening]. This is [scientific name] — [real number or mechanism]."

Return ONLY this JSON:
{
  "steps": [
    {
      "title": "3-5 word action title",
      "description": "Watch [what is literally visible on screen right now]. This is [scientific term] — [real mechanism with numbers].",
      "groups": [
        {"label": "actor name", "x": 0.5, "y": 0.5, "r": 50, "g": 200, "b": 100, "size": 3.0, "density": 0.4, "spread": 0.12},
        {"label": "environment", "x": 0.5, "y": 0.5, "r": 10, "g": 15, "b": 30, "size": 0.3, "density": 0.2, "spread": 0.85}
      ],
      "motion": "drift"
    }
  ]
}

motion: pulse/drift/explode/collapse/converge/scatter/flow/surge`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) return res.status(502).json({ error: 'Claude error', status: r.status });

    const data = await r.json();
    const raw = (data.content?.[0]?.text || '').trim();
    const clean = raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch(e) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) {
        return res.status(500).json({ error: 'parse failed', raw: clean.slice(0,400) });
      }
      else return res.status(500).json({ error: 'no JSON', raw: clean.slice(0,400) });
    }

    const steps = (parsed.steps || []).filter(s =>
      s.title && s.description && Array.isArray(s.groups) && s.groups.length > 0
    ).slice(0, 5);

    if (steps.length < 3) return res.status(500).json({ error: 'too few steps', got: steps.length });

    steps.forEach(step => {
      const total = step.groups.reduce((s, g) => s + (g.density || 0), 0) || 1;
      step.groups.forEach(g => g.density = (g.density || 0) / total);
      step.groups = step.groups.filter(g =>
        typeof g.x === 'number' && typeof g.y === 'number'
      ).slice(0, 8);
    });

    const narration = steps.map(s => [s.title, s.description]);
    const simSteps = steps.map(s => ({ groups: s.groups, motion: s.motion || 'drift' }));

    return res.status(200).json({ narration, simSteps, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
