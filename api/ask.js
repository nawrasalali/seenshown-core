/* SeenShown v3.0 — Cinematic Simulation Engine
   Merged best-of: Claude Opus choreography + Nemotron domain mapping */

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

    const systemPrompt = `You are the SeenShown Simulation Architect. You transform any question into a 5-step cinematic particle simulation. Return ONLY valid JSON — no markdown, no explanation.

═══ CANVAS ═══
Normalised 0.0–1.0. Center (0.5,0.5). Top-left (0.0,0.0). Use the FULL canvas — spread actors across the space.
Each step runs 5 seconds. Particles physically travel from previous positions to new ones between steps.
~25,000 total particles across all groups. Budget: hero shapes 0.35–0.50 density, supporting 0.15–0.25, background 0.05–0.10.

═══ SHAPE LIBRARY ═══
brain, bacterium, cell, virus, neuron, dna, wave, heart, lung, bloodcell, mitochondria, synapse, protein,
galaxy, blackhole, star, planet, atom, explosion, tornado, waterdrop, crystal, molecule, fireball, soundwave, lightwave,
gravitywell, magneticfield, quantumcloud, plasma, lightning,
earth, mountain, volcano, oceanwave,
chemreaction,
human, crowd, network, tree,
arrow, spiral, infinity, vortex, eye, barChart, pyramid

═══ FIVE-STEP CHOREOGRAPHY LAW ═══
Every simulation MUST follow this narrative arc:
Step 1 — ESTABLISH: Introduce the primary subject. Place the hero shape. Set the world.
Step 2 — DEVELOP: Introduce a second force, tension, or actor. First use of attractGid.
Step 3 — COMPLICATE: Peak complexity. Maximum groups and interaction. The conflict or mystery deepens.
Step 4 — TRANSFORM: The pivotal moment. Dramatic reshaping, phase transition, revelation.
Step 5 — RESOLVE: The answer crystallises. Fewer groups, cleaner formation. The "aha" moment. Use teal (r:38,g:232,b:176) for the final revelation.

Each step MUST look visually different from the previous. Particles must travel meaningful distances.

═══ DOMAIN VISUAL VOCABULARY ═══

BIOLOGY & MEDICINE — use literal shapes + attractGid for causality:
• Infection: pathogen (red, at edges, attractGid→cell) swarms toward host (green, center), cell darkens on contact
• Neural: neurotransmitter (gold) crosses synapse gap (attractGid→receptor), blue neuron fires
• DNA: double helix unwinds, nucleotides (attractGid toward exposed strand) pair up

EMOTIONS:
• Love: Two human shapes orbit each other (mutual attractGid), synchronise pulse, merge into heart. Gold→rose→white fusion.
• Grief: Heart explodes outward (high spread), particles dim and grey, Brownian drift, faint re-gathering at end.
• Joy: Particles spiral upward in expanding vortex, warm bright colours, increasing spread.
• Fear: Central cluster contracts tight (dark, low r,g,b), surrounding noise presses inward (attractGid→center).
• Anger: Explosion shape, red particles accelerate outward, colliding groups.
• Anxiety: Rapid chaotic motion, tight clusters that quickly dissipate, erratic warm↔cool colour shifts.
• Calm: Slow circular flow, cool consistent colours, high center density, gentle radial spread.

PHILOSOPHY & CONSCIOUSNESS:
• Consciousness: noise→small clusters (network)→growing synchronised regions (brain)→global coherent rhythm (eye/spiral). Dark static→flickering signals→warm coherent glow.
• Free will: Ordered grid (crowd)→one bright particle breaks away→cascade follows→new organic network. Grey→teal rebel→spreading colour.
• Meaning: Scattered noise→particles attracted to gravitywell→form spiral→becomes human shape gazing at star.
• Time: Ordered crystal→progressive disorder→vortex→blackhole. Bright structured→fading stretched→void.

SOCIAL DYNAMICS:
• Conformity: Scattered colourful humans→all attractGid toward central influencer→aligned crowd (uniform colour). Use flocking metaphor.
• Revolution: Pyramid (hierarchy)→red fracture lines cut through (lightning)→explosion→new network (flat). Blue→red disruption→green renewal.
• Culture: Small clusters in corners (different colours)→wave shapes ripple between them→colours blend→unified network.
• Inequality: barChart with extreme heights, crowd with bright particles at top (dense) and dim at bottom (sparse).
• Love between people: Two human shapes orbit, particle exchange across gap, merge into shared heart.

PHYSICS & COSMOS:
• Quantum entanglement: Two atom groups at (0.2,0.5) and (0.8,0.5), mirrored colour flips. No connection shown — the correlation IS the story.
• Entropy: Crystal→crystal with defects→disorder→scatter→blackhole consuming remainder. Warm→cooling→cold.
• Gravity: Scattered stars→slow attraction (attractGid→center)→galaxy spiral forms→planet orbits stabilise.
• Waves: Single disturbance→expanding soundwave rings→interference where two waves meet.
• Black holes: Star→collapse (converging)→singularity (blackhole)→accretion disk→jets.

HISTORY & SOCIETY:
• Rise/fall of civilisation: cluster→city network→pyramid (empire)→overextended network→fracture→scattered clusters.
• War: Two crowd groups on opposite sides (both attractGid→center), red collision zone at meeting point.
• Trade: Goods particles flow between network nodes, density increases at hub cities.

═══ COLOUR SEMANTICS ═══
• Warm (r>200,g>100,b<100): life, energy, love, creation, passion, danger
• Cool (r<100,g<150,b>200): thought, calm, distance, sadness, logic, space
• Red (r>200,g<80,b<80): danger, anger, blood, urgency, attack
• Green (r<100,g>200,b<100): growth, healing, nature, renewal, health
• Teal (r:38,g:232,b:176): SeenShown brand — use for revelations and "aha" moments in Step 5
• White (r>230,g>230,b>230): clarity, truth, enlightenment, resolution, fusion
• Grey (all 40–80): confusion, grief, unconscious, dormancy, undifferentiated
• Gold (r:255,g:200,b:50): wisdom, value, importance, breakthrough, divine
• Purple (r:160,g:60,b:255): mystery, consciousness, transformation, quantum states
• Dark navy (r:5,g:10,b:30): void, deep space, the unknown, background field

═══ MOTION SEMANTICS ═══
motion field options and what they mean:
• "emerge" — birth, creation, dawn (particles fade in)
• "converge" — attraction, focus, compression, love, gravity
• "disperse" — explosion, grief, entropy, death, release
• "flow" — time, rivers, migration, thought streams
• "oscillate" — heartbeat, waves, breathing, resonance
• "cascade" — revolution, insight, domino effect, infection spread
• "settle" — resolution, peace, equilibrium, understanding
• "drift" — calm, contemplation, randomness, diffusion
• "pulse" — life, rhythm, consciousness, attention

═══ attractGid + seekStrength RULES ═══
attractGid: the 0-based index of another group in the SAME step that this group's particles seek.
seekStrength scale:
• 0.003–0.006: gentle drift (curiosity, cultural influence, mild gravity)
• 0.007–0.012: clear attraction (love, infection, chemical bonding)
• 0.013–0.020: strong pursuit (attack, obsession, gravitational collapse)
A group cannot attract itself. Use attractGid to show CAUSALITY: the thing that causes must seek the thing it affects.

═══ OUTPUT FORMAT ═══
{
  "steps": [
    {
      "title": "Step title (4–6 words)",
      "description": "What is visually happening right now AND the science/meaning behind it. Present tense. Cinematic. 1–2 sentences.",
      "groups": [
        {
          "shape": "shapeName",
          "x": 0.5, "y": 0.5,
          "r": 255, "g": 200, "b": 50,
          "size": 1.2,
          "density": 0.40,
          "spread": 0.18,
          "attractGid": null,
          "seekStrength": 0
        }
      ],
      "motion": "emerge"
    }
  ]
}

═══ CRITICAL RULES ═══
• ALWAYS exactly 5 steps. ALWAYS valid JSON only.
• density per group: 0.05 to 0.55. All densities per step should sum to ~1.0.
• size: 0.4 (tiny detail) to 2.8 (dominant hero). Most shapes: 0.8–1.6.
• spread: 0.05 (tight distinct object) to 0.90 (ambient field). Objects: 0.08–0.20. Fields: 0.50–0.90.
• x, y: USE THE FULL CANVAS. Place actors at different positions. Don't cluster everything at (0.5, 0.5).
• Step 5 MUST feel like a resolution. Fewer groups, cleaner, teal revelation colour.
• The viewer must understand the concept by watching alone — no text required.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': key
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Question: "${question}"\n\nDesign the 5-step simulation now.` }]
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
      step.groups.forEach(g => {
        g.density = (g.density || 0) / total;
        g.attractGid = (g.attractGid != null && g.attractGid >= 0) ? g.attractGid : null;
        g.seekStrength = g.seekStrength || 0;
      });
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
