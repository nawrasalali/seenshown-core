/* /api/ask — SeenShown v3.0 — correlated step simulations */
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

    const prompt = `You are the visual mind of SeenShown. A human asked: "${question}"

Your job: design 5 sequential particle simulations that make this answer VISIBLE and UNDERSTOOD. Each simulation must clearly show what is happening in that step — not abstract blobs, but meaningful particle arrangements that mirror the actual structure of the concept.

CANVAS: x=0.0 (left) to 1.0 (right), y=0.0 (top) to 1.0 (bottom). Full screen.

CRITICAL SIMULATION DESIGN RULES:
1. Each group appears as a DISTINCT CLUSTER at its x,y position. Use spread 0.05-0.25 for tight focused groups. Use 0.4+ only for diffuse background fields.
2. The ARRANGEMENT of groups must mirror the concept. Examples:
   - Two things colliding → one group at x:0.1 moving toward another at x:0.9
   - A cell being attacked → large group at center (cell), small groups scattered around edges (attackers)
   - A network spreading → one bright group at center, many small dim groups spreading to all corners
   - Something collapsing → groups arranged in a ring that will converge to center
   - Two opposing forces → one group top-left, another bottom-right, field particles between
3. Use colour with meaning: hot/dangerous=red-orange, cold/calm=blue-white, alive/growing=green-teal, energy=yellow-white, death/void=dark purple-black
4. Dominant subject = high density (0.3-0.5) and large size (2-4). Supporting elements = lower density (0.1-0.2) and small size (0.5-1.5).
5. EACH STEP must look DIFFERENT from the previous — the simulation transforms as the answer unfolds.

NARRATION: Each step title is 3-5 words. Description tells what the user is WATCHING right now AND the science. Specific numbers and names. 2-3 sentences.

Design 5 steps for: "${question}"

Return ONLY this JSON:
{
  "steps": [
    {
      "title": "Step Title",
      "description": "What user sees happening AND the science behind it. Real numbers and names.",
      "groups": [
        {"label": "what this represents", "x": 0.5, "y": 0.5, "r": 255, "g": 200, "b": 80, "size": 2.5, "density": 0.4, "spread": 0.12},
        {"label": "what this represents", "x": 0.15, "y": 0.3, "r": 255, "g": 60, "b": 20, "size": 1.0, "density": 0.3, "spread": 0.08},
        {"label": "background field", "x": 0.5, "y": 0.5, "r": 20, "g": 20, "b": 40, "size": 0.3, "density": 0.3, "spread": 0.8}
      ],
      "motion": "drift"
    }
  ]
}

motion options: pulse / drift / explode / collapse / branch / weave / orbit / scatter / flow / converge / surge / ripple`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3500,
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
      ).slice(0, 7);
    });

    const narration = steps.map(s => [s.title, s.description]);
    const simSteps = steps.map(s => ({ groups: s.groups, motion: s.motion || 'drift' }));

    return res.status(200).json({ narration, simSteps, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
