/* /api/ask — server-side Anthropic proxy for question answering
   Called when Supabase Edge Function is unavailable */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { question, domain } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'API key not configured' });

    const systemPrompt = `You are SeenShown — a scientific visualisation narrator. 
The user asked: "${question}"
You are animating this as a particle simulation in the domain: ${domain}.

Return EXACTLY this JSON format — no other text, no markdown:
[
  ["Step 1: [Title]", "[2-3 detailed scientific sentences explaining step 1]"],
  ["Step 2: [Title]", "[2-3 detailed scientific sentences explaining step 2]"],
  ["Step 3: [Title]", "[2-3 detailed scientific sentences explaining step 3]"],
  ["Step 4: [Title]", "[2-3 detailed scientific sentences explaining step 4]"],
  ["Step 5: [Title]", "[2-3 detailed scientific sentences explaining step 5]"]
]

Rules:
- Answer the specific question asked — do not describe the simulation
- Be scientifically accurate with real numbers, names, timescales
- Each step logically follows from the previous
- No phrases like "watch the particles" or "the simulation shows"`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': key,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: question }],
        system: systemPrompt,
      }),
    });

    const data = await r.json();
    if (!data.content?.[0]?.text) return res.status(500).json({ error: 'no response' });

    let text = data.content[0].text.trim();
    // Strip markdown if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let narration;
    try {
      narration = JSON.parse(text);
    } catch (e) {
      // Try to extract JSON array
      const match = text.match(/\[[\s\S]*\]/);
      if (match) narration = JSON.parse(match[0]);
      else return res.status(500).json({ error: 'parse failed', raw: text.slice(0, 200) });
    }

    return res.status(200).json({ narration, domain, question });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
