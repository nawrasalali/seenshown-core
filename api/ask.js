/* /api/ask — SeenShown: question → AI designs the simulation freely */
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

    const prompt = `You are the visual intelligence behind SeenShown — a platform that turns any human question into a living particle simulation. Your job is to design a simulation that makes the answer VISIBLE, FELT, and UNDERSTOOD through motion and light.

The user asked: "${question}"

You have complete freedom to design the simulation. Thousands of particles will move from the center of a dark screen to wherever you place them. Think of yourself as a choreographer of light.

PART 1 — DESIGN THE SIMULATION
Describe the simulation as a set of particle groups. Each group has:
- A position on screen (x, y as fractions 0.0 to 1.0, where 0.5,0.5 is center)
- A color (r, g, b values 0-255)
- A size (0.5 = tiny, 3.0 = large)
- A density (0.0 to 1.0 — fraction of total particles in this group)
- A spread (0.0 = tight cluster, 1.0 = spread across the screen)

Design between 2 and 8 groups. Total density must equal 1.0.
Think visually: what SHAPE does this answer take? What STRUCTURE? What MOVEMENT would help someone understand?

Examples of thinking:
- Heartbreak: a dense bright cluster that splits into two drifting apart groups
- Black hole: rings of particles collapsing to a single point, bright at edge dark at center
- Evolution: a tree-like branching from one point into many spread groups
- Sound wave: parallel bands of particles undulating across the screen
- DNA: two intertwining helical streams
- Consciousness: a dense network with bright hub nodes and dim connections spreading out

PART 2 — NARRATION
Write 5 steps answering "${question}" directly. Documentary style — specific, true, surprising. Each has a short title and 2 vivid sentences.

Return ONLY this JSON (no markdown):
{
  "groups": [
    {
      "label": "what this group represents",
      "x": 0.5,
      "y": 0.5,
      "r": 255, "g": 255, "b": 255,
      "size": 1.5,
      "density": 0.3,
      "spread": 0.2
    }
  ],
  "motion": "one word describing overall feel: pulse / drift / explode / collapse / branch / weave / orbit / scatter / flow / converge",
  "narration": [
    ["Title 1", "Sentence directly answering ${question}. Sentence 2 specific detail."],
    ["Title 2", "Sentence 1. Sentence 2."],
    ["Title 3", "Sentence 1. Sentence 2."],
    ["Title 4", "Sentence 1. Sentence 2."],
    ["Title 5", "The most surprising or profound insight about ${question}."]
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

    // Validate and normalise groups
    const groups = (parsed.groups || []).filter(g =>
      typeof g.x === 'number' && typeof g.y === 'number' &&
      typeof g.r === 'number' && typeof g.density === 'number'
    ).slice(0, 8);

    if (!groups.length) return res.status(500).json({ error: 'no valid groups', raw: clean.slice(0,400) });

    // Normalise densities to sum to 1
    const totalDensity = groups.reduce((s, g) => s + (g.density || 0), 0);
    groups.forEach(g => g.density = (g.density || 0) / (totalDensity || 1));

    const narration = (parsed.narration || []).filter(x => Array.isArray(x) && x[0] && x[1]);
    if (narration.length < 3) return res.status(500).json({ error: 'too few narration steps' });

    return res.status(200).json({
      groups,
      motion: parsed.motion || 'drift',
      narration,
      question
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
