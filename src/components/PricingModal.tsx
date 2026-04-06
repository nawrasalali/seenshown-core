import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useUIStore } from '../store/uiStore';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  priceId: string;
  features: string[];
  highlight: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    priceId: '',
    features: [
      '5 simulations per day',
      'All 30 simulation templates',
      'Biology + Social domains',
      'Basic controls',
    ],
    highlight: false,
    cta: 'Get started',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    period: 'per month',
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID ?? '',
    features: [
      'Unlimited simulations',
      'No watermark',
      'Export narration script',
      'Parameter controls',
      'Priority support',
    ],
    highlight: true,
    cta: 'Start Pro',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49',
    period: 'per month',
    priceId: import.meta.env.VITE_STRIPE_TEAM_PRICE_ID ?? '',
    features: [
      'Everything in Pro',
      '5 team seats',
      'API access (100 calls/day)',
      'Custom templates',
      'Usage analytics',
    ],
    highlight: false,
    cta: 'Start Team',
  },
];

interface Props {
  onClose: () => void;
}

export function PricingModal({ onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const { userId, openAuthModal } = useUIStore(s => ({
    userId: s.userId,
    openAuthModal: s.openAuthModal,
  }));

  const handleCheckout = async (plan: Plan) => {
    if (!plan.priceId) {
      onClose();
      return;
    }

    if (!userId) {
      openAuthModal('signup');
      onClose();
      return;
    }

    setLoading(plan.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, userId }),
      });
      const { sessionId } = await res.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="pricing-header">
          <h2 className="pricing-title">Choose your plan</h2>
          <p className="pricing-sub">Understand anything. No limits.</p>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.highlight ? 'pricing-card--highlight' : ''}`}
            >
              {plan.highlight && (
                <div className="pricing-badge">Most popular</div>
              )}
              <div className="pricing-card__name">{plan.name}</div>
              <div className="pricing-card__price">
                <span className="price-amount">{plan.price}</span>
                <span className="price-period">{plan.period}</span>
              </div>
              <ul className="pricing-features">
                {plan.features.map(f => (
                  <li key={f} className="pricing-feature">
                    <span className="feature-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`pricing-cta ${plan.highlight ? 'pricing-cta--primary' : 'pricing-cta--ghost'}`}
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? 'Loading...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="pricing-footer">
          All plans include a 7-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
