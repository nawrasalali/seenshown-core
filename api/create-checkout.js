export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

  const SUB_PRICES = {
    scholar:       { amount: 900,   name: 'SeenShown Scholar — $9/month',        mode: 'subscription' },
    studio:        { amount: 2900,  name: 'SeenShown Studio — $29/month',         mode: 'subscription' },
    institutional: { amount: 49900, name: 'SeenShown Institutional — $499/month', mode: 'subscription' },
  };

  const INVESTOR_PRICES = {
    investor_entry:  { amount: 100000,   name: 'SeenShown Seed Entry — $1,000/seat' },
    investor_growth: { amount: 1000000,  name: 'SeenShown Seed Growth — $10,000/seat' },
    investor_lead:   { amount: 10000000, name: 'SeenShown Seed Lead — $100,000/seat' },
  };

  try {
    const { tier, seats, investorType } = req.body || {};

    if (tier && tier.startsWith('investor_')) {
      const pkg = INVESTOR_PRICES[tier];
      if (!pkg) return res.status(400).json({ error: 'invalid investor package' });
      const qty = Math.min(Math.max(parseInt(seats) || 1, 1), 9);
      const params = new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'aud',
        'line_items[0][price_data][product_data][name]': pkg.name,
        'line_items[0][price_data][unit_amount]': String(pkg.amount),
        'line_items[0][quantity]': String(qty),
        'mode': 'payment',
        'success_url': 'https://seenshown.com/investors.html?invested=1',
        'cancel_url': 'https://seenshown.com/investors.html',
        'metadata[package]': tier.replace('investor_', ''),
        'metadata[seats]': String(qty),
        'metadata[investor_type]': investorType || 'unknown',
        'metadata[type]': 'investor',
      });
      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + STRIPE_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const session = await stripeRes.json();
      if (!session.url) return res.status(500).json({ error: session.error?.message || 'Stripe error' });
      return res.status(200).json({ url: session.url });
    }

    const price = SUB_PRICES[tier];
    if (!price) return res.status(400).json({ error: 'invalid tier' });
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': price.name,
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][unit_amount]': String(price.amount),
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': 'https://seenshown.com/community.html?subscribed=1',
      'cancel_url': 'https://seenshown.com/community.html',
      'metadata[tier]': tier,
    });
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + STRIPE_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await stripeRes.json();
    if (!session.url) return res.status(500).json({ error: session.error?.message || 'Stripe error' });
    return res.status(200).json({ url: session.url });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
