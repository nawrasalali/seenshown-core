/* SeenShown — Unified Checkout Handler
   Handles: subscriptions, investor packages, points bundles, USDT enquiry */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const BASE_URL = 'https://seenshown.com';

  /* ── PRICE MAP ── */
  const PRICES = {
    /* Subscriptions (USD/month) */
    scholar:       { amount: 900,    name: 'SeenShown Scholar — $9/month',        mode: 'subscription', currency: 'usd', success: '/community.html?subscribed=1', cancel: '/community.html' },
    studio:        { amount: 2900,   name: 'SeenShown Studio — $29/month',        mode: 'subscription', currency: 'usd', success: '/community.html?subscribed=1', cancel: '/community.html' },
    institutional: { amount: 49900,  name: 'SeenShown Institutional — $499/month', mode: 'subscription', currency: 'usd', success: '/community.html?subscribed=1', cancel: '/community.html' },
    /* Investor packages (AUD, one-time) */
    investor_entry:  { amount: 100000,  name: 'SeenShown Seed Entry — AUD $1,000/seat',    mode: 'payment', currency: 'aud', success: '/investors.html?invested=1', cancel: '/investors.html' },
    investor_growth: { amount: 1000000, name: 'SeenShown Seed Growth — AUD $10,000/seat',  mode: 'payment', currency: 'aud', success: '/investors.html?invested=1', cancel: '/investors.html' },
    investor_lead:   { amount: 10000000,name: 'SeenShown Seed Lead — AUD $100,000/seat',   mode: 'payment', currency: 'aud', success: '/investors.html?invested=1', cancel: '/investors.html' },
    /* Points bundles (USD, one-time) */
    points_100:  { amount: 1000,  name: 'SeenShown 100 Vote Points',  mode: 'payment', currency: 'usd', success: '/?points=100', cancel: '/community.html' },
    points_500:  { amount: 4500,  name: 'SeenShown 500 Vote Points',  mode: 'payment', currency: 'usd', success: '/?points=500', cancel: '/community.html' },
    points_1000: { amount: 8500,  name: 'SeenShown 1000 Vote Points', mode: 'payment', currency: 'usd', success: '/?points=1000', cancel: '/community.html' },
  };

  try {
    const body = req.body || {};
    const { tier, email, seats, amount: customAmount, investor_type, metadata } = body;

    /* USDT — return contact email instead of Stripe */
    if (tier === 'usdt') {
      return res.status(200).json({
        usdt: true,
        message: 'Contact invest@seenshown.com for USDT payment instructions.',
        wallet_note: 'We accept USDT (TRC-20 and ERC-20) for investment packages.'
      });
    }

    const price = PRICES[tier];
    if (!price) return res.status(400).json({ error: 'Invalid tier: ' + tier });

    /* For investor packages, multiply by seats */
    const isInvestor = tier.startsWith('investor_');
    const qty = isInvestor ? (parseInt(seats) || 1) : 1;
    const unitAmount = price.amount;

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', price.currency);
    params.append('line_items[0][price_data][product_data][name]', price.name);
    params.append('line_items[0][quantity]', String(qty));
    params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
    params.append('mode', price.mode);
    params.append('success_url', BASE_URL + price.success);
    params.append('cancel_url', BASE_URL + price.cancel);
    params.append('metadata[tier]', tier);
    params.append('metadata[seats]', String(qty));
    if (investor_type) params.append('metadata[investor_type]', investor_type);
    if (email) params.append('customer_email', email);

    /* Recurring interval for subscriptions */
    if (price.mode === 'subscription') {
      params.append('line_items[0][price_data][recurring][interval]', 'month');
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + STRIPE_SECRET,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!session.url) return res.status(500).json({ error: session.error?.message || 'Stripe error' });
    return res.status(200).json({ url: session.url });

  } catch (e) {
    console.error('Checkout error:', e);
    return res.status(500).json({ error: String(e) });
  }
}
