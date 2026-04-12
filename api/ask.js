/* /api/ask — SeenShown v4.0 — Cinematic simulation storytelling */
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

    const prompt = `You are the simulation director for SeenShown — a platform that makes complex answers VISIBLE through particle animation. You are a scientist, a filmmaker, and a visual storyteller in one.

THE QUESTION: "${question}"

YOUR MISSION: Design a 5-step cinematic particle simulation where each step shows a specific moment in the real physical/biological/chemical process. The simulation must be scientifically accurate and visually tell the story so clearly that someone with no knowledge of the subject understands what is happening just by watching.

═══ THINK LIKE THIS ═══

First, identify the KEY ACTORS in this process (e.g., for "how do bacteria attack cells": the actors are the healthy cell, bacteria, cell membrane, immune cells).

Then design each step as a SCENE showing those actors in action:
- Where are the actors on screen?
- What are they doing to each other?
- How do their positions, colours, and sizes change from the previous step?

SCREEN GEOGRAPHY:
- Use screen position to show anatomy/structure (bacteria come from edges, cell is at center, brain cortex is at top, heart is at center, etc.)
- Left → Right can show time progression
- Center = main subject, Edges = attacking/arriving elements
- Top = brain/mind, Bottom = body/base processes

PARTICLE GROUPS represent real physical entities:
- A cell = one large tight cluster (spread 0.08-0.15) with biological colour
- Bacteria = multiple small tight clusters (spread 0.04-0.08) at edge positions, red/dark
- A membrane = a ring of particles (place groups in a circle around center)
- A neural network = many small dim clusters scattered across full screen
- A wave = particles arranged in a band across the screen
- Energy/signal = small bright tight cluster

COLOUR RULES (follow these):
- Healthy/alive = green (r:40,g:200,b:100) or teal (r:38,g:232,b:176)
- Diseased/attacking = red (r:220,g:40,b:40) or dark red (r:180,g:20,b:20)  
- Neural/electrical = electric blue (r:40,g:160,b:255) or cyan (r:100,g:230,b:255)
- Energy/heat = orange-yellow (r:255,g:180,b:40)
- Sleep/calm = deep blue (r:20,g:40,b:120)
- Memory/dream = warm purple (r:180,g:80,b:255)
- Dead/void = very dark (r:15,g:15,b:30)
- Immune/defensive = bright white (r:255,g:255,b:220)

SPREAD VALUES:
- A specific object (cell, nucleus, bacteria) = 0.05-0.12 (tight, distinct)
- A field or fluid = 0.3-0.6 (diffuse)
- An atmosphere or background = 0.6-0.9 (very spread)

DENSITY: The most important actor in this scene gets the highest density (0.3-0.5). Background context = 0.1-0.2.

═══ NARRATION ═══
Each step title = 3-5 words describing the action happening RIGHT NOW.
Description = 2-3 sentences: "Watch as [actor] does [action]. This is [scientific name] — [real mechanism with numbers]."

═══ EXAMPLE (for "how do bacteria attack cells") ═══
Step 1 — "Healthy Cell at Rest": Large green cluster at center (0.5,0.5) spread 0.12. Tiny red clusters at corners (0.05,0.05), (0.95,0.05), (0.05,0.95), (0.95,0.95) spread 0.04. Background dark field spread 0.8.
Step 2 — "Bacteria Approach": Red clusters move closer to center (0.2,0.2), (0.8,0.2), (0.2,0.8), (0.8,0.8). Cell remains at center, slightly contracted (smaller spread).
Step 3 — "Membrane Breach": Red particles now overlap cell position. Cell turns darker green. Add red particles mixed INTO center position.
Step 4 — "Cell Compromised": Cell fragments — multiple smaller green clusters scattered. Red dominates center.
Step 5 — "Immune Response": Bright white clusters surge from all corners toward center, overwhelming the red.

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON:
{
  "steps": [
    {
      "title": "Action Happening Now",
      "description": "Watch as [what is visible]. This is [scientific name] — [real numbers/mechanism].",
      "groups": [
        {"label": "healthy cell", "x": 0.5, "y": 0.5, "r": 40, "g": 200, "b": 100, "size": 3.0, "density": 0.45, "spread": 0.12},
        {"label": "bacteria", "x": 0.1, "y": 0.1, "r": 220, "g": 40, "b": 40, "size": 1.2, "density": 0.15, "spread": 0.05},
        {"label": "bacteria", "x": 0.9, "y": 0.9, "r": 220, "g": 40, "b": 40, "size": 1.2, "density": 0.15, "spread": 0.05},
        {"label": "extracellular fluid", "x": 0.5, "y": 0.5, "r": 15, "g": 25, "b": 50, "size": 0.3, "density": 0.25, "spread": 0.85}
      ],
      "motion": "drift"
    }
  ]
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
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
