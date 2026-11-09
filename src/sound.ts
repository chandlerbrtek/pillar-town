// Small retro sound effects, synthesized with the Web Audio API (no audio files).
import type { Pillar } from './types';

const MUTE_KEY = 'pillartown:muted';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage can be unavailable; the setting just won't be remembered.
  }
}

/** The audio context, created on first use. Browsers only allow this after a tap. */
function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  /** Glide to this frequency over the note. */
  slideTo?: number;
}

/** Plays one note starting `at` seconds from now. */
function tone(freq: number, at: number, duration: number, { type = 'square', volume = 0.12, slideTo }: ToneOptions = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

// Each pillar gets a note from a pentatonic scale, so the pillars sound different but always fit together.
const PILLAR_NOTE: Record<Pillar, number> = {
  vitality: 392.0, // G4
  mind: 440.0, // A4
  heart: 523.25, // C5
  spirit: 587.33, // D5
  bond: 659.25, // E5
  craft: 783.99, // G5
  fortune: 880.0, // A5
  harmony: 1046.5, // C6
};

const up = (f: number, semitones: number) => f * Math.pow(2, semitones / 12);

export const sfx = {
  /** First habit in a pillar today: a building pops into place. */
  build(p: Pillar) {
    const f = PILLAR_NOTE[p];
    tone(f, 0, 0.09, { type: 'square', volume: 0.1 });
    tone(up(f, 7), 0.07, 0.14, { type: 'square', volume: 0.1 });
  },
  /** A building levels up. Level 3 gets a longer run. */
  upgrade(p: Pillar, level: 2 | 3) {
    const f = PILLAR_NOTE[p];
    const steps = level === 3 ? [0, 4, 7, 12, 16] : [0, 4, 7];
    steps.forEach((s, i) => tone(up(f, s), i * 0.06, 0.12, { type: 'square', volume: 0.09 }));
    if (level === 3) tone(up(f, 19), steps.length * 0.06, 0.3, { type: 'triangle', volume: 0.12 });
  },
  /** A building evolves: notes trade back and forth faster and faster, then the upgrade run. Matches the evolution flash. */
  evolve(p: Pillar, level: 2 | 3) {
    const f = PILLAR_NOTE[p];
    let at = 0;
    for (let i = 0; i < 12; i++) {
      const gap = 0.11 - i * 0.007;
      tone(i % 2 ? up(f, 7) : f, at, gap * 0.9, { type: 'square', volume: 0.06 });
      at += gap;
    }
    const steps = level === 3 ? [0, 4, 7, 12, 16] : [0, 4, 7, 12];
    steps.forEach((s, i) => tone(up(f, s), 0.88 + i * 0.05, 0.12, { type: 'square', volume: 0.09 }));
    tone(up(f, level === 3 ? 19 : 16), 0.88 + steps.length * 0.05, 0.35, { type: 'triangle', volume: 0.12 });
  },
  /** Another habit on a building that is already at the top level: a coin-like blip. */
  extra(p: Pillar) {
    const f = up(PILLAR_NOTE[p], 12);
    tone(f, 0, 0.06, { type: 'square', volume: 0.07 });
    tone(up(f, 5), 0.05, 0.12, { type: 'square', volume: 0.07 });
  },
  /** The day's lamp lights: a soft, sparkly chime. */
  lampLit() {
    [1046.5, 1318.5, 1568.0, 2093.0].forEach((f, i) => tone(f, i * 0.08, 0.35, { type: 'triangle', volume: 0.1 }));
  },
  /** Every weekly target met: a short fanfare. */
  fullWeek() {
    const notes: [number, number, number][] = [
      [523.25, 0, 0.12],
      [659.25, 0.12, 0.12],
      [783.99, 0.24, 0.12],
      [1046.5, 0.36, 0.4],
    ];
    for (const [f, at, d] of notes) {
      tone(f, at, d, { type: 'square', volume: 0.1 });
      tone(f / 2, at, d, { type: 'triangle', volume: 0.1 });
    }
  },
  /** A habit removed. */
  undo() {
    tone(440, 0, 0.14, { type: 'square', volume: 0.07, slideTo: 220 });
  },
  /** Tapping something on an island. */
  tap() {
    tone(1200, 0, 0.04, { type: 'triangle', volume: 0.06 });
  },
  /** Confirms sound was just turned on. */
  enabled() {
    tone(784, 0, 0.06, { type: 'square', volume: 0.08 });
    tone(1046.5, 0.06, 0.1, { type: 'square', volume: 0.08 });
  },
};
