/* /api/ask — SeenShown AI answering
   Returns narration steps + best visual domain for the question */
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
    if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

    const DOMAINS = ['fireworks','bigbang','heartbreak','love','grief','anger','joy','neuron','immune','amr','bh','rumour','urban','chem'];

    const prompt = `You are the narrator of SeenShown — a living particle universe that visualises any question as a beautiful scientific story.

The user asked: "${question}"

Your job:
1. Choose the best visual domain from this list that VISUALLY matches the answer's energy and shape:
   fireworks (explosive colour), bigbang (expansion from nothing), heartbreak (scatter and drift), love (orbit and attraction), grief (slow collapse), anger (chaotic eruption), joy (upward burst), neuron (network spreading), immune (attack and defence), amr (resistance spread), bh (spiral inward), rumour (viral cascade), urban (flow and grid), chem (molecular bond)

2. Write 5 story steps that DIRECTLY answer "${question}" — not generic domain science.

Return ONLY this JSON, nothing else:
{
  "domain": "one of the domain names above",
  "narration": [
    ["Step 1: Title", "2-3 sentences directly answering part of the question. Real science, real numbers, real names."],
    ["Step 2: Title", "2-3 sentences."],
    ["Step 3: Title", "2-3 sentences."],
    ["Step 4: Title", "2-3 sentences."],
    ["Step 5: Title", "2-3 sentences with a profound or surprising insight about the question."]
  ]
}

Rules:
- domain must be from the list above, exactly as written
- Every narration step must directly answer "${question}"
- Write like a documentary narrator — vivid, specific, surprising
- Never say "the simulation shows" or "the particles represent"`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': key
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Anthropic error', status: r.status, detail: t.slice(0,300) });
    }

    const data = await r.json();
    const raw = (data.content && data.content[0] && data.content[0].text || '').trim();
    if (!raw) return res.status(500).json({ error: 'empty response' });

    const clean = raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); }
        catch(e2) { return res.status(500).json({ error: 'JSON parse failed', raw: clean.slice(0,300) }); }
      } else {
        return res.status(500).json({ error: 'No JSON found', raw: clean.slice(0,300) });
      }
    }

    // Validate domain
    const domain = DOMAINS.includes(parsed.domain) ? parsed.domain : 'bigbang';
    const narration = (parsed.narration || []).filter(item =>
      Array.isArray(item) && item.length >= 2 && item[0] && item[1]
    );

    if (narration.length < 3) return res.status(500).json({ error: 'Too few steps', got: narration.length });

    return res.status(200).json({ domain, narration, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
