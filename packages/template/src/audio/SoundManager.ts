export type SoundKind = 'ui' | 'tap' | 'load' | 'depart' | 'fail' | 'win' | 'coin' | 'deny';

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
}
