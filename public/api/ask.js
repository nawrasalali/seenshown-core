/* /api/ask — Anthropic proxy for SeenShown question answering
   CommonJS format for Vercel serverless compatibility */
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
    if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' });

    const system = [
      'You are SeenShown, a scientific visualiser.',
      'The user asked: "' + question + '"',
      'Return ONLY a valid JSON array with exactly 5 elements. No markdown. No extra text. No preamble.',
      'Format:',
      '[["Step 1: Title","2-3 detailed scientific sentences for step 1"],',
      ' ["Step 2: Title","2-3 detailed scientific sentences for step 2"],',
      ' ["Step 3: Title","2-3 detailed scientific sentences for step 3"],',
      ' ["Step 4: Title","2-3 detailed scientific sentences for step 4"],',
      ' ["Step 5: Title","2-3 detailed scientific sentences for step 5"]]',
      'Rules: answer the specific question with real science, numbers, names. No phrases like "the simulation shows".'
    ].join('\n');

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
        system: system,
        messages: [{ role: 'user', content: question }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Anthropic API error', status: r.status, detail: t.slice(0,300) });
    }

    const data = await r.json();
    const raw = (data.content && data.content[0] && data.content[0].text || '').trim();
    if (!raw) return res.status(500).json({ error: 'empty response from Claude' });

    /* Strip markdown code fences if Claude wrapped in them */
    const clean = raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();

    let narration;
    try {
      narration = JSON.parse(clean);
    } catch(e) {
      /* Try to extract just the array portion */
      const m = clean.match(/\[[\s\S]*\]/);
      if (m) {
        try { narration = JSON.parse(m[0]); }
        catch(e2) { return res.status(500).json({ error: 'JSON parse failed', raw: clean.slice(0,300) }); }
      } else {
        return res.status(500).json({ error: 'No JSON array in response', raw: clean.slice(0,300) });
      }
    }

    if (!Array.isArray(narration)) return res.status(500).json({ error: 'Response is not an array' });

    /* Ensure each item is [string, string] */
    narration = narration.filter(function(item) {
      return Array.isArray(item) && item.length >= 2 && item[0] && item[1];
    });

    if (narration.length < 3) return res.status(500).json({ error: 'Too few valid steps', got: narration.length });

    return res.status(200).json({ narration: narration, domain: domain, question: question });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
