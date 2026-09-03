import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { DEFAULTS } from '../src/hooks/SimulationDefaults';
import { updateSimulation } from '../src/lib/SimulationUpdate';
import { resetEngine, applyDefaults } from './test_mating_rate';

// Test runner where we can test parameter configurations
export function runParamTest(config: {
  numRuns?: number;
  maxSeconds?: number;
  seekAmount?: number;
  magnetism?: number;
  feelerChancePerSec?: number;
  feelerStepSize?: number;
  feelerSpeed?: number;
  feelerHomingLerp?: number;
}) {
  const numRuns = config.numRuns ?? 100;
  const maxSeconds = config.maxSeconds ?? 30;
  const fps = 60;
  const maxFrames = maxSeconds * fps;

  const canvas = {
    clientWidth: 1280,
    clientHeight: 720,
    width: 1280,
    height: 720,
    getContext: () => ({
      getExtension: () => null,
      getParameter: () => 0,
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      clearColor: () => {},
      clearDepth: () => {},
      clearStencil: () => {},
      enable: () => {},
      disable: () => {},
      depthFunc: () => {},
      blendEquationSeparate: () => {},
      blendFuncSeparate: () => {},
      viewport: () => {},
      scissor: () => {},
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
  } as any;

  const engine = new SimulationEngine(canvas, 1280, 720);

  let matedCount = 0;
  let feelerCount = 0;
  let bodyCount = 0;
  const times: number[] = [];

  for (let run = 0; run < numRuns; run++) {
    resetEngine(engine);
    applyDefaults(engine);

    if (config.seekAmount !== undefined) engine.seekAmount = config.seekAmount;
    if (config.magnetism !== undefined) engine.magnetism = config.magnetism;

    let firstMating: { timeSec: number; isFeeler: boolean } | null = null;

    engine.onMatingEvent = (event: any) => {
      if (!firstMating) {
        firstMating = {
          timeSec: engine.frameCount / fps,
          isFeeler: !!event.isFeeler,
        };
      }
    };

    for (let frame = 1; frame <= maxFrames; frame++) {
      updateSimulation(engine);
      if (firstMating) break;
    }

    if (firstMating) {
      matedCount++;
      times.push(firstMating.timeSec);
      if (firstMating.isFeeler) feelerCount++;
      else bodyCount++;
    }
  }

  const successRate = (matedCount / numRuns) * 100;
  const feelerPct = matedCount > 0 ? (feelerCount / matedCount) * 100 : 0;
  const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length) : 0;

  console.log(`\nResults: ${matedCount}/${numRuns} (${successRate.toFixed(1)}%) mated in avg ${avgTime.toFixed(2)}s`);
  console.log(`  Feeler: ${feelerCount} (${feelerPct.toFixed(1)}%) | Body: ${bodyCount} (${(100 - feelerPct).toFixed(1)}%)`);
  return { matedCount, feelerCount, bodyCount, feelerPct, successRate, avgTime };
}
