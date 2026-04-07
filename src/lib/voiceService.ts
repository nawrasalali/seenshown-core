// ========================================
// ELEVENLABS VOICE SERVICE
// Streams narration text to speech
// ========================================

const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

interface VoiceOptions {
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

class ElevenLabsService {
  private apiKey: string | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private queue: string[] = [];
  private isPlaying = false;
  private enabled = true;
  private voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam — calm, educational

  init(apiKey: string, voiceId?: string) {
    this.apiKey = apiKey;
    if (voiceId) this.voiceId = voiceId;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
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
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.8,
            style: options.style ?? 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) { console.warn('[ElevenLabs]', res.status); return null; }
    const arr = await res.arrayBuffer();
    return await this.audioContext.decodeAudioData(arr);
  }

  private playBuffer(buffer: AudioBuffer): Promise<void> {
    return new Promise(resolve => {
      if (!this.audioContext) { resolve(); return; }
      const src = this.audioContext.createBufferSource();
      src.buffer = buffer;
      src.connect(this.audioContext.destination);
      src.onended = () => resolve();
      this.currentSource = src;
      src.start(0);
    });
  }
}

export const voiceService = new ElevenLabsService();

export function initVoice() {
  const key = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const voice = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
  if (key) voiceService.init(key, voice);
}

export function speakNarration(text: string) {
  voiceService.speak(text, { stability: 0.5, similarityBoost: 0.8, style: 0.2 });
}
