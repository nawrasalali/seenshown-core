import { useState, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { useUIStore } from '../store/uiStore';

const SUGGESTED_QUERIES = [
  'How do antibiotics kill bacteria?',
  'Show me how a rumour spreads through a school',
  'What happens when a virus infects a cell?',
  'How does the immune system fight infection?',
  'Why does antibiotic resistance happen?',
  'Show me cell division',
  'How does peer pressure work in a crowd?',
  'What is the bystander effect?',
];

export function InputBox() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState(
    SUGGESTED_QUERIES[Math.floor(Math.random() * SUGGESTED_QUERIES.length)]
  );
  const recognitionRef = useRef<any>(null);

  const { loadSimulation, isLoading } = useSimulationStore(s => ({
    loadSimulation: s.loadSimulation,
    isLoading: s.isLoading,
  }));
  const addQuery = useUIStore(s => s.addQuery);

  const handleSubmit = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isLoading) return;
    addQuery(trimmed);
    await loadSimulation(trimmed);
    setQuery('');
    // Rotate suggestion
    setSuggestion(SUGGESTED_QUERIES[Math.floor(Math.random() * SUGGESTED_QUERIES.length)]);
  }, [isLoading, loadSimulation, addQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(query);
    }
  };

  const startVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setQuery(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        handleSubmit(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleSubmit]);

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="input-box">
      <div className="input-wrapper">
        <input
          type="text"
          className="query-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={suggestion}
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Voice button */}
        <button
          className={`voice-btn ${isListening ? 'voice-btn--active' : ''}`}
          onClick={isListening ? stopVoice : startVoice}
          title={isListening ? 'Stop listening' : 'Speak your question'}
          disabled={isLoading}
        >
          {isListening ? <MicActiveIcon /> : <MicIcon />}
        </button>

        {/* Submit button */}
        <button
          className="submit-btn"
          onClick={() => handleSubmit(query)}
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <ArrowIcon />
          )}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="loading-status">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-text">Building your simulation...</span>
        </div>
      )}

      {/* Suggested tags */}
      {!isLoading && (
        <div className="suggestion-pills">
          {SUGGESTED_QUERIES.slice(0, 4).map((q) => (
            <button
              key={q}
              className="suggestion-pill"
              onClick={() => handleSubmit(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
    <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5z"/>
  </svg>
);

const MicActiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mic-active">
    <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
    <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5z"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-7.5-3.5a.5.5 0 0 0-1 0V7.1L5.354 5.354a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 7.1V4.5z" transform="rotate(270 8 8)"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="spinner">
    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" opacity=".25"/>
    <path d="M7.25.75A.75.75 0 0 1 8 0a8 8 0 0 1 8 8 .75.75 0 0 1-1.5 0A6.5 6.5 0 0 0 8 1.5a.75.75 0 0 1-.75-.75z"/>
  </svg>
);
