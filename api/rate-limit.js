/* SeenShown — Rate Limiting Serverless Function
   Checks if a free user has exceeded their daily simulation limit
   Called by index.html before allowing a custom simulation */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = 'https://jnvdpmmxlbkxwanqqhfw.supabase.co';
  const SB_SERVICE = process.env.SUPABASE_SERVICE_KEY;
  const SB_ANON = process.env.SUPABASE_ANON_KEY;

  try {
    const { user_id, action } = req.body || {};
    const FREE_DAILY_LIMIT = 5;
    const today = new Date().toISOString().slice(0, 10);

    if (!user_id) {
      /* Anonymous user — client tracks in localStorage, just return ok */
      return res.status(200).json({ allowed: true, anonymous: true });
    }

    /* Fetch profile */
    const profileRes = await fetch(
      `${SB_URL}/rest/v1/profiles?user_id=eq.${user_id}&limit=1`,
      { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_SERVICE}` } }
    );
    const profiles = await profileRes.json();
    const profile = profiles?.[0];

    if (!profile) {
      /* New user — create profile and allow */
      await fetch(`${SB_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id, tier: 'free', points: 0, sims_created: 0, sims_today: 1, sims_today_date: today })
      });
      return res.status(200).json({ allowed: true, remaining: FREE_DAILY_LIMIT - 1 });
    }

    /* Subscriber — always allowed */
    if (profile.tier && profile.tier !== 'free') {
      if (action === 'increment') {
        await fetch(`${SB_URL}/rest/v1/profiles?user_id=eq.${user_id}`, {
          method: 'PATCH',
          headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sims_created: (profile.sims_created || 0) + 1 })
        });
      }
      return res.status(200).json({ allowed: true, subscriber: true });
    }

    /* Free user — check daily limit */
    const simsToday = profile.sims_today_date === today ? (profile.sims_today || 0) : 0;
    const allowed = simsToday < FREE_DAILY_LIMIT;

    if (allowed && action === 'increment') {
      await fetch(`${SB_URL}/rest/v1/profiles?user_id=eq.${user_id}`, {
        method: 'PATCH',
        headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sims_today: simsToday + 1,
          sims_today_date: today,
          sims_created: (profile.sims_created || 0) + 1
        })
      });
    }

    return res.status(200).json({
      allowed,
      used: simsToday,
      remaining: Math.max(0, FREE_DAILY_LIMIT - simsToday),
      limit: FREE_DAILY_LIMIT,
      reason: allowed ? null : 'daily_limit_reached'
    });

  } catch (e) {
    console.error('Rate limit error:', e);
    /* On error, allow — don't block users due to our own failures */
    return res.status(200).json({ allowed: true, error: String(e) });
  }
}
