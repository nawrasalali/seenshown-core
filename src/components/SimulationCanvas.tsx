import { useRef, useEffect } from 'react';
import { usePixiRenderer } from '../renderer/PixiRenderer';
import { useSimulationStore, runtime } from '../store/simulationStore';
import { EntityInspector } from './EntityInspector';

// Warm up Railway API on load so first simulation is instant
const API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL) {
  fetch(API_URL + '/health', { method: 'GET' }).catch(() => {});
}

export function SimulationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { renderFrame } = usePixiRenderer(containerRef);
  const rafRef = useRef<number>(0);

  const selectedEntity = useSimulationStore(s => s.selectedEntity);
  const selectEntity   = useSimulationStore(s => s.selectEntity);
  const ui             = useSimulationStore(s => s.ui);
  const graph          = useSimulationStore(s => s.graph);
  const entityCount    = useSimulationStore(s => s.entityCount);

  // THE KEY FIX: Drive the render loop with requestAnimationFrame
  // Without this, renderFrame() is never called and nothing appears
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      renderFrame();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [renderFrame]);

  return (
    <div className="simulation-canvas-wrapper">
      {/* WebGL canvas mount point */}
      <div
        ref={containerRef}
        className="pixi-canvas"
        onClick={() => { if (selectedEntity) selectEntity(null); }}
      />

      {/* Entity count badge */}
      {graph && (
        <div className="entity-overlay">
          <span className="entity-count-badge">{entityCount} entities</span>
        </div>
      )}

      {/* Domain + title badge */}
      {graph && (
        <div className="domain-badge">
          <span className={`badge badge--${graph.domain}`}>
            {graph.domain === 'biology' ? '🔬 Biology' : '👥 Social'}
          </span>
          <span className="badge badge--label">{graph.title}</span>
        </div>
      )}

      {/* Loading overlay — shown while API wakes up */}
      {!graph && (
        <div className="canvas-loading-overlay">
          <div className="canvas-loading-spinner" />
          <p className="canvas-loading-text">Building simulation...</p>
        </div>
      )}

      {/* Entity inspector panel */}
      {selectedEntity && (
        <EntityInspector
          entity={selectedEntity}
          onClose={() => selectEntity(null)}
        />
      )}

      {/* Zoom level indicator */}
      {ui.zoom !== 1 && (
        <div className="zoom-indicator">{Math.round(ui.zoom * 100)}%</div>
      )}
    </div>
  );
}
