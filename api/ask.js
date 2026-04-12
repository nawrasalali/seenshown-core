/* /api/ask — SeenShown v6.0 — Real biological shapes */
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

Design a 5-step particle simulation using REAL BIOLOGICAL AND PHYSICAL SHAPES — not abstract blobs. The simulation must show the actual entities involved in this process in recognisable forms.

AVAILABLE SHAPES (use exact name in "shape" field):
BIOLOGY: brain, cell, bacterium, virus, neuron, dna, wave, heart, lung, bloodcell, mitochondria, synapse, protein
ASTRONOMY/PHYSICS: galaxy, blackhole, star, planet, atom, explosion, tornado, waterdrop, crystal, molecule, fireball, soundwave, lightwave, gravitywell, magneticfield, quantumcloud, plasma, lightning
EARTH: earth, mountain, volcano, oceanwave
CHEMISTRY: chemreaction
HUMAN/SOCIAL: human, crowd, network, tree
ABSTRACT: arrow, spiral, infinity, vortex, eye, barChart, pyramid

Pick the shapes that BEST REPRESENT the actual entities in your answer. If nothing fits, omit shape field.
- "brain" — human brain with two hemispheres and folds
- "cell" — animal cell with membrane, cytoplasm, and nucleus
- "bacterium" — rod-shaped bacterium with flagella
- "virus" — icosahedral virus with spike proteins
- "neuron" — neuron with soma, dendrites, and axon
- "heart" — human heart shape
- "dna" — DNA double helix
- "wave" — sinusoidal brain wave across screen

If no shape fits, omit the shape field (uses circular spread as fallback).

CANVAS: x=0.0(left) to 1.0(right), y=0.0(top) to 1.0(bottom), center=(0.5,0.5)

For "spread" when using a shape:
- The spread value controls the SIZE of the shape on screen
- 0.15 = small shape, 0.30 = medium, 0.50 = large fills screen, 0.70 = very large
- For background fields without a shape: spread 0.8-1.0

STORYTELLING — show the real process:
- Each step the actors MOVE (change x,y) to show them interacting
- Each step actors TRANSFORM (change colour/size) to show their state
- Bacteria: start at screen edges, move toward the cell each step
- Brain: show it changing state (bright=active, dim=sleeping, orange burst=REM)
- Cell: show it being invaded (green→mixed→dark red as bacteria enter)

COLOUR MEANINGS:
- Healthy: r:50,g:200,b:100 (green)
- Infected/diseased: r:200,g:40,b:40 (red)  
- Neural active: r:60,g:160,b:255 (blue)
- Neural sleeping: r:20,g:20,b:100 (deep blue)
- Memory/dream: r:160,g:60,b:255 (purple)
- Immune: r:255,g:240,b:180 (white-gold)
- Energy: r:255,g:180,b:30 (gold)
- Environment: r:8,g:12,b:25 (near black)

EXAMPLE for "how do bacteria attack cells":
Step 1: Large "cell" shape at center (0.5,0.5) green, spread:0.35. Four "bacterium" shapes at corners (0.08,0.08),(0.92,0.08),(0.08,0.92),(0.92,0.92) red, spread:0.08. Dark background no-shape spread:0.9.
Step 2: Same cell. Bacteria moved closer: (0.22,0.22),(0.78,0.22),(0.22,0.78),(0.78,0.78).
Step 3: Bacteria at cell edge: (0.35,0.35),(0.65,0.35),(0.35,0.65),(0.65,0.65). Cell starting to darken slightly.
Step 4: Bacteria INSIDE cell position (0.5,0.5). Cell colour now r:120,g:100,b:40 (compromised). Bacteria smaller.
Step 5: "cell" still damaged at center. Immune cells (no shape, white-gold) arriving from top edges.

FOR NON-BIOLOGICAL QUESTIONS (physics, emotions, economics, history, etc.):
Use group positions and colours to show the concept spatially:
- Two forces colliding: one group left (x:0.15) moving right, one group right (x:0.85) moving left
- Something spreading: one tight group at center step 1, spread to full screen by step 5  
- An emotion: colours that feel like the emotion, motion that mirrors the feeling
- A historical event: show scale with density, show change with colour shifts

Return ONLY this JSON:
{
  "steps": [
    {
      "title": "3-5 word action title",
      "description": "Watch [specific visible thing on screen]. This is [scientific name] — [real mechanism with numbers].",
      "groups": [
        {"label": "actor name", "shape": "cell", "x": 0.5, "y": 0.5, "r": 50, "g": 200, "b": 100, "size": 2.0, "density": 0.45, "spread": 0.35},
        {"label": "bacterium 1", "shape": "bacterium", "x": 0.08, "y": 0.08, "r": 220, "g": 30, "b": 30, "size": 1.2, "density": 0.12, "spread": 0.08},
        {"label": "environment", "x": 0.5, "y": 0.5, "r": 8, "g": 12, "b": 25, "size": 0.3, "density": 0.19, "spread": 0.9}
      ],
      "motion": "drift"
    }
  ]
}

motion options: pulse/drift/explode/collapse/converge/scatter/flow/surge`;

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
