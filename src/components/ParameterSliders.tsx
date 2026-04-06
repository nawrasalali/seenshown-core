import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export function ParameterSliders() {
  const graph             = useSimulationStore(s => s.graph);
  const ui                = useSimulationStore(s => s.ui);
  const updateParameters  = useSimulationStore(s => s.updateParameters);

  const [localParams, setLocalParams] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty]         = useState(false);

  if (!graph || !ui.parametersVisible) return null;

  const params = graph.parameters as Record<string, any>;
  if (!params || Object.keys(params).length === 0) return null;

  // Merged view: template defaults overridden by any local edits
  const templateDefs = (graph as any).parameters ?? {};
  const currentParams: Record<string, number> = {};
  for (const [k, def] of Object.entries(templateDefs)) {
    currentParams[k] = localParams[k] ?? (def as any).default ?? 0;
  }

  const handleChange = (key: string, value: number) => {
    setLocalParams(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleApply = () => {
    updateParameters(localParams);   // writes params + respawns + restarts
    setIsDirty(false);
    setLocalParams({});              // reset local edits — graph now has them
  };

  const handleReset = () => {
    setLocalParams({});
    setIsDirty(false);
  };

  return (
    <div className="param-panel">
      <div className="param-panel__header">
        <span className="param-panel__title">Parameters</span>
        <span className="param-panel__subtitle">Adjust and restart</span>
      </div>

      <div className="param-list">
        {Object.entries(params).map(([key, def]) => {
          const d = def as any;
          const value = currentParams[key] ?? d.default;
          const pct = ((value - d.min) / (d.max - d.min)) * 100;

          return (
            <div key={key} className="param-item">
              <div className="param-item__header">
                <label className="param-item__label">{d.label}</label>
                <span className="param-item__value">
                  {d.type === 'float' ? value.toFixed(2) : value}
                </span>
              </div>
              {d.description && (
                <p className="param-item__desc">{d.description}</p>
              )}
              <div className="param-slider-track">
                <input
                  type="range"
                  className="param-slider"
                  min={d.min}
                  max={d.max}
                  step={d.step ?? (d.type === 'float' ? 0.01 : 1)}
                  value={value}
                  onChange={e => handleChange(key, Number(e.target.value))}
                />
                <div
                  className="param-slider-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="param-range-labels">
                <span>{d.min}</span>
                <span>{d.max}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="param-actions">
        {isDirty && (
          <>
            <button className="param-btn param-btn--ghost" onClick={handleReset}>
              Reset
            </button>
            <button className="param-btn param-btn--primary" onClick={handleApply}>
              Restart with changes
            </button>
          </>
        )}
        {!isDirty && (
          <p className="param-hint">Adjust sliders above then restart</p>
        )}
      </div>
    </div>
  );
}
