import { useSimulationStore } from '../store/simulationStore';

export function ControlBar() {
  const {
    ui, graph,
    play, pause, replay,
    scrubTo, setSpeed, setZoom, toggleAudio,
    toggleParameters,
  } = useSimulationStore(s => ({
    ui: s.ui,
    graph: s.graph,
    play: s.play,
    pause: s.pause,
    replay: s.replay,
    scrubTo: s.scrubTo,
    setSpeed: s.setSpeed,
    setZoom: s.setZoom,
    toggleAudio: s.toggleAudio,
    toggleParameters: s.toggleParameters,
  }));

  if (!graph) return null;

  const progress = ui.maxTick > 0 ? ui.currentTick / ui.maxTick : 0;
  const isPlaying = ui.playback === 'playing';
  const isComplete = ui.playback === 'complete';

  const formatTime = (tick: number) => {
    const secs = Math.floor(tick / 60);
    return `${secs}s`;
  };

  return (
    <div className="control-bar">
      {/* Left: Playback controls */}
      <div className="control-group control-group--left">
        {isComplete ? (
          <button className="ctrl-btn ctrl-btn--primary" onClick={replay} title="Replay">
            <ReplayIcon />
          </button>
        ) : (
          <>
            <button
              className="ctrl-btn ctrl-btn--primary"
              onClick={isPlaying ? pause : play}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="ctrl-btn" onClick={replay} title="Restart">
              <RestartIcon />
            </button>
          </>
        )}
      </div>

      {/* Center: Timeline scrubber */}
      <div className="control-group control-group--center">
        <span className="time-label">{formatTime(ui.currentTick)}</span>
        <div className="scrubber-track">
          <input
            type="range"
            className="scrubber"
            min={0}
            max={ui.maxTick}
            value={ui.currentTick}
            onChange={(e) => scrubTo(Number(e.target.value))}
          />
          <div
            className="scrubber-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="time-label">{formatTime(ui.maxTick)}</span>
      </div>

      {/* Right: Speed, Zoom, Audio, Params */}
      <div className="control-group control-group--right">
        {/* Speed selector */}
        <div className="speed-selector">
          {([1, 2, 4, 8] as const).map(s => (
            <button
              key={s}
              className={`speed-btn ${ui.speed === s ? 'speed-btn--active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Zoom */}
        <button className="ctrl-btn" onClick={() => setZoom(ui.zoom + 0.25)} title="Zoom in">
          <ZoomInIcon />
        </button>
        <button className="ctrl-btn" onClick={() => setZoom(ui.zoom - 0.25)} title="Zoom out">
          <ZoomOutIcon />
        </button>

        {/* Audio */}
        <button
          className={`ctrl-btn ${!ui.audioEnabled ? 'ctrl-btn--muted' : ''}`}
          onClick={toggleAudio}
          title={ui.audioEnabled ? 'Mute narration' : 'Unmute narration'}
        >
          {ui.audioEnabled ? <AudioOnIcon /> : <AudioOffIcon />}
        </button>

        {/* Parameters (expert mode) */}
        <button
          className={`ctrl-btn ${ui.parametersVisible ? 'ctrl-btn--active' : ''}`}
          onClick={toggleParameters}
          title="Adjust parameters"
        >
          <ParamsIcon />
        </button>
      </div>
    </div>
  );
}

// SVG Icons
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="3" y="2" width="4" height="12" rx="1"/>
    <rect x="9" y="2" width="4" height="12" rx="1"/>
  </svg>
);

const ReplayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
  </svg>
);

const RestartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
    <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
  </svg>
);

const ZoomInIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
    <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
    <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z"/>
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
    <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
    <path fillRule="evenodd" d="M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
  </svg>
);

const AudioOnIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
    <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
  </svg>
);

const AudioOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z"/>
  </svg>
);

const ParamsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    <path d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0z"/>
  </svg>
);
