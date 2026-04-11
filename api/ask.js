/* /api/ask — Anthropic proxy for SeenShown question answering */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { question, domain } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

    const prompt = `You are a scientific storyteller for SeenShown, a particle visualisation app.

The user asked: "${question}"

Answer THIS SPECIFIC QUESTION in exactly 5 steps that tell the story of the answer.
Each step should directly address the question — not describe a generic scientific process.

Return ONLY a valid JSON array. No markdown, no preamble, no explanation outside the JSON.

Format:
[
  ["Step 1: [Short title directly about the question]", "2-3 sentences directly answering part of the question with real science, specific numbers, names, mechanisms."],
  ["Step 2: [Short title]", "2-3 sentences continuing the story of the answer."],
  ["Step 3: [Short title]", "2-3 sentences."],
  ["Step 4: [Short title]", "2-3 sentences."],
  ["Step 5: [Short title]", "2-3 sentences completing the answer with a surprising or profound insight."]
]

Rules:
- Every step must directly answer "${question}" — not be a generic science lesson
- Use real numbers, real names, real mechanisms
- Write like you are narrating a documentary, not a textbook
- No phrases like "the simulation shows" or "in this visualisation"`;

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

    let narration;
    try {
      narration = JSON.parse(clean);
    } catch(e) {
      const m = clean.match(/\[[\s\S]*\]/);
      if (m) {
        try { narration = JSON.parse(m[0]); }
        catch(e2) { return res.status(500).json({ error: 'JSON parse failed', raw: clean.slice(0,300) }); }
      } else {
        return res.status(500).json({ error: 'No JSON array found', raw: clean.slice(0,300) });
      }
    }

    if (!Array.isArray(narration)) return res.status(500).json({ error: 'Not an array' });

    narration = narration.filter(item => Array.isArray(item) && item.length >= 2 && item[0] && item[1]);

    if (narration.length < 3) return res.status(500).json({ error: 'Too few steps', got: narration.length });

    return res.status(200).json({ narration, domain, question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
