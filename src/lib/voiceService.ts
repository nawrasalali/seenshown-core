// ========================================
// ELEVENLABS VOICE SERVICE
// Voice: Jeff (Mfk8L0DQ8Aj3aRtDY3oo)
// Model: eleven_turbo_v2_5 (lowest latency)
// ========================================

const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';
const DEFAULT_VOICE_ID = 'Mfk8L0DQ8Aj3aRtDY3oo'; // Jeff — warm, clear, educational

interface VoiceOptions {
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

class ElevenLabsService {
  private apiKey: string | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private queue: string[] = [];
  private isPlaying = false;
  private enabled = true;
  private muted = false;
  private voiceId = DEFAULT_VOICE_ID;
  private volume = 1.0;

  init(apiKey: string, voiceId?: string) {
    this.apiKey = apiKey;
    if (voiceId) this.voiceId = voiceId;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gainNode) this.gainNode.gain.value = muted ? 0 : this.volume;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && !this.muted) this.gainNode.gain.value = this.volume;
  }

  setVoice(voiceId: string) { this.voiceId = voiceId; }

  stop() {
    this.queue = [];
    this.isPlaying = false;
    try { this.currentSource?.stop(); } catch {}
    this.currentSource = null;
  }

  async speak(text: string, options: VoiceOptions = {}) {
    if (!this.enabled || !this.apiKey || !text.trim()) return;
    // Dedupe consecutive identical narrations
    if (this.queue[this.queue.length - 1] === text) return;
    this.queue.push(text);
    if (!this.isPlaying) this.processQueue(options);
  }

  private async processQueue(options: VoiceOptions) {
    if (!this.queue.length) { this.isPlaying = false; return; }
    this.isPlaying = true;
    const text = this.queue.shift()!;
    try {
      const buf = await this.fetchAudio(text, options);
      if (buf && this.enabled) await this.playBuffer(buf);
    } catch (err) {
      console.warn('[ElevenLabs] error:', err);
    }
    if (this.queue.length) this.processQueue(options);
    else this.isPlaying = false;
  }

  private async fetchAudio(text: string, options: VoiceOptions): Promise<AudioBuffer | null> {
    if (!this.apiKey || !this.audioContext) return null;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: {
              stability: options.stability ?? 0.55,
              similarity_boost: options.similarityBoost ?? 0.85,
              style: options.style ?? 0.15,
              use_speaker_boost: true,
            },
          }),
        }
      );
      if (!res.ok) { console.warn('[ElevenLabs]', res.status, await res.text()); return null; }
      const arr = await res.arrayBuffer();
      return await this.audioContext.decodeAudioData(arr);
    } catch (err) {
      console.warn('[ElevenLabs] fetch error:', err);
      return null;
    }
  }

  private playBuffer(buffer: AudioBuffer): Promise<void> {
    return new Promise(resolve => {
      if (!this.audioContext || !this.gainNode) { resolve(); return; }
      const src = this.audioContext.createBufferSource();
      src.buffer = buffer;
      src.connect(this.gainNode);
      src.onended = () => { this.currentSource = null; resolve(); };
      this.currentSource = src;
      src.start(0);
    });
  }
}

// Singleton — imported everywhere
export const voiceService = new ElevenLabsService();

// Called once on app mount
export function initVoice() {
  const key = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const voice = import.meta.env.VITE_ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  if (key) {
    voiceService.init(key, voice);
    console.log('[SeenShown] Voice ready — Jeff (ElevenLabs)');
  } else {
    console.warn('[SeenShown] VITE_ELEVENLABS_API_KEY not set — voice disabled');
  }
}

// Simple fire-and-forget speak call
export function speakNarration(text: string) {
  voiceService.speak(text, { stability: 0.55, similarityBoost: 0.85, style: 0.15 });
}
