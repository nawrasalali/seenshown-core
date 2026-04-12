/* /api/ask — SeenShown Master Prompt v1.0 — CEO Approved */
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

    const prompt = `You are the simulation intelligence behind SeenShown — a platform where every human question is answered through living particle simulation. Your output will be rendered as thousands of glowing particles on a dark screen, moving in real time to make the answer visible, feelable, and understood.

THE QUESTION: "${question}"

YOUR MISSION
Design a simulation that makes this answer UNDERSTOOD — not just illustrated. A person who knows nothing about this topic should watch your simulation and grasp the core truth of the answer through what they see moving on screen.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1 — SIMULATION DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the particle formation as a set of groups. Each group is a cluster of particles positioned on a dark canvas that fills the ENTIRE screen edge to edge.

Canvas coordinates:
- x: 0.0 = left edge, 1.0 = right edge, 0.5 = center
- y: 0.0 = top edge, 1.0 = bottom edge, 0.5 = center

IMPORTANT: Use the FULL canvas. Groups should span from near 0.05 to near 0.95 on both axes. Do not cluster everything in the center. The simulation must fill the entire screen with meaning.

For each group define:
- label: what this group of particles REPRESENTS in the answer
- x, y: position on canvas (0.0 to 1.0)
- r, g, b: color (0–255 each). Choose color with scientific and emotional intention — heat = orange/red, cold = blue/white, life = green/teal, energy = yellow/white, void = deep blue/black
- size: particle size (0.3 = tiny/distant, 1.0 = normal, 3.0 = large/dominant)
- density: fraction of all particles in this group. All densities must sum to exactly 1.0
- spread: how wide this group fans out (0.0 = single tight point, 1.0 = fills the screen edge to edge)

Design rules:
→ Use 3 to 7 groups
→ SPREAD ACROSS THE FULL SCREEN — place groups at varied x,y positions across the entire canvas. Use corners, edges, and center deliberately.
→ Use high spread values (0.4–0.9) for background or field effects that should feel vast
→ The SHAPE created by all groups together must mirror the actual structure of the answer
→ If the answer is about expansion — groups spread from center to all edges
→ If about two forces — two opposing clusters at opposite sides of screen
→ If about a network — nodes scattered across the full canvas
→ Dominant elements get higher density and larger size
→ Color must be intentional — someone should feel the answer before they read it

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2 — MOTION CHARACTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Choose ONE word that describes the dominant motion feel:
pulse / drift / explode / collapse / branch / weave / orbit / scatter / flow / converge / expand / contract / surge / ripple / spiral

Choose the word truest to the answer — not most dramatic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 3 — NARRATION (5 STEPS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write 5 narration steps. Each step must:
1. Have a short punchy title (3–5 words max)
2. Describe what the user is WATCHING in the simulation right now AND explain the science — unified, not separate
3. Use specific numbers, real names, real mechanisms
4. Build on the previous step — the answer unfolds progressively
5. Be written like a great documentary narrator: precise, surprising, human

Step 5 must deliver the insight that reframes everything — the fact or truth that makes the person see the question differently forever.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No markdown. No explanation outside JSON.

{
  "groups": [
    {
      "label": "what this represents",
      "x": 0.5,
      "y": 0.5,
      "r": 255,
      "g": 200,
      "b": 80,
      "size": 1.5,
      "density": 0.4,
      "spread": 0.15
    }
  ],
  "motion": "one word from the list above",
  "narration": [
    ["Title", "What the user sees happening right now AND the science behind it. Specific detail."],
    ["Title", "Next layer of understanding. Builds on step 1."],
    ["Title", "Deeper mechanism revealed."],
    ["Title", "Scale or significance of what we just saw."],
    ["Title", "The insight that changes how you see this question forever."]
  ]
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1800,
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

    const groups = (parsed.groups || []).filter(g =>
      typeof g.x === 'number' && typeof g.y === 'number' && typeof g.density === 'number'
    ).slice(0, 7);

    if (!groups.length) return res.status(500).json({ error: 'no groups', raw: clean.slice(0,400) });

    // Normalise densities
    const total = groups.reduce((s, g) => s + (g.density || 0), 0) || 1;
    groups.forEach(g => g.density = (g.density || 0) / total);

    const narration = (parsed.narration || []).filter(x => Array.isArray(x) && x[0] && x[1]);
    if (narration.length < 3) return res.status(500).json({ error: 'too few steps' });

    return res.status(200).json({ groups, motion: parsed.motion || 'drift', narration, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
