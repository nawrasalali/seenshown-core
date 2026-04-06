// ============================================
// API CLIENT
// Typed wrapper around the SeenShown API
// ============================================

const API_BASE = import.meta.env.VITE_API_URL as string;

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch { /* empty */ }
    throw new APIError(
      res.status,
      body.message ?? body.error ?? `HTTP ${res.status}`,
      body.code
    );
  }

  return res.json() as Promise<T>;
}

// ---- Types ----

export interface SimulateRequest {
  query: string;
  domain?: 'biology' | 'social';
  templateId?: string;
  parameters?: Record<string, number>;
}

export interface SimulateResponse {
  templateId: string;
  confidence: number;
  parameterOverrides: Record<string, number>;
  narration: Array<{ tick: number; text: string }>;
  fallback: boolean;
  domain?: 'biology' | 'social';   // returned by server since session 7 fix
  message?: string;
  suggestion?: string;
}

export interface CheckoutRequest {
  priceId: string;
  userId: string;
}

export interface CheckoutResponse {
  sessionId: string;
}

export interface EmbedValidateRequest {
  apiKey: string;
  templateId: string;
}

export interface EmbedValidateResponse {
  valid: boolean;
  orgName?: string;
  tier?: string;
}

// ---- Methods ----

export const api = {
  simulate(body: SimulateRequest, authToken?: string): Promise<SimulateResponse> {
    return request<SimulateResponse>('/v1/simulate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
  },

  checkout(body: CheckoutRequest): Promise<CheckoutResponse> {
    return request<CheckoutResponse>('/v1/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  validateEmbed(body: EmbedValidateRequest): Promise<EmbedValidateResponse> {
    return request<EmbedValidateResponse>('/v1/embed/validate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  health(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },
};
