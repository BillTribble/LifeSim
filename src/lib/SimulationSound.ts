import * as THREE from "three";

/**
 * Sleeper Murmur Sound Engine for LifeSim
 * Ported & adapted from Sleeper Murmur Sound (https://cbaigent.github.io/sleeper/Sleeper-Murmur-Sound.html)
 * 
 * Includes:
 * - Web Audio Context management with interaction auto-resume
 * - Procedural stereo impulse-response convolver reverb
 * - Master dynamic compressor
 * - Multi-bus synthesis: Lush pads, crisp plucks, detuned drones, shimmering bells, filtered noise bumps
 * - Procedural weather & rain generator (pink noise filter beds + resonant droplet impacts)
 * - Music theory engine: dynamic keys, modal scales (major, minor, dorian, lydian, phrygian),
 *   tension-driven chord progressions, harmonic modulations (5th, relative, parallel, mediant, chromatic)
 * - 3D camera-relative spatial panning & distance attenuation
 * - Environmental soundscape cycling (Sunny Meadow, Gentle Rain, Ethereal Mist, Twilight Storm, Deep Ocean)
 */

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

export class SimulationSound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  comp: DynamicsCompressorNode | null = null;
  dry: GainNode | null = null;
  wet: GainNode | null = null;
  conv: ConvolverNode | null = null;
  bus: Record<string, GainNode> = {};
  noiseBuf: AudioBuffer | null = null;

  active: number = 0;
  cap: number = 64;
  drones: Record<string, DroneInstance> = {};

  // Global cadence filter state (throttles combined step + branch + perc + droplet triggers)
  globalLastEventTime: number = 0;
  globalMinGap: number = 0.03 * Math.pow(2.5 / 0.03, 25 / 100);

  // Rate limiters for each voice category
  rateLimits: Record<string, { last: number; gap: number }> = {
    pad: { last: 0, gap: 0.09 },
    pluck: { last: 0, gap: 0.09 },
    bell: { last: 0, gap: 0.08 },
    perc: { last: 0, gap: 0.11 },
    droplet: { last: 0, gap: 0.11 },
    branch: { last: 0, gap: 0.10 },
    step: { last: 0, gap: 0.09 },
  };

  // Sound Engine Global Settings
  enabled: boolean = false;
  masterVolume: number = 0.70;
  space: number = 55; // Reverb wet/dry amount (0 to 100)

  // Mixer channel volume (0–100), reverb send (0–100), and active octave (1–7)
  channelVolumes: Record<string, number> = {
    pad: 80, step: 50, branch: 70, bell: 75, drone: 70, perc: 60, weather: 65,
  };
  channelReverbSends: Record<string, number> = {
    pad: 55, step: 35, branch: 45, bell: 50, drone: 45, perc: 30, weather: 30,
  };
  channelOctaves: Record<string, number> = {
    pad: 4, step: 5, branch: 5, bell: 6, drone: 2, perc: 4, weather: 6,
  };

  // Per-channel mixer audio graph nodes
  mixerGains: Record<string, GainNode> = {};
  reverbSendGains: Record<string, GainNode> = {};
  reverbInput: GainNode | null = null;
  preDelay: DelayNode | null = null;
  reverbDampFilter: BiquadFilterNode | null = null;

  // Global reverb parameter controls (0-100)
  reverbDecay: number = 50;   // maps to IR decay 1.5–6.0 s
  reverbDamping: number = 40; // maps to lowpass cutoff 18000→1200 Hz
  reverbPreDelay: number = 10;// maps to 0–80 ms

  // Step cadence (0–100, higher = slower / fewer plucks)
  stepCadence: number = 25;

  // Event sound enable toggles
  enableBirthSound: boolean = true;
  enableMatingSound: boolean = true;
  enableMovementSound: boolean = true;
  enableDroneSound: boolean = true;
  enableWeatherSound: boolean = true;

  // Synthesis Parameters (aligned with Sleeper Murmur Sound)
  aWave1: OscillatorType = "triangle";
  aWave2: OscillatorType | "off" = "sine";
  aOct: number = 4;
  aVol: number = 70;
  aAttk: number = 0.12;
  aDec: number = 0.50;
  aSus: number = 65;
  aRel: number = 2.20;
  aCut: number = 3200;
  aRes: number = 2;

  bWave: OscillatorType = "sine";
  bNoteMode: "chord" | "scale" = "chord";
  bOct: number = 5;
  bVol: number = 52;
  bDur: number = 110;
  bCut: number = 6500;
  bRes: number = 3;

  cVol: number = 58; // Drone volume
  dVol: number = 45; // Bell volume

  // Weather & Rain Audio Layer
  rainGain: GainNode | null = null;
  rainFilter: BiquadFilterNode | null = null;
  rainSource: AudioBufferSourceNode | null = null;
  breezeGain: GainNode | null = null;
  breezeFilter: BiquadFilterNode | null = null;
  breezeSource: AudioBufferSourceNode | null = null;
  rainIntensity: number = 1.0;

  // Environment State
  currentEnvironment: SoundEnvironmentId = "rain";
  targetEnvironment: SoundEnvironmentId = "rain";
  autoCycleEnvironments: boolean = true;
  syncWithThemes: boolean = false;
  envCycleTimer: number = 0;
  envCycleDuration: number = 60.0; // Seconds between auto cycles

  // Harmony & Musical Theory Engine
  key: number = 0; // 0 = C
  mode: string = "dorian";
  colour: string = "triad";
  deg: number = 0;
  tension: number = 0.2;
  sinceChange: number = 0;
  colourT: number = 0;
  blooms: number = 0;
  bloomCool: number = 0;
  pendingMod: boolean = false;
  minGap: number = 2.4;
  maxGap: number = 12.0;
  modType: string = "fifth";
  modFreq: number = 2; // Modulate every 2 blooms
  autoMode: boolean = true;
  lastModBanner: string = "";

  // Temporary vectors for projection
  private _projectVec = new THREE.Vector3();

  constructor() {
    this.setupUserWakeListeners();
  }

  private setupUserWakeListeners() {
    if (typeof window === "undefined") return;
    const wake = () => {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", wake, { capture: true, once: false });
    window.addEventListener("keydown", wake, { capture: true, once: false });
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      // Master Compressor
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -20;
      this.comp.knee.value = 20;
      this.comp.ratio.value = 5;
      this.comp.attack.value = 0.005;
      this.comp.release.value = 0.28;

      // Master Gain
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.masterVolume * 0.62 : 0;

      // Default reverb send levels per channel
      this.channelReverbSends = {
        pad: 55, step: 35, branch: 45, bell: 50, drone: 45, perc: 30, weather: 30,
        ...this.channelReverbSends,
      };

      // Convolver Reverb with warm pinked stereo decay + early reflections
      this.conv = this.ctx.createConvolver();
      this.regenerateIR();

      // Wet / Dry Reverb Balance
      this.wet = this.ctx.createGain();
      this.dry = this.ctx.createGain();
      this.setSpace(this.space);

      // Sub-buses (step + branch replace the former pluck bus)
      const busNames: string[] = ["pad", "step", "branch", "drone", "bell", "perc", "weather"];
      busNames.forEach((n) => {
        if (!this.ctx || !this.master) return;
        const g = this.ctx.createGain();
        g.gain.value = 1;
        this.bus[n] = g;
      });

      // Per-channel mixer gains & reverb sends
      this.mixerGains = {};
      this.reverbSendGains = {};
      this.reverbInput = this.ctx.createGain();
      // Makeup gain compensates for ConvolverNode equal-power normalization on short tonal transients
      this.reverbInput.gain.value = 3.6;

      this.preDelay = this.ctx.createDelay(0.1);
      this.preDelay.delayTime.value = (this.reverbPreDelay / 100) * 0.08;

      this.reverbDampFilter = this.ctx.createBiquadFilter();
      this.reverbDampFilter.type = "lowpass";
      this.reverbDampFilter.frequency.value = this.dampingHz(this.reverbDamping);
      this.reverbDampFilter.Q.value = 0.5;

      busNames.forEach((n) => {
        if (!this.ctx || !this.dry || !this.reverbInput || !this.bus[n]) return;
        // Channel mixer gain -> dry bus
        const cg = this.ctx.createGain();
        cg.gain.value = (this.channelVolumes[n] ?? 80) / 100;
        cg.connect(this.dry);
        this.mixerGains[n] = cg;
        // Reverb send -> reverbInput bus
        const rs = this.ctx.createGain();
        rs.gain.value = (this.channelReverbSends[n] ?? 35) / 100;
        rs.connect(this.reverbInput);
        this.reverbSendGains[n] = rs;
        // Wire: bus -> channelGain -> dry AND channelGain -> reverbSend
        this.bus[n].connect(cg);
        cg.connect(rs);
      });

      // Routing: both dry and wet feed into master -> compressor -> destination
      this.dry.connect(this.master);

      this.reverbInput.connect(this.preDelay);
      this.preDelay.connect(this.reverbDampFilter);
      this.reverbDampFilter.connect(this.conv);
      this.conv.connect(this.wet);
      this.wet.connect(this.master);

      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);

      // Procedural Noise Buffer (used for perc, bumps, and weather)
      const nl = Math.floor(this.ctx.sampleRate * 2.5);
      this.noiseBuf = this.ctx.createBuffer(1, nl, this.ctx.sampleRate);
      const nd = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < nl; i++) {
        nd[i] = Math.random() * 2 - 1;
      }

      // Initialize Ambient Weather & Rain synthesis loop
      this.initWeatherNodes();
      this.applyEnvironment(this.currentEnvironment, true);
    } catch (err) {
      console.warn("LifeSim Web Audio initialization deferred:", err);
    }
  }

  private initWeatherNodes() {
    if (!this.ctx || !this.noiseBuf || !this.bus.weather) return;

    // Continuous Rain Loop Node
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = "bandpass";
    this.rainFilter.frequency.value = 1600;
    this.rainFilter.Q.value = 0.8;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0001;

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = this.noiseBuf;
    this.rainSource.loop = true;
    this.rainSource.playbackRate.value = 0.85;

    this.rainSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.bus.weather);
    this.rainSource.start();

    // Gentle Breeze / Atmospheric Air Bed
    this.breezeFilter = this.ctx.createBiquadFilter();
    this.breezeFilter.type = "lowpass";
    this.breezeFilter.frequency.value = 450;
    this.breezeFilter.Q.value = 1.0;

    this.breezeGain = this.ctx.createGain();
    this.breezeGain.gain.value = 0.0001;

    this.breezeSource = this.ctx.createBufferSource();
    this.breezeSource.buffer = this.noiseBuf;
    this.breezeSource.loop = true;
    this.breezeSource.playbackRate.value = 0.45;

    this.breezeSource.connect(this.breezeFilter);
    this.breezeFilter.connect(this.breezeGain);
    this.breezeGain.connect(this.bus.weather);
    this.breezeSource.start();
  }

  setSpace(v: number) {
    this.space = clamp(v, 0, 100);
    if (!this.wet || !this.dry) return;
    this.wet.gain.value = (this.space / 100) * 1.8;
    this.dry.gain.value = 0.45 + (1 - this.space / 100) * 0.50;
  }

  setVolume(vol: number) {
    this.masterVolume = clamp(vol / 100, 0, 1);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.enabled ? this.masterVolume * 0.62 : 0, this.ctx.currentTime, 0.08);
    }
  }

  setEnabled(en: boolean) {
    this.enabled = en;
    if (en) {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.enabled ? this.masterVolume * 0.62 : 0, this.ctx.currentTime, 0.08);
    }
    if (!this.enabled) {
      for (const k in this.drones) {
        this.droneOff(k);
      }
    }
  }

  private dampingHz(val: number): number {
    return 18000 - (val / 100) * 17000;
  }

  private decaySec(val: number): number {
    return 1.5 + (val / 100) * 4.5;
  }

  /** Set a single mixer channel volume (0-100) */
  setChannelVolume(ch: string, val: number) {
    this.channelVolumes[ch] = clamp(val, 0, 100);
    if (this.mixerGains[ch]) {
      this.mixerGains[ch].gain.setTargetAtTime(this.channelVolumes[ch] / 100, this.ctx?.currentTime || 0, 0.08);
    }
  }

  /** Set a single mixer channel reverb send (0-100) */
  setChannelReverb(ch: string, val: number) {
    this.channelReverbSends[ch] = clamp(val, 0, 100);
    if (this.reverbSendGains[ch]) {
      this.reverbSendGains[ch].gain.setTargetAtTime(this.channelReverbSends[ch] / 100, this.ctx?.currentTime || 0, 0.08);
    }
  }

  /** Set a single mixer channel active octave (1-7) */
  setChannelOctave(ch: string, val: number) {
    const oct = clamp(Math.round(val), 1, 7);
    this.channelOctaves[ch] = oct;
    if (ch === "pad") this.aOct = oct;
    if (ch === "step") this.bOct = oct;
    if (ch === "drone" && this.ctx) {
      const semi = this.rootSemi(this.deg);
      const newMidi = 12 * (oct + 1) + semi;
      const t = this.ctx.currentTime;
      for (const k of Object.keys(this.drones)) {
        const d = this.drones[k];
        if (d) {
          d.osc.frequency.setTargetAtTime(midiToHz(newMidi), t, 0.25);
          d.sub.frequency.setTargetAtTime(midiToHz(newMidi - 12), t, 0.25);
          d.midi = newMidi;
        }
      }
    }
    if (ch === "weather" && this.ctx) {
      const env = SOUND_ENVIRONMENTS[this.currentEnvironment];
      if (env) {
        const mult = Math.pow(2, (oct - 6) * 0.35);
        const t = this.ctx.currentTime;
        if (this.rainFilter) {
          this.rainFilter.frequency.setTargetAtTime(clamp(env.rainFilterCutoff * mult, 200, 12000), t, 0.15);
        }
        if (this.breezeFilter) {
          this.breezeFilter.frequency.setTargetAtTime(clamp(450 * mult, 120, 4000), t, 0.15);
        }
      }
    }
  }

  /** Apply full mixer snapshot: { channel: { vol, rev, oct } } */
  setMixer(mixer: Record<string, { vol: number; rev: number; oct?: number }>) {
    for (const ch of Object.keys(mixer)) {
      if (mixer[ch].vol !== undefined) this.setChannelVolume(ch, mixer[ch].vol);
      if (mixer[ch].rev !== undefined) this.setChannelReverb(ch, mixer[ch].rev);
      if (mixer[ch].oct !== undefined) this.setChannelOctave(ch, mixer[ch].oct!);
    }
  }

  /** Global reverb decay (0-100) - regenerates convolver IR */
  setReverbDecay(val: number) {
    this.reverbDecay = clamp(val, 0, 100);
    this.regenerateIR();
  }

  /** Global reverb damping / tone (0-100, higher = darker) */
  setReverbDamping(val: number) {
    this.reverbDamping = clamp(val, 0, 100);
    if (this.reverbDampFilter) {
      this.reverbDampFilter.frequency.setTargetAtTime(this.dampingHz(this.reverbDamping), this.ctx?.currentTime || 0, 0.08);
    }
  }

  /** Global reverb pre-delay (0-100 → 0-80ms) */
  setReverbPreDelay(val: number) {
    this.reverbPreDelay = clamp(val, 0, 100);
    if (this.preDelay) {
      this.preDelay.delayTime.setTargetAtTime((this.reverbPreDelay / 100) * 0.08, this.ctx?.currentTime || 0, 0.08);
    }
  }

  /** Regenerate convolver IR with warm spectral shaping + early reflections */
  private regenerateIR() {
    if (!this.ctx || !this.conv) return;
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * this.decaySec(this.reverbDecay));
    const ir = this.ctx.createBuffer(2, len, sr);
    const earlyTimes = [0.014, 0.029, 0.047, 0.068, 0.093];
    const earlyGains = [0.85, 0.65, 0.50, 0.38, 0.28];
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 2.0);
        const white = (Math.random() * 2 - 1) * env;
        // 1-pole warm lowpass so ConvolverNode normalization concentrates power in the 100Hz-3kHz musical band
        lp = lp * 0.84 + white * 0.16;
        d[i] = lp;
      }
      // Add stereo-decorrelated early reflections for immediate spatial depth
      for (let e = 0; e < earlyTimes.length; e++) {
        const offset = Math.floor((earlyTimes[e] + (ch === 1 ? 0.004 : 0)) * sr);
        if (offset < len) {
          d[offset] += (ch === 0 ? 1 : -1) * earlyGains[e] * 0.35;
        }
      }
    }
    this.conv.buffer = ir;
  }

  /** Global cadence filter (0-100, higher = slower / fewer total notes across step, branch, perc, droplet) */
  setStepCadence(val: number) {
    this.stepCadence = clamp(val, 0, 100);
    // Exponential curve: 0 -> 0.03s (33/s), 25 -> 0.09s (11/s), 50 -> 0.27s (3.7/s), 75 -> 0.82s (1.2/s), 100 -> 2.5s (0.4/s)
    const gap = 0.03 * Math.pow(2.5 / 0.03, this.stepCadence / 100);
    this.globalMinGap = gap;
    this.rateLimits.step.gap = gap;
    // Slight multiplier on branch/perc/droplet prevents heavy branching from starving step notes
    this.rateLimits.branch.gap = gap * 1.15;
    this.rateLimits.pluck.gap = gap;
    this.rateLimits.perc.gap = gap * 1.25;
    this.rateLimits.droplet.gap = gap * 1.2;
    this.rateLimits.bell.gap = Math.max(0.08, gap * 0.8);
    this.rateLimits.pad.gap = Math.max(0.09, gap * 0.8);
  }

  allow(key: string, t: number): boolean {
    if (t - this.globalLastEventTime < this.globalMinGap) return false;
    const rl = this.rateLimits[key];
    if (rl && t - rl.last < rl.gap) return false;
    if (rl) rl.last = t;
    this.globalLastEventTime = t;
    return true;
  }

  chain(pan: number, cut: number, res: number, busName: string) {
    if (!this.ctx) throw new Error("AudioContext not ready");
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cut;
    f.Q.value = res;

    let panner: StereoPannerNode | null = null;
    if (this.ctx.createStereoPanner) {
      panner = this.ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      f.connect(panner);
      panner.connect(this.bus[busName] || this.master);
    } else {
      f.connect(this.bus[busName] || this.master);
    }

    return { head: f, filter: f, panner };
  }

  free(nodes: { head: BiquadFilterNode; panner: StereoPannerNode | null }) {
    this.active = Math.max(0, this.active - 1);
    try {
      nodes.head.disconnect();
      if (nodes.panner) nodes.panner.disconnect();
    } catch (_e) {}
  }

  // --- Voice Synthesis Methods ---

  pad(midis: number[], o: SoundVoiceOptions = {}) {
    if (!this.ctx || !this.enabled || midis.length === 0) return;
    if (this.active + midis.length > this.cap) return;

    const t = this.ctx.currentTime;
    const vol = (o.vol == null ? 1 : o.vol) * (this.aVol / 100);
    const sus = this.aSus / 100;

    midis.forEach((m, i) => {
      if (!this.ctx) return;
      const nodes = this.chain(o.pan || 0, o.cut || this.aCut, this.aRes, "pad");
      const st = t + i * 0.038;
      const peak = (vol * 0.17) / Math.sqrt(midis.length);
      const susL = peak * sus;

      const o1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      o1.type = this.aWave1;
      o1.frequency.value = midiToHz(m);
      if (o.detune) o1.detune.value = o.detune;

      g1.gain.setValueAtTime(0, st);
      g1.gain.linearRampToValueAtTime(peak, st + this.aAttk);
      g1.gain.linearRampToValueAtTime(susL, st + this.aAttk + this.aDec);
      g1.gain.setTargetAtTime(0, st + this.aAttk + this.aDec + 0.04, this.aRel * 0.42);
      o1.connect(g1);
      g1.connect(nodes.head);

      const life = this.aAttk + this.aDec + this.aRel * 1.9;
      o1.start(st);
      o1.stop(st + life);
      this.active++;
      o1.onended = () => this.free(nodes);

      if (this.aWave2 !== "off") {
        const o2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        o2.type = this.aWave2;
        o2.frequency.value = midiToHz(m) * 2.002;
        if (o.detune) o2.detune.value = -o.detune * 0.5;
        const pk2 = peak * 0.34;

        g2.gain.setValueAtTime(0, st);
        g2.gain.linearRampToValueAtTime(pk2, st + this.aAttk + 0.03);
        g2.gain.linearRampToValueAtTime(pk2 * sus, st + this.aAttk + this.aDec + 0.03);
        g2.gain.setTargetAtTime(0, st + this.aAttk + this.aDec + 0.07, this.aRel * 0.46);
        o2.connect(g2);
        g2.connect(nodes.head);
        o2.start(st);
        o2.stop(st + life);
      }
    });
  }

  pluck(midi: number, o: SoundVoiceOptions = {}) {
    if (!this.ctx || !this.enabled) return;
    if (this.active >= this.cap) return;

    const t = this.ctx.currentTime;
    const dur = (o.dur || this.bDur) / 1000;
    const busName = o.busName || "step";
    const nodes = this.chain(o.pan || 0, o.cut || this.bCut, this.bRes, busName);

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = this.bWave;
    osc.frequency.value = midiToHz(midi);
    if (o.detune) osc.detune.value = o.detune;

    const v = (o.vol == null ? 1 : o.vol) * (this.bVol / 100) * 0.30;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g);
    g.connect(nodes.head);
    osc.start(t);
    osc.stop(t + dur + 0.06);
    this.active++;
    osc.onended = () => this.free(nodes);
  }

  droneOn(id: string, midi: number, pan: number = 0, lvl: number = 1) {
    if (!this.ctx || !this.enabled) return;
    let d = this.drones[id];
    const t = this.ctx.currentTime;

    if (!d) {
      const nodes = this.chain(pan || 0, 820, 1.2, "drone");
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      sub.type = "sine";
      osc.frequency.value = midiToHz(midi);
      sub.frequency.value = midiToHz(midi - 12);
      sub.detune.value = 4;
      g.gain.setValueAtTime(0.0001, t);
      osc.connect(g);
      sub.connect(g);
      g.connect(nodes.head);
      osc.start(t);
      sub.start(t);
      d = this.drones[id] = { osc, sub, g, nodes, midi };
      this.active++;
    }

    d.g.gain.setTargetAtTime(0.052 * (this.cVol / 100) * lvl, t, 2.4);
    if (d.midi !== midi) {
      d.osc.frequency.setTargetAtTime(midiToHz(midi), t, 1.6);
      d.sub.frequency.setTargetAtTime(midiToHz(midi - 12), t, 1.8);
      d.midi = midi;
    }
    if (d.nodes.panner) {
      d.nodes.panner.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.4);
    }
  }

  droneOff(id: string) {
    const d = this.drones[id];
    if (!d || !this.ctx) return;
    const t = this.ctx.currentTime;
    d.g.gain.cancelScheduledValues(t);
    d.g.gain.setTargetAtTime(0.0001, t, 1.5);
    delete this.drones[id];
    setTimeout(() => {
      try {
        d.osc.stop();
        d.sub.stop();
      } catch (_e) {}
      this.free(d.nodes);
    }, 5000);
  }

  bell(midi: number, o: SoundVoiceOptions = {}) {
    if (!this.ctx || !this.enabled) return;
    if (this.active >= this.cap) return;

    const t = this.ctx.currentTime;
    const nodes = this.chain(o.pan || 0, 14000, 0.6, "bell");
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = midiToHz(midi);

    const v = (o.vol == null ? 1 : o.vol) * (this.dVol / 100) * 0.13;
    const dur = o.dur || 1.1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    osc.connect(g);
    g.connect(nodes.head);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    this.active++;
    osc.onended = () => this.free(nodes);
  }

  bump(pan: number = 0, force: number = 1) {
    if (!this.ctx || !this.enabled || !this.noiseBuf) return;
    if (this.active >= this.cap) return;

    const t = this.ctx.currentTime;
    const percOct = this.channelOctaves.perc ?? 4;
    const pitchMult = Math.pow(2, (percOct - 4) * 0.65);
    const nodes = this.chain(pan || 0, clamp((1400 + force * 2600) * pitchMult, 180, 14000), 4, "perc");
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = clamp((0.7 + Math.random() * 0.6) * pitchMult, 0.15, 4.0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * force, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.10 + force * 0.10);
    src.connect(g);
    g.connect(nodes.head);
    src.start(t);
    src.stop(t + 0.30);
    this.active++;
    src.onended = () => this.free(nodes);
  }

  // --- Rain Droplet Generator ---

  raindrop(pan: number = 0, intensity: number = 1) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (!this.allow("droplet", t)) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const wxOct = this.channelOctaves.weather ?? 6;
    const filterMult = Math.pow(2, (wxOct - 6) * 0.35);
    const nodes = this.chain(pan, clamp((6000 + Math.random() * 4000) * filterMult, 400, 16000), 3, "weather");

    // Random droplet resonant pitch in chord tones at the chosen weather octave
    const tone = this.scaleTone((Math.random() * 7) | 0, wxOct);
    osc.type = "sine";
    osc.frequency.setValueAtTime(midiToHz(tone) * (1.2 + Math.random() * 0.4), t);
    osc.frequency.exponentialRampToValueAtTime(midiToHz(tone) * 0.6, t + 0.06);

    const v = 0.015 * intensity * (this.rainIntensity || 1.0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0002, t + 0.075);

    osc.connect(g);
    g.connect(nodes.head);
    osc.start(t);
    osc.stop(t + 0.09);
    this.active++;
    osc.onended = () => this.free(nodes);
  }

  // --- Environment Switching & Weather Control ---

  setEnvironment(envId: SoundEnvironmentId) {
    this.targetEnvironment = envId;
    this.applyEnvironment(envId, false);
  }

  applyEnvironment(envId: SoundEnvironmentId, instant: boolean = false) {
    const env = SOUND_ENVIRONMENTS[envId];
    if (!env) return;

    this.currentEnvironment = envId;
    this.mode = env.defaultMode;
    this.setSpace(env.space);

    this.aAttk = env.padAttack;
    this.aCut = env.padCutoff;

    if (this.ctx && this.enableWeatherSound) {
      const t = this.ctx.currentTime;
      const ramp = instant ? 0.05 : 3.0;

      // Update Rain layer
      if (this.rainGain && this.rainFilter) {
        const targetRain = env.rainVolume * this.rainIntensity * (this.masterVolume > 0 ? 1 : 0);
        this.rainGain.gain.setTargetAtTime(targetRain * 0.12, t, ramp);
        this.rainFilter.frequency.setTargetAtTime(env.rainFilterCutoff, t, ramp);
      }

      // Update Breeze layer
      if (this.breezeGain && this.breezeFilter) {
        const targetBreeze = env.breezeVolume * (this.masterVolume > 0 ? 1 : 0);
        this.breezeGain.gain.setTargetAtTime(targetBreeze * 0.08, t, ramp);
      }
    }
  }

  cycleNextEnvironment() {
    const list: SoundEnvironmentId[] = ["sunny", "rain", "mist", "twilight", "ocean"];
    const idx = list.indexOf(this.currentEnvironment);
    const next = list[(idx + 1) % list.length];
    this.setEnvironment(next);
  }

  // --- Music Theory & Harmonic Progression ---

  rootSemi(deg: number): number {
    const sc = MODES[this.mode] || MODES.major;
    return (this.key + sc[deg % 7]) % 12;
  }

  type(deg: number): string {
    const cd = CHORD_DEG[this.mode] || CHORD_DEG.major;
    return cd[deg % 7];
  }

  ivs(deg: number): number[] {
    const t = this.type(deg);
    return t === "min" || t === "dim"
      ? COL_MIN[this.colour] || COL_MIN.triad
      : COL_MAJ[this.colour] || COL_MAJ.triad;
  }

  tone(index: number, oct: number, deg?: number): number {
    if (deg == null) deg = this.deg;
    const intervals = this.ivs(deg);
    const i = ((index % intervals.length) + intervals.length) % intervals.length;
    const up = Math.floor(index / intervals.length);
    return clamp(60 + this.rootSemi(deg) + intervals[i] + up * 12 + (oct - 4) * 12, 26, 100);
  }

  scaleTone(index: number, oct: number): number {
    const sc = MODES[this.mode] || MODES.major;
    const i = ((index % 7) + 7) % 7;
    const up = Math.floor(index / 7);
    return clamp(60 + (this.key + sc[i]) % 12 + up * 12 + (oct - 4) * 12, 26, 100);
  }

  chordSet(oct: number, spread: boolean = false): number[] {
    const intervals = this.ivs(this.deg);
    return intervals.map((iv, i) => {
      let o = oct;
      if (spread && i === intervals.length - 1 && intervals.length > 2) o = oct + 1;
      return 60 + this.rootSemi(this.deg) + iv + (o - 4) * 12;
    });
  }

  setDeg(d: number) {
    this.deg = d % 7;
    this.sinceChange = 0;
  }

  nextDeg(): number {
    const T = this.tension;
    const calm = [0, 0, 3, 5, 3, 1];
    const mid = [3, 4, 1, 5, 0, 2];
    const hot = [4, 4, 6, 2, 4, 1];
    const pool = T < 0.33 ? calm : T < 0.66 ? mid : hot;
    const cands = pool.filter((d) => d !== this.deg);
    return cands.length
      ? cands[(Math.random() * cands.length) | 0]
      : pool[(Math.random() * pool.length) | 0];
  }

  bloom() {
    if (this.bloomCool > 0) return;
    this.bloomCool = 12;
    this.blooms++;
    if (this.modFreq > 0 && this.blooms % this.modFreq === 0) {
      this.pendingMod = true;
    }
  }

  modulate() {
    const pk = this.key;
    const pm = this.mode;
    const mt = MOD_TYPES[this.modType] || MOD_TYPES.fifth;
    this.key = mt.fn(this.key, this.mode);
    if (this.modType === "relative") this.mode = pm === "major" ? "minor" : "major";
    if (this.modType === "parallel") this.mode = PAR_MODE[this.mode] || "major";
    this.setDeg(0);
    this.lastModBanner = mt.desc(pk, this.key, pm);
  }

  // --- Spatial 3D Projection Helpers ---

  getPanAndPresence(camera: THREE.Camera | undefined, pos: THREE.Vector3): { pan: number; presence: number } {
    if (!camera) return { pan: 0, presence: 0.8 };
    this._projectVec.copy(pos);
    this._projectVec.project(camera);

    const pan = clamp(this._projectVec.x, -1, 1);
    const distance = camera.position.distanceTo(pos);
    // Attenuation over distance
    const presence = clamp(1.2 - distance / 500, 0.1, 1.0);
    return { pan, presence };
  }

  // --- Simulation Event Hooks ---

  /**
   * Called when an organism is born (either a new emerging species or offspring from mating)
   */
  onSpeciesBorn(genome: any, pos?: THREE.Vector3, camera?: THREE.Camera) {
    if (!this.ctx || !this.enableBirthSound || !this.enabled) return;
    const { pan, presence } = pos ? this.getPanAndPresence(camera, pos) : { pan: 0, presence: 0.9 };

    const t = this.ctx.currentTime;
    if (!this.allow("pad", t)) return;

    // Rich blossoming pad chord across harmonic degrees in the chosen pad octave
    const oct = this.channelOctaves.pad ?? 4;
    const chordNotes = [
      this.tone(0, oct),
      this.tone(2, oct),
      this.tone(4, clamp(oct + 1, 1, 7)),
    ];

    this.pad(chordNotes, {
      pan,
      vol: 0.85 * presence,
      cut: this.aCut * 1.3,
    });

    // High sparkling birth chime in the chosen bell octave
    const bellOct = this.channelOctaves.bell ?? 6;
    setTimeout(() => {
      this.bell(this.tone(4, bellOct), {
        pan,
        vol: 0.7 * presence,
        dur: 1.6,
      });
    }, 120);
  }

  /**
   * Called on successful mating between two parent strains
   */
  onMatingSuccess(midPoint: THREE.Vector3, childGenome: any, camera?: THREE.Camera) {
    if (!this.ctx || !this.enableMatingSound || !this.enabled) return;
    const { pan, presence } = this.getPanAndPresence(camera, midPoint);

    // Harmonic bloom trigger
    this.bloom();

    // Cascading bloom chord sequence in the chosen pad octave
    const oct = this.channelOctaves.pad ?? 4;
    [0, 2, 4, 6].forEach((degOffset, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.enabled) return;
        this.pad([this.tone(degOffset, clamp(oct + (idx > 2 ? 1 : 0), 1, 7))], {
          pan: pan + (idx % 2 === 0 ? -0.1 : 0.1),
          vol: 0.75 * presence,
          cut: this.aCut * 1.2,
        });
      }, idx * 90);
    });

    // Resonant celebration chime in the chosen bell octave
    const bellOct = this.channelOctaves.bell ?? 6;
    this.bell(this.scaleTone(4, bellOct), {
      pan,
      vol: 0.8 * presence,
      dur: 2.2,
    });

    // Deep percussive pulse
    this.bump(pan, 0.65 * presence);
  }

  /**
   * Called when feelers or partners approach in close mating contact
   */
  onMatingContact(midPoint: THREE.Vector3, camera?: THREE.Camera) {
    if (!this.ctx || !this.enableMatingSound || !this.enableDroneSound || !this.enabled) return;
    const { pan, presence } = this.getPanAndPresence(camera, midPoint);

    const semi = this.rootSemi(this.deg);
    const droneOct = this.channelOctaves.drone ?? 2;
    const midi = 12 * (droneOct + 1) + semi;
    this.droneOn("mating_drone", midi, pan, 0.7 * presence);

    setTimeout(() => {
      this.droneOff("mating_drone");
    }, 2800);
  }

  /**
   * Called when an agent branches / bifurcates
   */
  onBranchSpawn(agent: any, camera?: THREE.Camera) {
    if (!this.ctx || !this.enableBirthSound || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (!this.allow("branch", t)) return;

    const { pan, presence } = this.getPanAndPresence(camera, agent.position);
    const depth = agent.branchDepth || 0;
    const branchOct = this.channelOctaves.branch ?? 5;
    const oct = clamp(branchOct + Math.floor(depth / 3), 1, 7);
    const midi = this.scaleTone(depth + ((Math.random() * 3) | 0), oct);

    this.pluck(midi, {
      pan,
      vol: (0.45 + (1 / (depth + 1)) * 0.35) * presence,
      dur: 120,
      cut: 5000 + depth * 500,
      busName: "branch",
    });
  }

  /**
   * Called on creature movement / step update
   */
  onAgentStep(agent: any, camera?: THREE.Camera) {
    if (!this.ctx || !this.enableMovementSound || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (!this.allow("step", t)) return;

    const { pan, presence } = this.getPanAndPresence(camera, agent.position);
    if (presence < 0.15) return;

    const oct = this.channelOctaves.step ?? 5;
    const toneIdx = (agent.id || 0) % 7;
    const midi = this.bNoteMode === "scale"
      ? this.scaleTone(toneIdx, oct)
      : this.tone(toneIdx, oct);

    this.pluck(midi, {
      pan,
      vol: 0.28 * presence,
      dur: 85,
      cut: 4200,
    });
  }

  /**
   * Called when an agent bounces against simulation boundaries
   */
  onAgentBounce(pos: THREE.Vector3, camera?: THREE.Camera) {
    if (!this.ctx || !this.enableMovementSound || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (!this.allow("perc", t)) return;

    const { pan, presence } = this.getPanAndPresence(camera, pos);
    this.bump(pan, 0.45 * presence);
  }

  /**
   * Frame tick: updates harmonic progression, tension, auto-mode, and environment cycling
   * (Runs in real wall-clock time independent of timeScale!)
   */
  tick(realDt: number, metrics: { density: number; activity: number; activeAgents: number }, camera?: THREE.Camera) {
    if (!this.ctx || !this.enabled) return;

    const dt = Math.min(0.05, realDt);
    this.sinceChange += dt;
    this.colourT += dt;
    if (this.bloomCool > 0) this.bloomCool -= dt;

    // Update harmonic tension from simulation ecology
    const rawTension = clamp(metrics.density * 0.5 + metrics.activity * 0.5, 0, 1);
    this.tension = lerp(this.tension, rawTension, 0.035);

    // Chord complexity evolves with agent density
    const wantColour = metrics.activeAgents > 40 ? "9th" : metrics.activeAgents > 25 ? "7th" : metrics.activeAgents > 12 ? "add9" : "triad";
    if (wantColour !== this.colour && this.colourT > 2.0) {
      this.colour = wantColour;
      this.colourT = 0;
    }

    // Auto harmonic mode adaptation
    if (this.autoMode && this.sinceChange > 4.0) {
      const bright = metrics.activity;
      const wantMode = bright > 0.65 ? "lydian" : bright > 0.45 ? "major" : bright > 0.30 ? "dorian" : "minor";
      if (wantMode !== this.mode && Math.random() < 0.003) {
        this.mode = wantMode;
      }
    }

    // Key modulation check
    if (this.pendingMod && this.sinceChange > this.minGap) {
      this.pendingMod = false;
      this.modulate();
    } else if (this.sinceChange > this.maxGap) {
      this.setDeg(this.nextDeg());
    }

    // Stochastic rain droplets if rain environment is active
    if (this.currentEnvironment === "rain" || this.currentEnvironment === "twilight" || this.currentEnvironment === "mist") {
      const cfg = SOUND_ENVIRONMENTS[this.currentEnvironment];
      if (cfg.dropletFrequency > 0 && Math.random() < cfg.dropletFrequency * 0.15) {
        const rndPan = (Math.random() * 2 - 1) * 0.8;
        this.raindrop(rndPan, cfg.rainVolume);
      }
    }

    // Auto-cycle environment timer
    if (this.autoCycleEnvironments && !this.syncWithThemes) {
      this.envCycleTimer += dt;
      if (this.envCycleTimer >= this.envCycleDuration) {
        this.envCycleTimer = 0;
        this.cycleNextEnvironment();
      }
    }
  }

  /**
   * Syncs sound environment to LifeSim's active visual theme
   */
  syncThemeEnvironment(themeId: number) {
    if (!this.syncWithThemes) return;
    const themeEnvMap: Record<number, SoundEnvironmentId> = {
      0: "sunny",     // NORMAL -> Sunny
      1: "mist",      // ALBINO -> Ethereal Mist
      2: "rain",      // COMPLEMENT -> Rain Shower
      3: "twilight",  // DUOTONE -> Twilight Storm
    };
    const target = themeEnvMap[themeId] || "sunny";
    if (target !== this.currentEnvironment) {
      this.setEnvironment(target);
    }
  }
}
