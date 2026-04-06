import { useRef } from 'react';
import { usePixiRenderer } from '../renderer/PixiRenderer';
import { useSimulationStore } from '../store/simulationStore';
import { EntityInspector } from './EntityInspector';

export function SimulationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  usePixiRenderer(containerRef);

  // All values via reactive subscriptions — no stale getState() calls
  const selectedEntity  = useSimulationStore(s => s.selectedEntity);
  const selectEntity    = useSimulationStore(s => s.selectEntity);
  const ui              = useSimulationStore(s => s.ui);
  const graph           = useSimulationStore(s => s.graph);
  const entityCount     = useSimulationStore(s => s.entityCount);   // ← reactive

  return (
    <div className="simulation-canvas-wrapper">
      {/* WebGL canvas mount point */}
      <div
        ref={containerRef}
        className="pixi-canvas"
        onClick={() => { if (selectedEntity) selectEntity(null); }}
      />

      {/* Entity count — updates every tick via reactive subscription */}
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
