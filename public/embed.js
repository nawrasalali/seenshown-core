/**
 * SeenShown Embed Script
 * cdn.seenshown.com/embed.js
 *
 * Usage:
 * <script
 *   src="https://cdn.seenshown.com/embed.js"
 *   data-key="pk_your_api_key"
 *   data-template="antibiotic_killing_bacteria"
 *   data-theme="dark"
 *   data-controls="pause,replay,zoom"
 *   data-height="500">
 * </script>
 */

(function () {
  'use strict';

  const EMBED_ORIGIN = 'https://app.seenshown.com';
  const API_ORIGIN   = 'https://api.seenshown.com';

  // ---- Resolve current script attributes ----
  const scripts = document.querySelectorAll('script[data-key]');
  const currentScript = scripts[scripts.length - 1];

  if (!currentScript) return;

  const apiKey     = currentScript.getAttribute('data-key') || '';
  const templateId = currentScript.getAttribute('data-template') || '';
  const theme      = currentScript.getAttribute('data-theme') || 'dark';
  const controls   = (currentScript.getAttribute('data-controls') || 'pause,replay').split(',').map(s => s.trim());
  const height     = parseInt(currentScript.getAttribute('data-height') || '500', 10);
  const width      = currentScript.getAttribute('data-width') || '100%';

  if (!apiKey) {
    console.error('[SeenShown] Missing data-key attribute');
    return;
  }

  if (!templateId) {
    console.error('[SeenShown] Missing data-template attribute');
    return;
  }

  // ---- Validate API key with server ----
  async function validateAndEmbed() {
    try {
      const res = await fetch(`${API_ORIGIN}/v1/embed/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, templateId }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('[SeenShown] Embed validation failed:', err.error);
        renderError(err.error || 'Invalid API key');
        return;
      }

      renderEmbed();
    } catch (e) {
      // Fallback: render with URL params, server validates inside iframe
      renderEmbed();
    }
  }

  // ---- Build iframe ----
  function renderEmbed() {
    const params = new URLSearchParams({
      template: templateId,
      theme,
      controls: controls.join(','),
      key: apiKey,
      embed: '1',
    });

    const iframe = document.createElement('iframe');
    iframe.src = `${EMBED_ORIGIN}/embed?${params.toString()}`;
    iframe.style.cssText = `
      width: ${typeof width === 'number' ? width + 'px' : width};
      height: ${height}px;
      border: none;
      border-radius: 12px;
      display: block;
      background: ${theme === 'dark' ? '#080C18' : '#F8FAFC'};
    `;
    iframe.title = `SeenShown Simulation: ${templateId.replace(/_/g, ' ')}`;
    iframe.allow = 'autoplay; web-share';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('data-seenshown', 'true');

    // Replace script tag with iframe
    const container = document.createElement('div');
    container.setAttribute('data-seenshown-container', templateId);
    container.style.cssText = `
      width: ${typeof width === 'number' ? width + 'px' : width};
      position: relative;
      background: ${theme === 'dark' ? '#080C18' : '#F8FAFC'};
      border-radius: 12px;
      overflow: hidden;
    `;

    // Loading placeholder
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      height: ${height}px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme === 'dark' ? '#475569' : '#94A3B8'};
      font-family: monospace;
      font-size: 12px;
      letter-spacing: 0.05em;
    `;
    placeholder.textContent = 'LOADING SIMULATION...';

    container.appendChild(placeholder);
    currentScript.parentNode?.insertBefore(container, currentScript);

    iframe.onload = () => {
      placeholder.remove();
      container.appendChild(iframe);
    };

    // Start loading
    const preload = new Image();
    preload.src = iframe.src;
    setTimeout(() => {
      placeholder.remove();
      container.appendChild(iframe);
    }, 100);
  }

  function renderError(message) {
    const div = document.createElement('div');
    div.style.cssText = `
      width: ${typeof width === 'number' ? width + 'px' : width};
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 8px;
      color: #FCA5A5;
      font-family: monospace;
      font-size: 12px;
    `;
    div.textContent = `[SeenShown] ${message}`;
    currentScript.parentNode?.insertBefore(div, currentScript);
  }

  // ---- PostMessage API for host page control ----
  window.addEventListener('message', (event) => {
    if (event.origin !== EMBED_ORIGIN) return;
    const { type, templateId: tid, data } = event.data || {};

    // Forward events to host via custom events
    const container = document.querySelector(`[data-seenshown-container="${tid}"]`);
    if (!container) return;

    container.dispatchEvent(new CustomEvent(`seenshown:${type}`, { detail: data, bubbles: true }));
  });

  // ---- Public API on window ----
  window.SeenShown = {
    version: '1.0.0',
    /**
     * Programmatically control an embed
     * SeenShown.control('antibiotic_killing_bacteria', 'pause')
     */
    control(templateIdParam, action) {
      const iframe = document.querySelector(`[data-seenshown-container="${templateIdParam}"] iframe`);
      if (!iframe) return;
      iframe.contentWindow?.postMessage({ type: 'control', action }, EMBED_ORIGIN);
    },
  };

  // ---- Init ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', validateAndEmbed);
  } else {
    validateAndEmbed();
  }
})();
