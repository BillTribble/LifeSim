import * as THREE from "three";
export * from "./SimulationSoundTheory";
export * from "./SimulationSoundVoices";
export * from "./SimulationSoundEvents";
import {
  handleSpeciesBorn,
  handleMatingSuccess,
  handleMatingContact,
  handleBranchSpawn,
  handleAgentStep,
  handleAgentBounce,
  handleSoundTick,
  handleSyncThemeEnvironment,
  initWeatherAudioNodes,
  applySoundEnvironment,
} from "./SimulationSoundEvents";
import {
  NOTE_NAMES,
  MODES,
  CHORD_DEG,
  COL_MAJ,
  COL_MIN,
  PAR_MODE,
  ModulationType,
  MOD_TYPES,
  midiToHz,
  clamp,
  lerp,
  SoundVoiceOptions,
  DroneInstance,
  SoundEnvironmentId,
  SoundEnvironmentConfig,
  SOUND_ENVIRONMENTS,
  computeRootSemi,
  computeChordType,
  computeChordIntervals,
  computeTone,
  computeScaleTone,
  computeChordSet,
  computeNextDeg,
  computeNextEnvironment,
} from "./SimulationSoundTheory";
import {
  generateReverbBuffer,
  createNoiseBuffer,
  computeSpatialPanAndPresence,
  synthesizeBellVoice,
  synthesizeBumpVoice,
  synthesizeRaindropVoice,
  synthesizePadVoiceNote,
  synthesizePluckVoice,
} from "./SimulationSoundVoices";

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
    pad: 57, step: 51, branch: 69, bell: 75, drone: 70, perc: 58, weather: 65,
  };
  channelReverbSends: Record<string, number> = {
    pad: 79, step: 35, branch: 45, bell: 50, drone: 45, perc: 30, weather: 30,
  };
  channelOctaves: Record<string, number> = {
    pad: 2, step: 4, branch: 5, bell: 6, drone: 2, perc: 4, weather: 6,
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
  aOct: number = 2;
  aVol: number = 70;
  aAttk: number = 0.12;
  aDec: number = 0.50;
  aSus: number = 65;
  aRel: number = 2.20;
  aCut: number = 3200;
  aRes: number = 2;

  bWave: OscillatorType = "sine";
  bNoteMode: "chord" | "scale" = "chord";
  bOct: number = 4;
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
        pad: 79, step: 35, branch: 45, bell: 50, drone: 45, perc: 30, weather: 30,
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
      this.noiseBuf = createNoiseBuffer(this.ctx, 2.5);

      // Initialize Ambient Weather & Rain synthesis loop
      this.initWeatherNodes();
      this.applyEnvironment(this.currentEnvironment, true);
    } catch (err) {
      console.warn("LifeSim Web Audio initialization deferred:", err);
    }
  }

  private initWeatherNodes() {
    initWeatherAudioNodes(this);
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

  /** Play a subtle preview tone when changing a channel's active octave */
  previewChannelOctave(ch: string, val: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const oct = clamp(Math.round(val), 1, 7);
    this.setChannelOctave(ch, oct);

    if (ch === "pad") {
      this.pad([this.tone(0, oct), this.tone(2, oct)], { vol: 0.65, cut: this.aCut });
    } else if (ch === "step") {
      this.pluck(this.tone(0, oct), { vol: 0.7, dur: 110, cut: 4500, busName: "step" });
    } else if (ch === "branch") {
      this.pluck(this.scaleTone(2, oct), { vol: 0.7, dur: 130, cut: 5500, busName: "branch" });
    } else if (ch === "bell") {
      this.bell(this.tone(4, oct), { vol: 0.75, dur: 1.4 });
    } else if (ch === "drone") {
      const semi = this.rootSemi(this.deg);
      const midi = 12 * (oct + 1) + semi;
      this.droneOn("preview_drone", midi, 0, 0.75);
      setTimeout(() => this.droneOff("preview_drone"), 1400);
    } else if (ch === "perc") {
      this.bump(0, 0.8);
    } else if (ch === "weather") {
      this.raindrop(0, 1.0);
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
    this.conv.buffer = generateReverbBuffer(this.ctx, this.decaySec(this.reverbDecay));
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

    const params = {
      aVol: this.aVol,
      aSus: this.aSus,
      aWave1: this.aWave1,
      aWave2: this.aWave2,
      aAttk: this.aAttk,
      aDec: this.aDec,
      aRel: this.aRel,
    };

    midis.forEach((m, i) => {
      if (!this.ctx) return;
      const nodes = this.chain(o.pan || 0, o.cut || this.aCut, this.aRes, "pad");
      this.active++;
      synthesizePadVoiceNote(this.ctx, m, i, midis.length, params, o, nodes.head, () => this.free(nodes));
    });
  }

  pluck(midi: number, o: SoundVoiceOptions = {}) {
    if (!this.ctx || !this.enabled) return;
    if (this.active >= this.cap) return;

    const busName = o.busName || "step";
    const nodes = this.chain(o.pan || 0, o.cut || this.bCut, this.bRes, busName);
    const params = {
      bDur: this.bDur,
      bWave: this.bWave,
      bVol: this.bVol,
    };

    this.active++;
    synthesizePluckVoice(this.ctx, midi, params, o, nodes.head, () => this.free(nodes));
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
    const nodes = this.chain(o.pan || 0, 14000, 0.6, "bell");
    this.active++;
    synthesizeBellVoice(this.ctx, midi, o, nodes.head, this.dVol, () => this.free(nodes));
  }

  bump(pan: number = 0, force: number = 1) {
    if (!this.ctx || !this.enabled || !this.noiseBuf) return;
    if (this.active >= this.cap) return;
    const percOct = this.channelOctaves.perc ?? 4;
    const pitchMult = Math.pow(2, (percOct - 4) * 0.65);
    const nodes = this.chain(pan || 0, clamp((1400 + force * 2600) * pitchMult, 180, 14000), 4, "perc");
    this.active++;
    synthesizeBumpVoice(this.ctx, this.noiseBuf, nodes.head, force, percOct, () => this.free(nodes));
  }

  // --- Rain Droplet Generator ---

  raindrop(pan: number = 0, intensity: number = 1) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (!this.allow("droplet", t)) return;
    const wxOct = this.channelOctaves.weather ?? 6;
    const filterMult = Math.pow(2, (wxOct - 6) * 0.35);
    const nodes = this.chain(pan, clamp((6000 + Math.random() * 4000) * filterMult, 400, 16000), 3, "weather");
    const tone = this.scaleTone((Math.random() * 7) | 0, wxOct);
    this.active++;
    synthesizeRaindropVoice(this.ctx, tone, nodes.head, intensity, this.rainIntensity || 1.0, () => this.free(nodes));
  }

  // --- Environment Switching & Weather Control ---

  setEnvironment(envId: SoundEnvironmentId) {
    this.targetEnvironment = envId;
    this.applyEnvironment(envId, false);
  }

  applyEnvironment(envId: SoundEnvironmentId, instant: boolean = false) {
    applySoundEnvironment(this, envId, instant);
  }

  cycleNextEnvironment() {
    this.setEnvironment(computeNextEnvironment(this.currentEnvironment));
  }

  // --- Music Theory & Harmonic Progression ---

  rootSemi(deg: number): number {
    return computeRootSemi(this.key, this.mode, deg);
  }

  type(deg: number): string {
    return computeChordType(this.mode, deg);
  }

  ivs(deg: number): number[] {
    return computeChordIntervals(this.mode, this.colour, deg);
  }

  tone(index: number, oct: number, deg?: number): number {
    return computeTone(this.key, this.mode, this.colour, deg ?? this.deg, index, oct);
  }

  scaleTone(index: number, oct: number): number {
    return computeScaleTone(this.key, this.mode, index, oct);
  }

  chordSet(oct: number, spread: boolean = false): number[] {
    return computeChordSet(this.key, this.mode, this.colour, this.deg, oct, spread);
  }

  setDeg(d: number) {
    this.deg = d % 7;
    this.sinceChange = 0;
  }

  nextDeg(): number {
    return computeNextDeg(this.deg, this.tension);
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
    return computeSpatialPanAndPresence(camera, pos, this._projectVec);
  }

  // --- Simulation Event Hooks ---

  /**
   * Called when an organism is born (either a new emerging species or offspring from mating)
   */
  onSpeciesBorn(genome: any, pos?: THREE.Vector3, camera?: THREE.Camera) {
    handleSpeciesBorn(this, genome, pos, camera);
  }

  /**
   * Called on successful mating between two parent strains
   */
  onMatingSuccess(midPoint: THREE.Vector3, childGenome: any, camera?: THREE.Camera) {
    handleMatingSuccess(this, midPoint, childGenome, camera);
  }

  /**
   * Called when feelers or partners approach in close mating contact
   */
  onMatingContact(midPoint: THREE.Vector3, camera?: THREE.Camera) {
    handleMatingContact(this, midPoint, camera);
  }

  /**
   * Called when an agent branches / bifurcates
   */
  onBranchSpawn(agent: any, camera?: THREE.Camera) {
    handleBranchSpawn(this, agent, camera);
  }

  /**
   * Called on creature movement / step update
   */
  onAgentStep(agent: any, camera?: THREE.Camera) {
    handleAgentStep(this, agent, camera);
  }

  /**
   * Called when an agent bounces against simulation boundaries
   */
  onAgentBounce(pos: THREE.Vector3, camera?: THREE.Camera) {
    handleAgentBounce(this, pos, camera);
  }

  /**
   * Frame tick: updates harmonic progression, tension, auto-mode, and environment cycling
   * (Runs in real wall-clock time independent of timeScale!)
   */
  tick(realDt: number, metrics: { density: number; activity: number; activeAgents: number }, camera?: THREE.Camera) {
    handleSoundTick(this, realDt, metrics, camera);
  }

  /**
   * Syncs sound environment to LifeSim's active visual theme
   */
  syncThemeEnvironment(themeId: number) {
    handleSyncThemeEnvironment(this, themeId);
  }
}

