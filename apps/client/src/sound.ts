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

/** Crossfade loop points for /bgm.mp3 (main piece ends at 02:46.5 before silence gap). */
const BGM_LOOP_START = 1.2;
const BGM_LOOP_END = 166.5;
const BGM_CROSSFADE_SEC = 6.5;

function loadInitialBgmVolume(): number {
  const saved = safeLocalGet('camelup.bgmVolume');
  if (saved !== null) {
    const n = Number(saved);
    if (!Number.isNaN(n)) return Math.min(1, Math.max(0, n));
  }
  return 0.45;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted: boolean = safeLocalGet('camelup.muted') === '1';
  private _bgmVolume: number = loadInitialBgmVolume();
  private _lastNonZeroBgm: number = this._bgmVolume > 0 ? this._bgmVolume : 0.45;
  private listeners = new Set<() => void>();

  // Dual HTMLAudioElement decks for seamless crossfade looping
  private decks: [HTMLAudioElement, HTMLAudioElement] | null = null;
  private activeDeckIdx: 0 | 1 = 0;
  private crossfading = false;
  private bgmStarted = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this._bgmVolume > 0 && !this.bgmStarted) {
          this.startBgm();
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  get muted() {
    return this._muted;
  }

  get bgmVolume() {
    return this._bgmVolume;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    safeLocalSet('camelup.muted', this._muted ? '1' : '0');
    this.listeners.forEach((l) => l());
    if (!this._muted) this.play('click');
    return this._muted;
  }

  setBgmVolume(vol: number) {
    const clamped = Math.min(1, Math.max(0, Math.round(vol * 100) / 100));
    this._bgmVolume = clamped;
    if (clamped > 0) this._lastNonZeroBgm = clamped;
    safeLocalSet('camelup.bgmVolume', String(clamped));
    this.listeners.forEach((l) => l());

    if (clamped <= 0) {
      this.pauseBgm();
    } else if (!this.bgmStarted) {
      this.startBgm();
    } else {
      this.applyCurrentDeckVolumes();
    }
  }

  toggleBgmMute() {
    if (this._bgmVolume > 0) {
      this.setBgmVolume(0);
    } else {
      this.setBgmVolume(this._lastNonZeroBgm || 0.45);
    }
  }

  private ensureDecks(): [HTMLAudioElement, HTMLAudioElement] | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.decks) {
      const a = new Audio('/bgm.mp3');
      const b = new Audio('/bgm.mp3');
      a.preload = 'auto';
      b.preload = 'auto';
      a.loop = false;
      b.loop = false;
      this.decks = [a, b];
    }
    return this.decks;
  }

  startBgm() {
    if (this._bgmVolume <= 0) return;
    const decks = this.ensureDecks();
    if (!decks) return;

    const active = decks[this.activeDeckIdx];
    if (active.currentTime < BGM_LOOP_START || active.currentTime >= BGM_LOOP_END) {
      active.currentTime = BGM_LOOP_START;
    }
    active.volume = this._bgmVolume;
    active
      .play()
      .then(() => {
        this.bgmStarted = true;
        if (!this.tickTimer) {
          this.tickTimer = setInterval(() => this.tickCrossfade(), 100);
        }
      })
      .catch(() => {
        // Will retry on next user interaction
      });
  }

  private pauseBgm() {
    this.bgmStarted = false;
    this.crossfading = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.decks) {
      this.decks[0].pause();
      this.decks[1].pause();
    }
  }

  private applyCurrentDeckVolumes() {
    if (!this.decks) return;
    const active = this.decks[this.activeDeckIdx];
    const next = this.decks[(1 - this.activeDeckIdx) as 0 | 1];
    if (!this.crossfading) {
      active.volume = this._bgmVolume;
      next.volume = 0;
    } else {
      const fadeStart = BGM_LOOP_END - BGM_CROSSFADE_SEC;
      const p = Math.min(1, Math.max(0, (active.currentTime - fadeStart) / BGM_CROSSFADE_SEC));
      active.volume = this._bgmVolume * Math.cos(p * Math.PI * 0.5);
      next.volume = this._bgmVolume * Math.sin(p * Math.PI * 0.5);
    }
  }

  private tickCrossfade() {
    if (!this.decks || !this.bgmStarted || this._bgmVolume <= 0) return;
    const active = this.decks[this.activeDeckIdx];
    const nextIdx = (1 - this.activeDeckIdx) as 0 | 1;
    const next = this.decks[nextIdx];
    const fadeStart = BGM_LOOP_END - BGM_CROSSFADE_SEC;

    if (active.currentTime >= fadeStart) {
      if (!this.crossfading) {
        this.crossfading = true;
        next.currentTime = BGM_LOOP_START;
        next.volume = 0;
        next.play().catch(() => {});
      }
      const p = Math.min(1, Math.max(0, (active.currentTime - fadeStart) / BGM_CROSSFADE_SEC));
      // Equal-power cosine/sine crossfade for completely natural transition
      active.volume = this._bgmVolume * Math.cos(p * Math.PI * 0.5);
      next.volume = this._bgmVolume * Math.sin(p * Math.PI * 0.5);

      if (p >= 1 || active.currentTime >= BGM_LOOP_END || active.paused) {
        active.pause();
        active.volume = 0;
        next.volume = this._bgmVolume;
        this.activeDeckIdx = nextIdx;
        this.crossfading = false;
      }
    } else {
      active.volume = this._bgmVolume;
    }
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
