/* SeenShown — SAFE PDF Auto-Generation
   Triggered by stripe-webhook when investor_entry/growth/lead completes
   Generates a SAFE agreement PDF and emails it to the investor */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = 'invest@seenshown.com';

  try {
    const { email, package: pkg, seats, amount, investor_type, session_id } = req.body || {};

    if (!email || !pkg) return res.status(400).json({ error: 'Missing required fields' });

    const pkgNames = { entry: 'Seed Entry', growth: 'Seed Growth', lead: 'Seed Lead' };
    const pkgName = pkgNames[pkg] || pkg;
    const totalAUD = amount || (pkg === 'entry' ? 1000 : pkg === 'growth' ? 10000 : 100000) * (seats || 1);
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const investorRef = 'SS-' + Date.now().toString(36).toUpperCase();

    /* Generate SAFE PDF content as HTML (Resend will render it) */
    const safeHTML = `
<!DOCTYPE html>
<html>
<head><style>
  body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:40px;color:#111;line-height:1.7}
  h1{font-size:1.4rem;border-bottom:2px solid #111;padding-bottom:.5rem;margin-bottom:1.5rem}
  h2{font-size:1rem;margin-top:1.5rem;margin-bottom:.3rem}
  .header{text-align:center;margin-bottom:2rem}
  .ref{font-size:.85rem;color:#555;margin-bottom:1.5rem}
  .parties{background:#f9f9f9;border:1px solid #ddd;padding:1rem;margin:1rem 0;border-radius:4px}
  .terms{margin-top:1.5rem}
  .sig{margin-top:3rem;display:flex;justify-content:space-between}
  .sig-block{width:45%}
  .sig-line{border-bottom:1px solid #111;margin-top:2rem;margin-bottom:.3rem}
  footer{margin-top:3rem;font-size:.75rem;color:#777;border-top:1px solid #ddd;padding-top:1rem;text-align:center}
</style></head>
<body>
<div class="header">
  <h1>SIMPLE AGREEMENT FOR FUTURE EQUITY</h1>
  <div><strong>SeenShown — Seed Round · Strategic Entry</strong></div>
</div>
<div class="ref">Reference: ${investorRef} · Date: ${today} · Session: ${session_id || 'N/A'}</div>

<div class="parties">
  <h2>PARTIES</h2>
  <p><strong>Company:</strong> A.C.N. 675 668 710 PTY LTD trading as SeenShown<br>
  ABN: 21 675 668 710 · Registered in South Australia, Australia</p>
  <p><strong>Investor:</strong> ${email}<br>
  Investor Type: ${investor_type || 'Not specified'}<br>
  Package: ${pkgName} · Seats: ${seats || 1} · Investment: AUD $${totalAUD.toLocaleString()}</p>
</div>

<div class="terms">
  <h2>1. INVESTMENT AMOUNT</h2>
  <p>The Investor agrees to invest AUD $${totalAUD.toLocaleString()} (the "Purchase Amount") in exchange for the right to receive equity in the Company, subject to the terms of this SAFE.</p>

  <h2>2. VALUATION CAP</h2>
  <p>This SAFE has a post-money valuation cap of AUD $8,000,000 (eight million Australian dollars). Upon a Priced Round, this SAFE converts at the lower of (a) the Cap Price or (b) the Discount Price.</p>

  <h2>3. DISCOUNT RATE</h2>
  <p>The Investor receives a 20% discount on the Series A price. The Discount Price = Series A Price × 0.80.</p>

  <h2>4. PRO-RATA RIGHTS</h2>
  <p>The Investor has the right (but not the obligation) to participate in the next Priced Round up to their Pro-Rata Percentage of the post-money capitalisation table.</p>

  <h2>5. INFORMATION RIGHTS</h2>
  <p>SeenShown will provide quarterly written updates including: user metrics, revenue figures, and material business developments to all SAFE holders.</p>

  <h2>6. CONVERSION EVENTS</h2>
  <p>This SAFE converts upon: (a) Equity Financing (Series A or equivalent), (b) Liquidity Event (acquisition or IPO), or (c) Dissolution Event, whichever occurs first.</p>

  <h2>7. NO GUARANTEED RETURNS</h2>
  <p>This investment carries significant risk including total loss of capital. SeenShown makes no representation regarding future valuation, revenue, or liquidity events. The investor may lose their entire investment.</p>

  <h2>8. GOVERNING LAW</h2>
  <p>This SAFE is governed by the laws of New South Wales, Australia. Disputes will be resolved by arbitration in Sydney under ACICA rules.</p>

  <h2>9. ENTIRE AGREEMENT</h2>
  <p>This SAFE constitutes the entire agreement between the parties regarding the subject matter herein and supersedes all prior negotiations.</p>
</div>

<div class="sig">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div><strong>A.C.N. 675 668 710 PTY LTD</strong></div>
    <div>Nawras Alali, Director</div>
    <div>Date: ${today}</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div><strong>Investor</strong></div>
    <div>${email}</div>
    <div>Date: ${today}</div>
  </div>
</div>

<footer>
  Patent Pending AU 2026903218 · ABN: 21 675 668 710 · invest@seenshown.com<br>
  This SAFE is a legally binding instrument under Australian law. Investor reference: ${investorRef}
</footer>
</body>
</html>`;

    /* Send via Resend */
    if (RESEND_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email, 'nawraselali@gmail.com'],
          subject: `Your SeenShown SAFE Agreement — ${pkgName} · AUD $${totalAUD.toLocaleString()}`,
          html: `
            <p>Dear Investor,</p>
            <p>Thank you for investing in SeenShown. Your SAFE agreement is attached below.</p>
            <p><strong>Investment Reference:</strong> ${investorRef}<br>
            <strong>Package:</strong> ${pkgName}<br>
            <strong>Amount:</strong> AUD $${totalAUD.toLocaleString()}<br>
            <strong>Date:</strong> ${today}</p>
            <p>You will receive quarterly updates at this email address. Your pro-rata rights and Series A priority access are now active.</p>
            <p>For any questions: <a href="mailto:invest@seenshown.com">invest@seenshown.com</a></p>
            <hr/>
            ${safeHTML}
          `
        })
      });
      const emailData = await emailRes.json();
      if (emailData.error) throw new Error(emailData.error.message);
    }

    /* Update Supabase — mark as completed with ref */
    const SB_URL = 'https://jnvdpmmxlbkxwanqqhfw.supabase.co';
    const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (SB_KEY) {
      await fetch(`${SB_URL}/rest/v1/investor_registrations?email=eq.${encodeURIComponent(email)}&status=eq.pending`, {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', investor_ref: investorRef, safe_sent_at: new Date().toISOString() })
      });
    }

    return res.status(200).json({ success: true, ref: investorRef });

  } catch (e) {
    console.error('SAFE generation error:', e);
    return res.status(500).json({ error: String(e) });
  }
}
