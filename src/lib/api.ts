// ========================================
// SeenShown API Client
// ========================================

const API_URL = import.meta.env.VITE_API_URL || 'https://seenshown-api-production.up.railway.app';

// ---- Keep-alive ping every 10 minutes so Railway never sleeps ----
let pingInterval: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive() {
  if (pingInterval) return;
  // Ping immediately to warm up on first load
  fetch(API_URL + '/health').catch(() => {});
  // Then every 10 minutes
  pingInterval = setInterval(() => {
    fetch(API_URL + '/health').catch(() => {});
  }, 10 * 60 * 1000);
}

export function stopKeepAlive() {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
}

// ---- Simulate ----
export interface SimulateResponse {
  templateId: string;
  confidence: number;
  parameterOverrides: Record<string, unknown>;
  narration: Array<{ tick: number; text: string }>;
  fallback: boolean;
  domain: 'biology' | 'social';
}

export async function simulate(query: string, templateId?: string): Promise<SimulateResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(API_URL + '/v1/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, templateId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `API error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  }
}

// ---- Templates ----
export async function fetchTemplates() {
  const res = await fetch(API_URL + '/v1/templates');
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

// ---- Checkout ----
export async function createCheckoutSession(priceId: string, userId: string) {
  const res = await fetch(API_URL + '/v1/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId }),
  });
  if (!res.ok) throw new Error('Failed to create checkout session');
  return res.json();
}
