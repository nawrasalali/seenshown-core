/* /api/ask — SeenShown AI: question → visual simulation answer */
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

    const prompt = `You are the intelligence behind SeenShown — an app that makes any question come alive as a particle simulation.

The user asked: "${question}"

Your job: answer this question in 5 steps that a human can WATCH and FEEL, not just read.

Each step must:
1. Directly answer part of "${question}"
2. Have a SHORT vivid title (max 5 words)
3. Have 2 sentences of explanation — specific, real numbers, real names, real mechanisms

Also choose the best VISUAL DOMAIN from this list based on what the answer LOOKS like in motion:
- bigbang: explosion, expansion, origin, creation, cosmic scale
- heartbreak: separation, drift apart, scatter, loss
- love: attraction, orbiting, coming together, bonding  
- neuron: networks, signals, branching, firing, thought
- immune: attack and defend, invasion, protection
- grief: slow collapse, weight, falling inward
- anger: chaotic eruption, fast random motion
- joy: upward burst, celebration, scatter upward
- bh: spiral inward, singularity, collapse to center
- fireworks: explosive colour, celebration, radial burst
- rumour: cascade, viral spread, chain reaction
- urban: flow, grid, organised movement
- chem: bonding, molecules, structured formation
- amr: spread of resistance, population dynamics

Return ONLY this JSON — no markdown, no explanation:
{
  "domain": "domain name from list above",
  "narration": [
    ["Step 1 title", "Sentence 1 directly answering ${question}. Sentence 2 with specific detail."],
    ["Step 2 title", "Sentence 1. Sentence 2."],
    ["Step 3 title", "Sentence 1. Sentence 2."],
    ["Step 4 title", "Sentence 1. Sentence 2."],
    ["Step 5 title", "Sentence 1. Sentence 2."]
  ]
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Claude error', detail: t.slice(0,200) });
    }

    const data = await r.json();
    const raw = (data.content?.[0]?.text || '').trim();
    const clean = raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch(e) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) { return res.status(500).json({ error: 'parse failed', raw: clean.slice(0,200) }); }
      else return res.status(500).json({ error: 'no JSON', raw: clean.slice(0,200) });
    }

    const DOMAINS = ['bigbang','heartbreak','love','neuron','immune','grief','anger','joy','bh','fireworks','rumour','urban','chem','amr'];
    const domain = DOMAINS.includes(parsed.domain) ? parsed.domain : 'bigbang';
    const narration = (parsed.narration || []).filter(x => Array.isArray(x) && x[0] && x[1]);

    if (narration.length < 3) return res.status(500).json({ error: 'too few steps', got: narration.length });

    return res.status(200).json({ domain, narration, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
