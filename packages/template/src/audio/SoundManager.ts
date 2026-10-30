export type SoundKind = 'ui' | 'tap' | 'load' | 'depart' | 'fail' | 'win' | 'coin' | 'deny' | 'warn' | 'full';

type Tone = { freq: number; dur: number; type: OscillatorType; delay: number; gain?: number; slide?: number };

const KITS: Record<SoundKind, Tone[]> = {
  ui: [{ freq: 540, dur: 0.05, type: 'sine', delay: 0, gain: 0.04 }],
  tap: [{ freq: 210, dur: 0.06, type: 'triangle', delay: 0, gain: 0.05 }],
  load: [
    { freq: 620, dur: 0.07, type: 'sine', delay: 0, gain: 0.045 },
    { freq: 830, dur: 0.09, type: 'sine', delay: 0.06, gain: 0.04 },
  ],
  depart: [{ freq: 240, dur: 0.22, type: 'triangle', delay: 0, gain: 0.04, slide: 640 }],
  fail: [
    { freq: 240, dur: 0.16, type: 'sine', delay: 0, gain: 0.05, slide: 110 },
    { freq: 160, dur: 0.18, type: 'triangle', delay: 0.08, gain: 0.04, slide: 70 },
  ],
  win: [
    { freq: 523, dur: 0.12, type: 'sine', delay: 0, gain: 0.045 },
    { freq: 659, dur: 0.12, type: 'sine', delay: 0.1, gain: 0.045 },
    { freq: 784, dur: 0.12, type: 'sine', delay: 0.2, gain: 0.045 },
    { freq: 1046, dur: 0.22, type: 'sine', delay: 0.3, gain: 0.04 },
  ],
  coin: [
    { freq: 880, dur: 0.06, type: 'sine', delay: 0, gain: 0.04 },
    { freq: 1175, dur: 0.1, type: 'sine', delay: 0.05, gain: 0.035 },
  ],
  deny: [{ freq: 150, dur: 0.08, type: 'square', delay: 0, gain: 0.02 }],
  warn: [
    { freq: 180, dur: 0.12, type: 'sine', delay: 0, gain: 0.05, slide: 90 },
    { freq: 90, dur: 0.16, type: 'triangle', delay: 0.04, gain: 0.04 },
  ],
  full: [
    { freq: 523, dur: 0.08, type: 'triangle', delay: 0, gain: 0.04 },
    { freq: 659, dur: 0.1, type: 'triangle', delay: 0.06, gain: 0.04 },
    { freq: 784, dur: 0.16, type: 'sine', delay: 0.12, gain: 0.035 },
  ],
};

/**
 * Tiny procedural sound kit. No audio files, so the build stays small and
 * every tone is original.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private held = false;

  constructor(private readonly isEnabled: () => boolean) {}

  /** Mute while an advertisement is open, without changing the saved setting. */
  hold(on: boolean): void {
    this.held = on;
  }

  resume(): void {
    if (typeof window === 'undefined') return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(kind: SoundKind): void {
    if (this.held || !this.isEnabled()) return;
    this.resume();
    const ctx = this.ctx;
    if (!ctx) return;
    if (kind === 'tap') this.noise(0.05, 1400, 0.03);
    if (kind === 'depart') this.noise(0.18, 420, 0.035);
    if (kind === 'warn') this.noise(0.12, 180, 0.04);
    const now = ctx.currentTime;
    for (const tone of KITS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, now + tone.delay);
      if (tone.slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, tone.slide), now + tone.delay + tone.dur);
      }
      const g = tone.gain ?? 0.04;
      gain.gain.setValueAtTime(g, now + tone.delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.delay + tone.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + tone.delay);
      osc.stop(now + tone.delay + tone.dur + 0.02);
    }
  }

  private noise(duration: number, freq: number, amount: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const env = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = amount;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }
}
