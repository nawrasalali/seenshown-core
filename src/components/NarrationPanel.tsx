import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { speakNarration, voiceService } from '../lib/voiceService';

export function NarrationPanel() {
  const { currentNarration, narrationHistory, graph } = useSimulationStore(s => ({
    currentNarration: s.currentNarration,
    narrationHistory: s.narrationHistory,
    graph: s.graph,
  }));

  const panelRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>('');
  const [muted, setMuted] = useState(false);

  // Auto-scroll to latest narration
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [narrationHistory.length]);

  // Speak new narration via Jeff (ElevenLabs)
  useEffect(() => {
    if (!currentNarration || currentNarration === lastSpokenRef.current) return;
    lastSpokenRef.current = currentNarration;
    if (!muted) speakNarration(currentNarration);
  }, [currentNarration, muted]);

  // Stop voice when simulation ends or component unmounts
  useEffect(() => {
    return () => { voiceService.stop(); };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    voiceService.setMuted(next);
    if (next) voiceService.stop();
  };

  if (!graph) return null;

  return (
    <div className="narration-panel" ref={panelRef}>
      <div className="narration-header">
        <span className="narration-label">Narration</span>
        <button
          className={`narration-mute-btn ${muted ? 'muted' : ''}`}
          onClick={toggleMute}
          title={muted ? 'Unmute Jeff' : 'Mute Jeff'}
          aria-label={muted ? 'Unmute voice' : 'Mute voice'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

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
