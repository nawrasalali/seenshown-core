import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SimulationCanvas } from '../components/SimulationCanvas';
import { ControlBar } from '../components/ControlBar';
import { NarrationPanel } from '../components/NarrationPanel';
import { useSimulationStore } from '../store/simulationStore';

// Embed-specific route — stripped down UI for iframe use
export function EmbedPage() {
  const [params] = useSearchParams();
  const templateId = params.get('template') ?? '';
  const theme      = params.get('theme') ?? 'dark';
  const controls   = (params.get('controls') ?? 'pause,replay').split(',');
  const apiKey     = params.get('key') ?? '';

  const { loadSimulation, graph } = useSimulationStore(s => ({
    loadSimulation: s.loadSimulation,
    graph: s.graph,
  }));

  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !templateId) return;
    loaded.current = true;
    // Pass templateId directly to skip LLM classification — embed knows exactly what to load
    loadSimulation(templateId, templateId);
  }, [templateId, loadSimulation]);

  // PostMessage control API
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'control') return;
      const store = useSimulationStore.getState();
      switch (e.data.action) {
        case 'pause':   store.pause(); break;
        case 'play':    store.play(); break;
        case 'replay':  store.replay(); break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="embed-shell" data-theme={theme}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <SimulationCanvas />
      </div>

      {/* Minimal control strip */}
      <div className="embed-controls-strip">
        {controls.includes('pause') && <ControlBar />}
        {controls.includes('narration') && <NarrationPanel />}
      </div>

      {/* Watermark for free tier */}
      {!apiKey.startsWith('pk_live') && (
        <a
          href="https://seenshown.com"
          target="_blank"
          rel="noopener noreferrer"
          className="embed-watermark"
        >
          Powered by SeenShown
        </a>
      )}
    </div>
  );
}
