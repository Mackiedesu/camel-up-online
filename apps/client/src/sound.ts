// Procedural sound effects using Web Audio API (zero external assets).
import { safeLocalGet, safeLocalSet } from './discord';

type SfxName =
  | 'click'
  | 'roll'
  | 'step'
  | 'bet'
  | 'spectator'
  | 'oasis'
  | 'mirage'
  | 'turn'
  | 'legEnd'
  | 'fanfare'
  | 'error';

class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted: boolean = safeLocalGet('camelup.muted') === '1';
  private listeners = new Set<() => void>();

  get muted() {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    safeLocalSet('camelup.muted', this._muted ? '1' : '0');
    this.listeners.forEach((l) => l());
    if (!this._muted) this.play('click');
    return this._muted;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private ensure(): AudioContext | null {
    if (this._muted || typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!this.ctx) this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      delay?: number;
      gain?: number;
      endFreq?: number;
    } = {},
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + dur);
    }
    const peak = opts.gain ?? 0.14;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, delay = 0, gain = 0.08, filterFreq = 1200) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur);
  }

  play(name: SfxName, steps = 1) {
    if (this._muted) return;
    switch (name) {
      case 'click':
        this.tone(520, 0.05, { type: 'sine', gain: 0.08, endFreq: 680 });
        break;

      case 'roll':
        // Pyramid shake rattle + pop out
        for (let i = 0; i < 5; i++) {
          this.noise(0.045, i * 0.055, 0.11, 900 + i * 220);
          this.tone(240 + i * 55, 0.04, { type: 'square', delay: i * 0.055, gain: 0.05 });
        }
        this.tone(660, 0.12, { type: 'triangle', delay: 0.3, gain: 0.16, endFreq: 880 });
        break;

      case 'step': {
        const count = Math.min(4, Math.max(1, steps));
        for (let i = 0; i < count; i++) {
          const d = 0.08 + i * 0.13;
          this.tone(190 + i * 28, 0.09, { type: 'sine', delay: d, gain: 0.14, endFreq: 110 });
          this.noise(0.04, d, 0.05, 600);
        }
        break;
      }

      case 'bet':
        // Coin / ticket clink
        this.tone(988, 0.08, { type: 'sine', gain: 0.12 });
        this.tone(1318, 0.16, { type: 'sine', delay: 0.06, gain: 0.14 });
        break;

      case 'spectator':
        this.tone(360, 0.09, { type: 'triangle', gain: 0.13, endFreq: 540 });
        this.noise(0.06, 0.02, 0.07, 700);
        break;

      case 'oasis':
        // Happy upward chime
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone(f, 0.12, { type: 'triangle', delay: i * 0.05, gain: 0.12 }),
        );
        break;

      case 'mirage':
        // Wobbly downward slide
        this.tone(620, 0.28, { type: 'sawtooth', gain: 0.08, endFreq: 240 });
        break;

      case 'turn':
        this.tone(587, 0.1, { type: 'sine', gain: 0.11 });
        this.tone(880, 0.18, { type: 'sine', delay: 0.09, gain: 0.13 });
        break;

      case 'legEnd':
        [440, 554, 659, 880].forEach((f, i) =>
          this.tone(f, 0.18, { type: 'triangle', delay: i * 0.08, gain: 0.13 }),
        );
        break;

      case 'fanfare':
        [
          { f: 523, d: 0, l: 0.14 },
          { f: 659, d: 0.14, l: 0.14 },
          { f: 784, d: 0.28, l: 0.14 },
          { f: 1046, d: 0.44, l: 0.42 },
          { f: 784, d: 0.62, l: 0.14 },
          { f: 1046, d: 0.78, l: 0.5 },
        ].forEach((n) => this.tone(n.f, n.l, { type: 'triangle', delay: n.d, gain: 0.15 }));
        break;

      case 'error':
        this.tone(220, 0.14, { type: 'sawtooth', gain: 0.1, endFreq: 160 });
        this.tone(180, 0.18, { type: 'sawtooth', delay: 0.12, gain: 0.1, endFreq: 130 });
        break;
    }
  }
}

export const sfx = new SoundManager();
