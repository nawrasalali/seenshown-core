// ============================================
// ANALYTICS & ERROR TRACKING
// Posthog (events) + Sentry (errors)
// All tracking is opt-in and GDPR-safe
// ============================================

// ---- Sentry ----
// Install: npm install @sentry/react
// Then uncomment and add your DSN:
//
// import * as Sentry from '@sentry/react';
// Sentry.init({
//   dsn: import.meta.env.VITE_SENTRY_DSN,
//   environment: import.meta.env.MODE,
//   release: 'seenshown@0.1.0',
//   tracesSampleRate: 0.05,
//   ignoreErrors: [
//     'ResizeObserver loop',
//     'Non-Error promise rejection',
//   ],
// });
//
// export const captureError = Sentry.captureException;
export const captureError = (err: unknown) => {
  if (import.meta.env.DEV) console.error('[Error]', err);
};

// ---- Posthog ----
// Install: npm install posthog-js
// Then uncomment:
//
// import posthog from 'posthog-js';
// posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
//   api_host: 'https://app.posthog.com',
//   capture_pageview: false,
//   persistence: 'localStorage',
//   autocapture: false,
// });
//
// const ph = posthog;

// Stub for dev — replace with real posthog instance
const ph = {
  capture: (event: string, props?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.log(`[Analytics] ${event}`, props);
  },
  identify: (id: string, traits?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.log(`[Analytics] identify ${id}`, traits);
  },
  reset: () => {
    if (import.meta.env.DEV) console.log('[Analytics] reset');
  },
};

// ---- Typed event catalogue ----
export const track = {
  simulationStarted(templateId: string, domain: string, source: 'input' | 'library' | 'suggestion') {
    ph.capture('simulation_started', { templateId, domain, source });
  },

  simulationCompleted(templateId: string, ticksReached: number, totalTicks: number) {
    const completionPct = Math.round((ticksReached / totalTicks) * 100);
    ph.capture('simulation_completed', { templateId, completionPct });
  },

  entityClicked(entityType: string, entityState: string) {
    ph.capture('entity_clicked', { entityType, entityState });
  },

  narrationHeard(tick: number, templateId: string) {
    ph.capture('narration_heard', { tick, templateId });
  },

  libraryOpened() {
    ph.capture('library_opened');
  },

  libraryItemSelected(templateId: string, domain: string) {
    ph.capture('library_item_selected', { templateId, domain });
  },

  upgradeClicked(source: 'topbar' | 'limit_reached' | 'complete_overlay') {
    ph.capture('upgrade_clicked', { source });
  },

  upgradeCompleted(tier: 'pro' | 'team') {
    ph.capture('upgrade_completed', { tier });
  },

  signupStarted(method: 'email' | 'google') {
    ph.capture('signup_started', { method });
  },

  signupCompleted(method: 'email' | 'google') {
    ph.capture('signup_completed', { method });
  },

  signIn() {
    ph.capture('sign_in');
  },

  querySubmitted(queryLength: number, isVoice: boolean) {
    ph.capture('query_submitted', { queryLength, isVoice });
  },

  queryFailed(error: string) {
    ph.capture('query_failed', { error });
  },

  parameterAdjusted(templateId: string, paramKey: string) {
    ph.capture('parameter_adjusted', { templateId, paramKey });
  },

  embedLoaded(templateId: string, partner: string) {
    ph.capture('embed_loaded', { templateId, partner });
  },

  identify(userId: string, tier: string) {
    ph.identify(userId, { tier });
  },

  reset() {
    ph.reset();
  },
};
