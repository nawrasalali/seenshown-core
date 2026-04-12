/* SeenShown — Stripe Webhook
   Handles: checkout.session.completed
   - Subscriptions → update profiles tier
   - Investor packages → create investor_registration + trigger SAFE PDF
   - Points bundles → credit points to profile */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SB_URL = 'https://vfcbdeawypooqcevuzac.supabase.co';
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const INTERNAL_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://seenshown.com';

  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

  /* Read raw body for Stripe signature verification */
  const rawBody = await new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });

  /* Verify Stripe signature */
  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers['stripe-signature'];
      const crypto = require('crypto');
      const [, timestampPart, signaturePart] = sig.split(',').map(p => p.split('='));
      const timestamp = timestampPart[0];
      const signature = signaturePart[0];
      const payload = timestamp + '.' + rawBody;
      const expected = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(payload).digest('hex');
      if (expected !== signature) throw new Error('Invalid signature');
    }
    event = JSON.parse(rawBody);
  } catch (e) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const email = session.customer_details?.email || session.customer_email;
  const tier = session.metadata?.tier;
  const seats = parseInt(session.metadata?.seats || '1');
  const investor_type = session.metadata?.investor_type;
  const amountTotal = session.amount_total;

  if (!email || !tier) return res.status(200).json({ received: true, skipped: 'no email or tier' });

  try {
    /* ── SUBSCRIPTIONS ── */
    if (['scholar', 'studio', 'institutional'].includes(tier)) {
      const pointsIncluded = tier === 'scholar' ? 50 : tier === 'studio' ? 200 : 500;
      /* Update profiles */
      await fetch(`${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({
          tier,
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          points_granted: pointsIncluded,
          subscribed_at: new Date().toISOString()
        })
      });
      /* Credit monthly points */
      const pr = await fetch(`${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&limit=1`, { headers: sbHeaders });
      const profiles = await pr.json();
      if (profiles?.[0]) {
        const currentPoints = profiles[0].points || 0;
        await fetch(`${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify({ points: currentPoints + pointsIncluded })
        });
      }
    }

    /* ── INVESTOR PACKAGES ── */
    else if (tier.startsWith('investor_')) {
      const pkg = tier.replace('investor_', '');
      /* Upsert investor registration */
      await fetch(`${SB_URL}/rest/v1/investor_registrations`, {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          email,
          package: pkg,
          seats,
          investor_type: investor_type || 'unknown',
          status: 'pending',
          stripe_session_id: session.id,
          amount: amountTotal,
          created_at: new Date().toISOString()
        })
      });
      /* Trigger SAFE PDF generation */
      await fetch(`${INTERNAL_URL}/api/generate-safe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, package: pkg, seats, amount: amountTotal / 100, investor_type, session_id: session.id })
      });
    }

    /* ── POINTS BUNDLES ── */
    else if (tier.startsWith('points_')) {
      const pointsMap = { points_100: 100, points_500: 500, points_1000: 1000 };
      const pointsToAdd = pointsMap[tier] || 0;
      if (pointsToAdd > 0) {
        const pr = await fetch(`${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&limit=1`, { headers: sbHeaders });
        const profiles = await pr.json();
        const currentPoints = profiles?.[0]?.points || 0;
        await fetch(`${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify({ points: currentPoints + pointsToAdd })
        });
        /* Log transaction */
        await fetch(`${SB_URL}/rest/v1/point_transactions`, {
          method: 'POST',
          headers: { ...sbHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ email, amount: pointsToAdd, type: 'purchase', ref_id: session.id, created_at: new Date().toISOString() })
        });
      }
    }

    return res.status(200).json({ received: true, tier, email });

  } catch (e) {
    console.error('Webhook processing error:', e);
    return res.status(500).json({ error: String(e) });
  }
}

export const config = { api: { bodyParser: false } };
