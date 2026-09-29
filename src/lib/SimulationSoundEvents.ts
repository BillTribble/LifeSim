import * as THREE from "three";
import { clamp, lerp, SOUND_ENVIRONMENTS, SoundEnvironmentId } from "./SimulationSoundTheory";
import type { SimulationSound } from "./SimulationSound";

export function handleSpeciesBorn(
  sound: SimulationSound,
  _genome: any,
  pos?: THREE.Vector3,
  camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enableBirthSound || !sound.enabled) return;
  const { pan, presence } = pos ? sound.getPanAndPresence(camera, pos) : { pan: 0, presence: 0.9 };

  const t = sound.ctx.currentTime;
  if (!sound.allow("pad", t)) return;

  const oct = sound.channelOctaves.pad ?? 2;
  const chordNotes = [
    sound.tone(0, oct),
    sound.tone(2, oct),
    sound.tone(4, clamp(oct + 1, 1, 7)),
  ];

  sound.pad(chordNotes, {
    pan,
    vol: 0.85 * presence,
    cut: sound.aCut * 1.3,
  });

  const bellOct = sound.channelOctaves.bell ?? 6;
  setTimeout(() => {
    sound.bell(sound.tone(4, bellOct), {
      pan,
      vol: 0.7 * presence,
      dur: 1.6,
    });
  }, 120);
}

export function handleMatingSuccess(
  sound: SimulationSound,
  midPoint: THREE.Vector3,
  _childGenome: any,
  camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enableMatingSound || !sound.enabled) return;
  const { pan, presence } = sound.getPanAndPresence(camera, midPoint);

  sound.bloom();

  const oct = sound.channelOctaves.pad ?? 2;
  [0, 2, 4, 6].forEach((degOffset, idx) => {
    setTimeout(() => {
      if (!sound.ctx || !sound.enabled) return;
      sound.pad([sound.tone(degOffset, clamp(oct + (idx > 2 ? 1 : 0), 1, 7))], {
        pan: pan + (idx % 2 === 0 ? -0.1 : 0.1),
        vol: 0.75 * presence,
        cut: sound.aCut * 1.2,
      });
    }, idx * 90);
  });

  const bellOct = sound.channelOctaves.bell ?? 6;
  sound.bell(sound.scaleTone(4, bellOct), {
    pan,
    vol: 0.8 * presence,
    dur: 2.2,
  });

  sound.bump(pan, 0.65 * presence);
}

export function handleMatingContact(
  sound: SimulationSound,
  midPoint: THREE.Vector3,
  camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enableMatingSound || !sound.enableDroneSound || !sound.enabled) return;
  const { pan, presence } = sound.getPanAndPresence(camera, midPoint);

  const semi = sound.rootSemi(sound.deg);
  const droneOct = sound.channelOctaves.drone ?? 2;
  const midi = 12 * (droneOct + 1) + semi;
  sound.droneOn("mating_drone", midi, pan, 0.7 * presence);

  setTimeout(() => {
    sound.droneOff("mating_drone");
  }, 2800);
}

export function handleBranchSpawn(
  sound: SimulationSound,
  agent: any,
  camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enableBirthSound || !sound.enabled) return;
  const t = sound.ctx.currentTime;
  if (!sound.allow("branch", t)) return;

  const { pan, presence } = sound.getPanAndPresence(camera, agent.position);
  const depth = agent.branchDepth || 0;
  const branchOct = sound.channelOctaves.branch ?? 5;
  const oct = clamp(branchOct + Math.floor(depth / 3), 1, 7);
  const midi = sound.scaleTone(depth + ((Math.random() * 3) | 0), oct);

  sound.pluck(midi, {
    pan,
    vol: (0.45 + (1 / (depth + 1)) * 0.35) * presence,
    dur: 120,
    cut: 5000 + depth * 500,
    busName: "branch",
  });
}

export function handleAgentStep(
  sound: SimulationSound,
  agent: any,
  camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enableMovementSound || !sound.enabled) return;
  const t = sound.ctx.currentTime;
  if (!sound.allow("step", t)) return;

  const { pan, presence } = sound.getPanAndPresence(camera, agent.position);
  if (presence < 0.15) return;

  const oct = sound.channelOctaves.step ?? 4;
  const toneIdx = (agent.id || 0) % 7;
  const midi = sound.bNoteMode === "scale"
    ? sound.scaleTone(toneIdx, oct)
    : sound.tone(toneIdx, oct);

  sound.pluck(midi, {
    pan,
    vol: 0.28 * presence,
    dur: 85,
    cut: 4200,
  });
}

export function handleAgentBounce(
  sound: SimulationSound,
  pos: THREE.Vector3,
  camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enableMovementSound || !sound.enabled) return;
  const t = sound.ctx.currentTime;
  if (!sound.allow("perc", t)) return;

  const { pan, presence } = sound.getPanAndPresence(camera, pos);
  sound.bump(pan, 0.45 * presence);
}

