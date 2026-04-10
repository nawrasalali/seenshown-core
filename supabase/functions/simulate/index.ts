import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { question, domain } = await req.json()
    const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

    const prompt = `You write narration for a particle physics simulation that visually answers a question.

QUESTION: "${question}"
SIMULATION DOMAIN: ${domain}

ABSOLUTE RULES — violate any and the output is rejected:
1. NEVER say "this simulation", "watch the particles", "represents", "models how", or any meta-description
2. NEVER introduce the answer — begin MID-ANSWER as if already inside the experience
3. NEVER use the word "simulation" anywhere
4. 1-2 sentences per phase. Scientific. Precise. Direct.
5. Phase 1 = cause/before. Phase 2 = mechanism. Phase 3 = outcome. Phase 4 = deeper implication. Phase 5 = truth/resolution.
6. Documentary narrator tone — the camera is already on the subject.

WRONG: "This simulation models how grief feels — the particles represent loss."
RIGHT: "The brain has built a predictive model that includes the lost person. Every failed prediction reactivates the loss."

Return ONLY valid JSON array, no markdown:
[
  ["Phase 1 · [4 word label]", "[1-2 sentences — direct, mid-answer]"],
  ["Phase 2 · [4 word label]", "[the mechanism]"],
  ["Phase 3 · [4 word label]", "[the outcome]"],
  ["Phase 4 · [4 word label]", "[deeper implication]"],
  ["Phase 5 · [4 word label]", "[the truth or resolution]"]
]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
    })

    const data = await res.json()
    const raw = (data?.content?.[0]?.text ?? '').replace(/```json\n?|```\n?/g, '').trim()
    const narration = JSON.parse(raw)

    const forbidden = ['this simulation', 'watch the', 'represents', 'models how']
    for (const phase of narration) {
      for (const f of forbidden) {
        if ((phase[1]||'').toLowerCase().includes(f)) throw new Error('Forbidden: '+f)
      }
    }

    return new Response(JSON.stringify({ narration }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
