import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export function NarrationPanel() {
  const { currentNarration, narrationHistory, graph } = useSimulationStore(s => ({
    currentNarration: s.currentNarration,
    narrationHistory: s.narrationHistory,
    graph: s.graph,
  }));

  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [narrationHistory.length]);

  if (!graph) return null;

  return (
    <div className="narration-panel" ref={panelRef}>
      {narrationHistory.length === 0 ? (
        <p className="narration-placeholder">
          Narration will appear here as the simulation runs...
        </p>
      ) : (
        <>
          {narrationHistory.slice(-3).map((hook, i) => (
            <p
              key={`${hook.tick}-${i}`}
              className={`narration-line ${i === narrationHistory.slice(-3).length - 1 ? 'narration-line--current' : 'narration-line--past'}`}
            >
              {hook.text}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
