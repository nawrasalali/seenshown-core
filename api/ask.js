/* /api/ask — SeenShown: question → custom simulation
   AI generates the actual visual geometry, not just text */
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

    const prompt = `You are the simulation engine for SeenShown — an app where ANY question becomes a living particle animation that helps humans understand complex concepts visually.

The user asked: "${question}"

Your task has TWO parts:

PART 1 — NARRATION
Write 5 steps that directly answer "${question}". Each step should reveal something specific, surprising, and true. Think like a documentary narrator — vivid, concrete, scientifically accurate. Each step has a title and 2 sentences.

PART 2 — SIMULATION GEOMETRY  
Design the particle formation that best represents the STRUCTURE of this answer visually. You have a canvas. Particles will animate from the center to your specified positions.

Choose ONE of these formation types that best matches the answer's structure:
- "radial": particles explode outward from center (explosions, origins, spread)
- "spiral": particles form a spiral/galaxy (cycles, evolution, time)  
- "network": particles form connected clusters (brain, social, systems)
- "wave": particles form wave patterns (sound, light, emotion, ripples)
- "tree": particles branch upward like a tree (growth, hierarchy, evolution)
- "split": particles divide into 2-3 distinct groups (conflict, comparison, duality)
- "collapse": particles fall inward to center (gravity, black holes, grief, endings)
- "scatter": particles spread randomly then drift (chaos, memory, loss)
- "layers": particles form horizontal layers (geology, atmosphere, depth)
- "pulse": particles expand and contract rhythmically (heartbeat, breathing, rhythm)

Also choose a COLOR PALETTE that matches the emotional/scientific tone:
- "hot": reds, oranges, yellows (energy, fire, anger, heat)
- "cool": blues, purples, whites (space, mind, calm, cold)
- "life": greens, teals, yellows (biology, growth, nature)
- "neural": cyan, white, electric blue (brain, technology, data)
- "cosmic": deep purple, gold, white (universe, philosophy, time)
- "warm": amber, gold, cream (love, happiness, warmth)
- "dark": deep blue, near-black, dim white (grief, mystery, depth)

Return ONLY this JSON:
{
  "formation": "one formation type from the list",
  "palette": "one palette from the list",
  "intensity": 0.7,
  "narration": [
    ["Title 1", "Sentence 1 directly answering ${question}. Sentence 2 specific detail."],
    ["Title 2", "Sentence 1. Sentence 2."],
    ["Title 3", "Sentence 1. Sentence 2."],
    ["Title 4", "Sentence 1. Sentence 2."],
    ["Title 5", "Sentence 1. Sentence 2 — the most surprising or profound insight."]
  ]
}

intensity is 0.0-1.0: how explosive/dramatic the formation should be (0=gentle, 1=explosive).`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1400,
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
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) { return res.status(500).json({ error: 'parse failed', raw: clean.slice(0,300) }); }
      else return res.status(500).json({ error: 'no JSON', raw: clean.slice(0,300) });
    }

    const FORMATIONS = ['radial','spiral','network','wave','tree','split','collapse','scatter','layers','pulse'];
    const PALETTES = ['hot','cool','life','neural','cosmic','warm','dark'];

    return res.status(200).json({
      formation: FORMATIONS.includes(parsed.formation) ? parsed.formation : 'radial',
      palette: PALETTES.includes(parsed.palette) ? parsed.palette : 'cosmic',
      intensity: Math.max(0, Math.min(1, parsed.intensity || 0.7)),
      narration: (parsed.narration || []).filter(x => Array.isArray(x) && x[0] && x[1]),
      question
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
