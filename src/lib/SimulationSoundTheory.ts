export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const MODES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

export const CHORD_DEG: Record<string, string[]> = {
  major: ["Maj", "min", "min", "Maj", "Maj", "min", "dim"],
  minor: ["min", "dim", "Maj", "min", "min", "Maj", "Maj"],
  dorian: ["min", "min", "Maj", "Maj", "min", "dim", "Maj"],
  lydian: ["Maj", "Maj", "min", "dim", "Maj", "min", "min"],
  phrygian: ["min", "Maj", "Maj", "min", "dim", "Maj", "min"],
};

export const COL_MAJ: Record<string, number[]> = {
  triad: [0, 4, 7],
  "7th": [0, 4, 7, 11],
  "9th": [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

export const COL_MIN: Record<string, number[]> = {
  triad: [0, 3, 7],
  "7th": [0, 3, 7, 10],
  "9th": [0, 3, 7, 10, 14],
  add9: [0, 3, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

export const PAR_MODE: Record<string, string> = {
  major: "minor",
  minor: "major",
  dorian: "major",
  lydian: "minor",
  phrygian: "dorian",
};

export interface ModulationType {
  fn: (k: number, m: string) => number;
  desc: (a: number, b: number, m: string) => string;
}

export const MOD_TYPES: Record<string, ModulationType> = {
  fifth: {
    fn: (k) => (k + 7) % 12,
    desc: (a, b) => `${NOTE_NAMES[a]} → ${NOTE_NAMES[b]} · FIFTH`,
  },
  relative: {
    fn: (k, m) => (m === "major" ? (k + 9) % 12 : (k + 3) % 12),
    desc: (a, b) => `${NOTE_NAMES[a]} → ${NOTE_NAMES[b]} · RELATIVE`,
  },
  parallel: {
    fn: (k) => k,
    desc: (a, _b, m) => `${NOTE_NAMES[a]} ${m} → PARALLEL`,
  },
  chromatic: {
    fn: (k) => (k + (Math.random() < 0.5 ? 1 : 11)) % 12,
    desc: (a, b) => `${NOTE_NAMES[a]} → ${NOTE_NAMES[b]} · HALF STEP`,
  },
  mediant: {
    fn: (k) => (k + (Math.random() < 0.5 ? 4 : 8)) % 12,
    desc: (a, b) => `${NOTE_NAMES[a]} → ${NOTE_NAMES[b]} · MEDIANT`,
  },
};

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface SoundVoiceOptions {
  pan?: number;
  vol?: number;
  cut?: number;
  detune?: number;
  dur?: number;
  busName?: string;
}

export interface DroneInstance {
  osc: OscillatorNode;
  sub: OscillatorNode;
  g: GainNode;
  nodes: { head: BiquadFilterNode; filter: BiquadFilterNode; panner: StereoPannerNode | null };
  midi: number;
}

export type SoundEnvironmentId = "sunny" | "rain" | "mist" | "twilight" | "ocean";

export interface SoundEnvironmentConfig {
  id: SoundEnvironmentId;
  label: string;
  defaultMode: string;
  space: number;
  rainVolume: number;
  rainFilterCutoff: number;
  dropletFrequency: number;
  breezeVolume: number;
  droneLevel: number;
  padAttack: number;
  padCutoff: number;
}

export const SOUND_ENVIRONMENTS: Record<SoundEnvironmentId, SoundEnvironmentConfig> = {
  sunny: {
    id: "sunny",
    label: "Sunny Meadow",
    defaultMode: "major",
    space: 45,
    rainVolume: 0.0,
    rainFilterCutoff: 1000,
    dropletFrequency: 0,
    breezeVolume: 0.15,
    droneLevel: 0.35,
    padAttack: 0.12,
    padCutoff: 3800,
  },
  rain: {
    id: "rain",
    label: "Rain Shower",
    defaultMode: "dorian",
    space: 65,
    rainVolume: 0.38,
    rainFilterCutoff: 1800,
    dropletFrequency: 0.65,
    breezeVolume: 0.08,
    droneLevel: 0.45,
    padAttack: 0.20,
    padCutoff: 2600,
  },
  mist: {
    id: "mist",
    label: "Ethereal Mist",
    defaultMode: "lydian",
    space: 82,
    rainVolume: 0.12,
    rainFilterCutoff: 2400,
    dropletFrequency: 0.25,
    breezeVolume: 0.22,
    droneLevel: 0.55,
    padAttack: 0.35,
    padCutoff: 4500,
  },
  twilight: {
    id: "twilight",
    label: "Twilight Storm",
    defaultMode: "minor",
    space: 70,
    rainVolume: 0.48,
    rainFilterCutoff: 1400,
    dropletFrequency: 0.85,
    breezeVolume: 0.28,
    droneLevel: 0.70,
    padAttack: 0.25,
    padCutoff: 2200,
  },
  ocean: {
    id: "ocean",
    label: "Deep Ocean",
    defaultMode: "phrygian",
    space: 78,
    rainVolume: 0.0,
    rainFilterCutoff: 800,
    dropletFrequency: 0.15,
    breezeVolume: 0.35,
    droneLevel: 0.75,
    padAttack: 0.40,
    padCutoff: 2000,
  },
};

export function computeRootSemi(key: number, mode: string, deg: number): number {
  const sc = MODES[mode] || MODES.major;
  return (key + sc[deg % 7]) % 12;
}

export function computeChordType(mode: string, deg: number): string {
  const cd = CHORD_DEG[mode] || CHORD_DEG.major;
  return cd[deg % 7];
}

export function computeChordIntervals(mode: string, colour: string, deg: number): number[] {
  const t = computeChordType(mode, deg);
  return t === "min" || t === "dim"
    ? COL_MIN[colour] || COL_MIN.triad
    : COL_MAJ[colour] || COL_MAJ.triad;
}

export function computeTone(
  key: number,
  mode: string,
  colour: string,
  deg: number,
  index: number,
  oct: number,
): number {
  const intervals = computeChordIntervals(mode, colour, deg);
  const i = ((index % intervals.length) + intervals.length) % intervals.length;
  const up = Math.floor(index / intervals.length);
  return clamp(60 + computeRootSemi(key, mode, deg) + intervals[i] + up * 12 + (oct - 4) * 12, 26, 100);
}

export function computeScaleTone(key: number, mode: string, index: number, oct: number): number {
  const sc = MODES[mode] || MODES.major;
  const i = ((index % 7) + 7) % 7;
  const up = Math.floor(index / 7);
  return clamp(60 + (key + sc[i]) % 12 + up * 12 + (oct - 4) * 12, 26, 100);
}

export function computeChordSet(
  key: number,
  mode: string,
  colour: string,
  deg: number,
  oct: number,
  spread: boolean = false,
): number[] {
  const intervals = computeChordIntervals(mode, colour, deg);
  return intervals.map((iv, i) => {
    let o = oct;
    if (spread && i === intervals.length - 1 && intervals.length > 2) o = oct + 1;
    return 60 + computeRootSemi(key, mode, deg) + iv + (o - 4) * 12;
  });
}

export function computeNextDeg(currentDeg: number, tension: number): number {
  const calm = [0, 0, 3, 5, 3, 1];
  const mid = [3, 4, 1, 5, 0, 2];
  const hot = [4, 4, 6, 2, 4, 1];
  const pool = tension < 0.33 ? calm : tension < 0.66 ? mid : hot;
  const cands = pool.filter((d) => d !== currentDeg);
  return cands.length
    ? cands[(Math.random() * cands.length) | 0]
    : pool[(Math.random() * pool.length) | 0];
}

export function computeNextEnvironment(current: SoundEnvironmentId): SoundEnvironmentId {
  const list: SoundEnvironmentId[] = ["sunny", "rain", "mist", "twilight", "ocean"];
  const idx = list.indexOf(current);
  return list[(idx + 1) % list.length];
}