export function handleSoundTick(
  sound: SimulationSound,
  realDt: number,
  metrics: { density: number; activity: number; activeAgents: number },
  _camera?: THREE.Camera,
) {
  if (!sound.ctx || !sound.enabled) return;

  const dt = Math.min(0.05, realDt);
  sound.sinceChange += dt;
  sound.colourT += dt;
  if (sound.bloomCool > 0) sound.bloomCool -= dt;

  const rawTension = clamp(metrics.density * 0.5 + metrics.activity * 0.5, 0, 1);
  sound.tension = lerp(sound.tension, rawTension, 0.035);

  const wantColour = metrics.activeAgents > 40 ? "9th" : metrics.activeAgents > 25 ? "7th" : metrics.activeAgents > 12 ? "add9" : "triad";
  if (wantColour !== sound.colour && sound.colourT > 2.0) {
    sound.colour = wantColour;
    sound.colourT = 0;
  }

  if (sound.autoMode && sound.sinceChange > 4.0) {
    const bright = metrics.activity;
    const wantMode = bright > 0.65 ? "lydian" : bright > 0.45 ? "major" : bright > 0.30 ? "dorian" : "minor";
    if (wantMode !== sound.mode && Math.random() < 0.003) {
      sound.mode = wantMode;
    }
  }

  if (sound.pendingMod && sound.sinceChange > sound.minGap) {
    sound.pendingMod = false;
    sound.modulate();
  } else if (sound.sinceChange > sound.maxGap) {
    sound.setDeg(sound.nextDeg());
  }

  if (sound.currentEnvironment === "rain" || sound.currentEnvironment === "twilight" || sound.currentEnvironment === "mist") {
    const cfg = SOUND_ENVIRONMENTS[sound.currentEnvironment];
    if (cfg.dropletFrequency > 0 && Math.random() < cfg.dropletFrequency * 0.15) {
      const rndPan = (Math.random() * 2 - 1) * 0.8;
      sound.raindrop(rndPan, cfg.rainVolume);
    }
  }

  if (sound.autoCycleEnvironments && !sound.syncWithThemes) {
    sound.envCycleTimer += dt;
    if (sound.envCycleTimer >= sound.envCycleDuration) {
      sound.envCycleTimer = 0;
      sound.cycleNextEnvironment();
    }
  }
}

export function handleSyncThemeEnvironment(sound: SimulationSound, themeId: number) {
  if (!sound.syncWithThemes) return;
  const themeEnvMap: Record<number, SoundEnvironmentId> = {
    0: "sunny",
    1: "mist",
    2: "rain",
    3: "twilight",
  };
  const target = themeEnvMap[themeId] || "sunny";
  if (target !== sound.currentEnvironment) {
    sound.setEnvironment(target);
  }
}

export function initWeatherAudioNodes(sound: SimulationSound) {
  if (!sound.ctx || !sound.noiseBuf || !sound.bus.weather) return;

  sound.rainFilter = sound.ctx.createBiquadFilter();
  sound.rainFilter.type = "bandpass";
  sound.rainFilter.frequency.value = 1600;
  sound.rainFilter.Q.value = 1.8;

  sound.rainGain = sound.ctx.createGain();
  sound.rainGain.gain.value = 0.0001;

  sound.rainSource = sound.ctx.createBufferSource();
  sound.rainSource.buffer = sound.noiseBuf;
  sound.rainSource.loop = true;
  sound.rainSource.playbackRate.value = 1.0;

  sound.rainSource.connect(sound.rainFilter);
  sound.rainFilter.connect(sound.rainGain);
  sound.rainGain.connect(sound.bus.weather);
  sound.rainSource.start();

  sound.breezeFilter = sound.ctx.createBiquadFilter();
  sound.breezeFilter.type = "lowpass";
  sound.breezeFilter.frequency.value = 450;
  sound.breezeFilter.Q.value = 1.2;

  sound.breezeGain = sound.ctx.createGain();
  sound.breezeGain.gain.value = 0.0001;

  sound.breezeSource = sound.ctx.createBufferSource();
  sound.breezeSource.buffer = sound.noiseBuf;
  sound.breezeSource.loop = true;
  sound.breezeSource.playbackRate.value = 0.45;

  sound.breezeSource.connect(sound.breezeFilter);
  sound.breezeFilter.connect(sound.breezeGain);
  sound.breezeGain.connect(sound.bus.weather);
  sound.breezeSource.start();
}

export function applySoundEnvironment(sound: SimulationSound, envId: SoundEnvironmentId, instant: boolean = false) {
  const env = SOUND_ENVIRONMENTS[envId];
  if (!env) return;

  sound.currentEnvironment = envId;
  sound.mode = env.defaultMode;
  sound.setSpace(env.space);

  sound.aAttk = env.padAttack;
  sound.aCut = env.padCutoff;

  if (sound.ctx && sound.enableWeatherSound) {
    const t = sound.ctx.currentTime;
    const ramp = instant ? 0.05 : 3.0;

    const wxOct = sound.channelOctaves.weather ?? 6;
    const wxMult = Math.pow(2, (wxOct - 6) * 0.35);

    if (sound.rainGain && sound.rainFilter) {
      const targetRain = env.rainVolume * sound.rainIntensity * (sound.masterVolume > 0 ? 1 : 0);
      sound.rainGain.gain.setTargetAtTime(targetRain * 0.12, t, ramp);
      sound.rainFilter.frequency.setTargetAtTime(clamp(env.rainFilterCutoff * wxMult, 200, 12000), t, ramp);
    }

    if (sound.breezeGain && sound.breezeFilter) {
      const targetBreeze = env.breezeVolume * (sound.masterVolume > 0 ? 1 : 0);
      sound.breezeGain.gain.setTargetAtTime(targetBreeze * 0.08, t, ramp);
      sound.breezeFilter.frequency.setTargetAtTime(clamp(450 * wxMult, 120, 4000), t, ramp);
    }
  }
}
