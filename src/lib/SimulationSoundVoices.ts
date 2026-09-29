import * as THREE from "three";
import { clamp, midiToHz, SoundVoiceOptions } from "./SimulationSoundTheory";

/**
 * Generates an impulse response buffer for procedural convolver reverb
 * with warm pinked stereo decay and early reflections.
 */
export function generateReverbBuffer(ctx: AudioContext, decaySeconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * decaySeconds);
  const ir = ctx.createBuffer(2, len, sr);
  const earlyTimes = [0.014, 0.029, 0.047, 0.068, 0.093];
  const earlyGains = [0.85, 0.65, 0.50, 0.38, 0.28];

  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2.0);
      const white = (Math.random() * 2 - 1) * env;
      lp = lp * 0.84 + white * 0.16;
      d[i] = lp;
    }
    for (let e = 0; e < earlyTimes.length; e++) {
      const offset = Math.floor((earlyTimes[e] + (ch === 1 ? 0.004 : 0)) * sr);
      if (offset < len) {
        d[offset] += (ch === 0 ? 1 : -1) * earlyGains[e] * 0.35;
      }
    }
  }
  return ir;
}

/**
 * Generates a white noise buffer used for wind beds, rain loops, and percussive bumps.
 */
export function createNoiseBuffer(ctx: AudioContext, durationSeconds = 2.5): AudioBuffer {
  const nl = Math.floor(ctx.sampleRate * durationSeconds);
  const buf = ctx.createBuffer(1, nl, ctx.sampleRate);
  const nd = buf.getChannelData(0);
  for (let i = 0; i < nl; i++) {
    nd[i] = Math.random() * 2 - 1;
  }
  return buf;
}

/**
 * Computes 3D camera-relative spatial panning and distance presence attenuation.
 */
export function computeSpatialPanAndPresence(
  camera: THREE.Camera | undefined,
  pos: THREE.Vector3,
  projectVec: THREE.Vector3,
): { pan: number; presence: number } {
  if (!camera) return { pan: 0, presence: 0.8 };

  projectVec.copy(pos).project(camera);
  const pan = clamp(projectVec.x * 0.85, -1, 1);
  const camDist = camera.position.distanceTo(pos);
  const presence = clamp(1.0 - (camDist - 25) / 220, 0.2, 1.0);

  return { pan, presence };
}

export function synthesizeBellVoice(
  ctx: AudioContext,
  midi: number,
  o: SoundVoiceOptions,
  head: BiquadFilterNode,
  dVol: number,
  onEnd: () => void,
) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = midiToHz(midi);

  const v = (o.vol == null ? 1 : o.vol) * (dVol / 100) * 0.13;
  const dur = o.dur || 1.1;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  osc.connect(g);
  g.connect(head);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  osc.onended = onEnd;
}

export function synthesizeBumpVoice(
  ctx: AudioContext,
  noiseBuf: AudioBuffer,
  head: BiquadFilterNode,
  force: number,
  percOct: number,
  onEnd: () => void,
) {
  const t = ctx.currentTime;
  const pitchMult = Math.pow(2, (percOct - 4) * 0.65);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = noiseBuf;
  src.playbackRate.value = clamp((0.7 + Math.random() * 0.6) * pitchMult, 0.15, 4.0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05 * force, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.10 + force * 0.10);
  src.connect(g);
  g.connect(head);
  src.start(t);
  src.stop(t + 0.30);
  src.onended = onEnd;
}

export function synthesizeRaindropVoice(
  ctx: AudioContext,
  tone: number,
  head: BiquadFilterNode,
  intensity: number,
  rainIntensity: number,
  onEnd: () => void,
) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(midiToHz(tone) * (1.2 + Math.random() * 0.4), t);
  osc.frequency.exponentialRampToValueAtTime(midiToHz(tone) * 0.6, t + 0.06);

  const v = 0.015 * intensity * (rainIntensity || 1.0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0002, t + 0.075);

  osc.connect(g);
  g.connect(head);
  osc.start(t);
  osc.stop(t + 0.09);
  osc.onended = onEnd;
}

export interface PadVoiceParams {
  aVol: number;
  aSus: number;
  aWave1: OscillatorType;
  aWave2: OscillatorType | "off";
  aAttk: number;
  aDec: number;
  aRel: number;
}

export function synthesizePadVoiceNote(
  ctx: AudioContext,
  m: number,
  index: number,
  totalNotes: number,
  params: PadVoiceParams,
  o: SoundVoiceOptions,
  head: BiquadFilterNode,
  onEnd: () => void,
) {
  const t = ctx.currentTime;
  const vol = (o.vol == null ? 1 : o.vol) * (params.aVol / 100);
  const sus = params.aSus / 100;
  const st = t + index * 0.038;
  const peak = (vol * 0.17) / Math.sqrt(Math.max(1, totalNotes));
  const susL = peak * sus;

  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.type = params.aWave1;
  o1.frequency.value = midiToHz(m);
  if (o.detune) o1.detune.value = o.detune;

  g1.gain.setValueAtTime(0, st);
  g1.gain.linearRampToValueAtTime(peak, st + params.aAttk);
  g1.gain.linearRampToValueAtTime(susL, st + params.aAttk + params.aDec);
  g1.gain.setTargetAtTime(0, st + params.aAttk + params.aDec + 0.04, params.aRel * 0.42);
  o1.connect(g1);
  g1.connect(head);

  const life = params.aAttk + params.aDec + params.aRel * 1.9;
  o1.start(st);
  o1.stop(st + life);
  o1.onended = onEnd;

  if (params.aWave2 !== "off") {
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = params.aWave2;
    o2.frequency.value = midiToHz(m) * 2.002;
    if (o.detune) o2.detune.value = -o.detune * 0.5;
    const pk2 = peak * 0.34;

    g2.gain.setValueAtTime(0, st);
    g2.gain.linearRampToValueAtTime(pk2, st + params.aAttk + 0.03);
    g2.gain.linearRampToValueAtTime(pk2 * sus, st + params.aAttk + params.aDec + 0.03);
    g2.gain.setTargetAtTime(0, st + params.aAttk + params.aDec + 0.07, params.aRel * 0.46);
    o2.connect(g2);
    g2.connect(head);
    o2.start(st);
    o2.stop(st + life);
  }
}

export interface PluckVoiceParams {
  bDur: number;
  bWave: OscillatorType;
  bVol: number;
}

export function synthesizePluckVoice(
  ctx: AudioContext,
  midi: number,
  params: PluckVoiceParams,
  o: SoundVoiceOptions,
  head: BiquadFilterNode,
  onEnd: () => void,
) {
  const t = ctx.currentTime;
  const dur = (o.dur || params.bDur) / 1000;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = params.bWave;
  osc.frequency.value = midiToHz(midi);
  if (o.detune) osc.detune.value = o.detune;

  const v = (o.vol == null ? 1 : o.vol) * (params.bVol / 100) * 0.30;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(g);
  g.connect(head);
  osc.start(t);
  osc.stop(t + dur + 0.06);
  osc.onended = onEnd;
}
