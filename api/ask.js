/* /api/ask — SeenShown Master Prompt v2.0 — each step has its own simulation */
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

    const prompt = `You are the simulation intelligence behind SeenShown — a platform where every question becomes a living particle simulation that evolves as the answer unfolds.

THE QUESTION: "${question}"

YOUR MISSION
Design 5 sequential simulation stages. Each stage directly answers one part of "${question}" AND has its OWN unique particle formation that visually shows what is happening in that stage. As the user reads each step, the simulation transforms to match — the answer literally unfolds before their eyes.

CANVAS: full screen, x/y from 0.0 to 1.0 (0.0=left/top edge, 1.0=right/bottom edge, 0.5=center)

FOR EACH STEP, design particle groups that VISUALLY SHOW what that step describes:
- Step about separation → two groups drifting apart
- Step about explosion → groups spread from center to edges  
- Step about network → multiple small groups scattered across screen
- Step about collapse → groups converging to center
- Step about two competing forces → two opposing groups on opposite sides
- Step about growth → groups expanding outward
- ALWAYS fill the full screen — use the entire canvas, not just center

Each group:
- label: what it represents
- x, y: position 0.0-1.0 (USE FULL RANGE — place groups at edges, corners, spread wide)
- r, g, b: colour (0-255) — emotionally and scientifically chosen
- size: 0.3 (tiny) to 3.0 (dominant)  
- density: fraction of particles (all steps must sum to 1.0)
- spread: 0.0 (tight point) to 1.0 (fills screen) — use 0.5+ for background fields

NARRATION: Each step title is SHORT (3-5 words). Each description tells the user what they are WATCHING in the simulation right now AND the science. Specific numbers, real names, vivid language.

Step 5 delivers the most profound insight about "${question}" that reframes everything.

Return ONLY this JSON (no markdown):
{
  "steps": [
    {
      "title": "Short Step Title",
      "description": "What the user watches happening right now AND the science. Real numbers. 2-3 sentences.",
      "groups": [
        {"label": "what this is", "x": 0.5, "y": 0.5, "r": 255, "g": 200, "b": 80, "size": 2.0, "density": 0.4, "spread": 0.2},
        {"label": "what this is", "x": 0.2, "y": 0.8, "r": 80, "g": 160, "b": 255, "size": 1.0, "density": 0.6, "spread": 0.5}
      ],
      "motion": "one word: pulse/drift/explode/collapse/branch/weave/orbit/scatter/flow/converge/surge/ripple"
    }
  ]
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
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

    const steps = (parsed.steps || []).filter(s => s.title && s.description && Array.isArray(s.groups) && s.groups.length > 0).slice(0, 5);
    if (steps.length < 3) return res.status(500).json({ error: 'too few steps', got: steps.length });

    // Normalise densities per step
    steps.forEach(step => {
      const total = step.groups.reduce((s, g) => s + (g.density || 0), 0) || 1;
      step.groups.forEach(g => g.density = (g.density || 0) / total);
      step.groups = step.groups.filter(g => typeof g.x === 'number' && typeof g.y === 'number').slice(0, 7);
    });

    // Convert to narration format + keep groups per step
    const narration = steps.map(s => [s.title, s.description]);
    const simSteps = steps.map(s => ({ groups: s.groups, motion: s.motion || 'drift' }));

    return res.status(200).json({ narration, simSteps, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
