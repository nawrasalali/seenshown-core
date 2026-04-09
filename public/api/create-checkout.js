export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const PRICES = {
    scholar:      { amount: 900,   name: 'SeenShown Scholar — $9/month' },
    studio:       { amount: 2900,  name: 'SeenShown Studio — $29/month' },
    institutional:{ amount: 49900, name: 'SeenShown Institutional — $499/month' },
  };

  try {
    const { tier, email } = req.body || {};
    const price = PRICES[tier];
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
    if (email) params.append('customer_email', email);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!session.url) return res.status(500).json({ error: session.error?.message || 'Stripe error' });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
