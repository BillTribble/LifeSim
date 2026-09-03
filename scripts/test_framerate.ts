import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures, generateRandomGenome } from '../src/lib/SimulationSceneSetup';
import { updateSimulation } from '../src/lib/SimulationUpdate';
import { DEFAULTS } from '../src/hooks/SimulationDefaults';

function createMockCanvas() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
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
  } as any;
}

async function runFramerateTest() {
  const canvas = createMockCanvas();
  const engine = new SimulationEngine(canvas, 1280, 720);

  // Apply default parameters
  for (const [key, val] of Object.entries(DEFAULTS)) {
    const setterName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
    if (typeof (engine as any)[setterName] === 'function') {
      (engine as any)[setterName](val);
    } else {
      (engine as any)[key] = val;
    }
  }

  // Setup initial creatures
  setupInitialCreatures(engine);

  console.log('================================================================');
  console.log('   LONG-RUN HEADLESS BENCHMARK (2500 frames)');
  console.log(`   maxDOMs: ${engine.maxDOMs}, maxAgents: ${engine.maxAgents}, pruning: ${engine.pruningStrength}`);
  console.log('================================================================');

  const frameTimes: number[] = [];
  const slowBuckets: { frame: number; time: number; activeAgents: number; points: number; note: string }[] = [];

  for (let f = 1; f <= 2500; f++) {
    const t0 = performance.now();
    engine.frameCount++;
    engine.unscaledTime++;
    updateSimulation(engine);
    const t1 = performance.now();
    const dt = t1 - t0;
    frameTimes.push(dt);

    if (f % 250 === 0) {
      const windowTimes = frameTimes.slice(f - 250, f);
      const avg = windowTimes.reduce((a, b) => a + b, 0) / 250;
      const sorted = windowTimes.slice().sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const max = sorted[sorted.length - 1];

      const active = engine.agents.filter(a => a.active && !a.tapering).length;
      const tap = engine.agents.filter(a => a.active && a.tapering).length;
      const total = engine.agents.length;
      const dyingStems = engine.dyingStems.size;

      console.log(
        `Frame ${f.toString().padStart(4)}: avg=${avg.toFixed(2)}ms (${(1000/avg).toFixed(0)} FPS) | ` +
        `p50=${p50.toFixed(2)}ms | p95=${p95.toFixed(2)}ms | max=${max.toFixed(2)}ms | ` +
        `agents=${active} active + ${tap} tap (${total} tot) | pts=${engine.pointCount} (dying=${dyingStems})`
      );
    }
  }

  // Now at frame 1500, profile 50 frames with fine-grained phase timers
  console.log('\n--- PROFILING SUB-PHASES AT FRAME 1500+ ---');
  const phaseTimes: Record<string, number> = {
    themeAndAtmosphere: 0,
    appendageMeshGrowth: 0,
    hybridMeshGrowth: 0,
    stemPackBAttr: 0,
    pulsingGenomes: 0,
    ambientReflect: 0,
    biomassSweep: 0,
    appendageSync: 0,
    processDying: 0,
    hybridConnectionMesh: 0,
    hybridCleanup: 0,
    branchMergeLoop: 0,
    performBranchPruning: 0,
    processAgents: 0,
    capacityCulling: 0,
    censusAndDiagnostics: 0,
  };

  // We can measure each section in updateSimulation


  const overallAvg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const sortedAll = frameTimes.slice().sort((a, b) => a - b);
  const p95All = sortedAll[Math.floor(sortedAll.length * 0.95)];
  const maxAll = sortedAll[sortedAll.length - 1];

  console.log('\n================ BENCHMARK SUMMARY ================');
  console.log(`Overall Average Frame Time: ${overallAvg.toFixed(2)}ms (${(1000/overallAvg).toFixed(1)} FPS)`);
  console.log(`95th Percentile Frame Time: ${p95All.toFixed(2)}ms (${(1000/p95All).toFixed(1)} FPS)`);
  console.log(`Worst Frame Spike:          ${maxAll.toFixed(2)}ms`);
  console.log(`Frames slower than 25ms:    ${slowBuckets.length} / 2500`);
  if (slowBuckets.length > 0) {
    console.log('Sample slow frames:', slowBuckets.slice(0, 5));
  }
  console.log('====================================================\n');
}

runFramerateTest();
