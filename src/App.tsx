import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import { SimulationCanvas }       from './components/SimulationCanvas';
import { ControlBar }             from './components/ControlBar';
import { NarrationPanel }         from './components/NarrationPanel';
import { InputBox }               from './components/InputBox';
import { ParameterSliders }       from './components/ParameterSliders';
import { AuthModal }              from './components/AuthModal';
import { PricingModal }           from './components/PricingModal';
import { SimulationLibrary }      from './components/SimulationLibrary';
import { SimulationErrorBoundary } from './components/ErrorBoundary';
import { EmbedPage }              from './pages/EmbedPage';
import { AuthCallback }           from './pages/AuthCallback';
import { useSimulationStore }     from './store/simulationStore';
import { useUIStore }             from './store/uiStore';

// ---- Main product page ----
function MainApp() {
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Reactive subscriptions — no stale getState() in render
  const isLoading      = useSimulationStore(s => s.isLoading);
  const graph          = useSimulationStore(s => s.graph);
  const loadError      = useSimulationStore(s => s.loadError);
  const playback       = useSimulationStore(s => s.ui.playback);
  const paramsVisible  = useSimulationStore(s => s.ui.parametersVisible);
  const title          = useSimulationStore(s => s.graph?.title ?? '');
  const replay         = useSimulationStore(s => s.replay);

  const showAuthModal  = useUIStore(s => s.showAuthModal);
  const userId         = useUIStore(s => s.userId);
  const userTier       = useUIStore(s => s.userTier);
  const openAuthModal  = useUIStore(s => s.openAuthModal);

  const hasSimulation  = graph !== null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const store = useSimulationStore.getState();  // getState() ok in event handler, not render
      switch (e.key) {
        case ' ':
          e.preventDefault();
          store.ui.playback === 'playing' ? store.pause() : store.play();
          break;
        case 'r': case 'R':
          store.replay();
          break;
        case '+': case '=':
          store.setZoom(store.ui.zoom + 0.25);
          break;
        case '-':
          store.setZoom(store.ui.zoom - 0.25);
          break;
        case 'Escape':
          store.selectEntity(null);
          setShowLibrary(false);
          setShowPricing(false);
          break;
        case 'l': case 'L':
          setShowLibrary(v => !v);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="app">

      {/* ── Top navigation bar ── */}
      <header className="topbar">
        <a href="/" className="topbar-logo">
          <div className="topbar-logo-mark">S</div>
          SeenShown
        </a>

        <nav className="topbar-nav">
          <button
            className="topbar-btn"
            onClick={() => setShowLibrary(true)}
            title="Browse all 30 simulations (L)"
          >
            Library
          </button>

          {userId ? (
            <button
              className="topbar-btn"
              onClick={() => setShowPricing(true)}
            >
              {userTier === 'free' ? '↑ Upgrade' : `✓ ${userTier}`}
            </button>
          ) : (
            <>
              <button
                className="topbar-btn"
                onClick={() => openAuthModal('signin')}
              >
                Sign in
              </button>
              <button
                className="topbar-btn topbar-btn--primary"
                onClick={() => setShowPricing(true)}
              >
                Go Pro — $12/mo
              </button>
            </>
          )}
        </nav>
      </header>

      {/* ── Main simulation layout ── */}
      <main className="main-layout">

        {/* Simulation canvas — takes remaining vertical space */}
        <div style={{ position: 'relative', overflow: 'hidden', flex: 1, minHeight: 0 }}>
          <SimulationErrorBoundary>
            <SimulationCanvas />
          </SimulationErrorBoundary>

          {/* Empty state — shown when no simulation is loaded */}
          {!hasSimulation && !isLoading && (
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              <div className="empty-state-text">
                Type a question below or press <kbd style={{ background:'#1a2235', padding:'2px 6px', borderRadius:4, fontFamily:'monospace', fontSize:11 }}>L</kbd> to browse
              </div>
            </div>
          )}

          {/* Simulation complete overlay */}
          {playback === 'complete' && (
            <div className="complete-overlay">
              <div className="complete-card">
                <h2 className="complete-title">Simulation complete</h2>
                <p className="complete-sub">{title}</p>
                <div className="complete-actions">
                  <button className="btn btn--primary" onClick={replay}>
                    Replay
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => setShowLibrary(true)}
                  >
                    Browse library
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expert mode parameter sliders */}
          {paramsVisible && <ParameterSliders />}
        </div>

        {/* Controls row */}
        <ControlBar />

        {/* Narration text */}
        <NarrationPanel />

        {/* Error feedback */}
        {loadError && (
          <div style={{ padding: '0 16px 4px' }}>
            <div className="error-banner">
              ⚠ {loadError} — try rephrasing or press L to browse
            </div>
          </div>
        )}

        {/* Query input */}
        <InputBox />

        {/* Educational disclaimer */}
        <p className="disclaimer">
          EDUCATIONAL MODEL — SIMPLIFIED FOR CLARITY · © 2025 SEENSHOWN
        </p>

      </main>

      {/* ── Modals (rendered outside main layout) ── */}
      {showAuthModal  && <AuthModal />}
      {showPricing    && <PricingModal onClose={() => setShowPricing(false)} />}
      {showLibrary    && <SimulationLibrary onClose={() => setShowLibrary(false)} />}

    </div>
  );
}

// ── Root router ──
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<MainApp />} />
        <Route path="/embed"          element={<EmbedPage />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
