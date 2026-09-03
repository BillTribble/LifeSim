import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { DEFAULTS } from '../src/hooks/SimulationDefaults';
import { updateSimulation } from '../src/lib/SimulationUpdate';

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

export function applyDefaults(engine: SimulationEngine, customParams: Record<string, any> = {}) {
  const merged = { ...DEFAULTS, ...customParams };
  for (const [key, val] of Object.entries(merged)) {
    if (val === undefined) continue;
    const setterName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
    if (typeof (engine as any)[setterName] === 'function') {
      (engine as any)[setterName](val);
    } else {
      (engine as any)[key] = val;
    }
  }
}

export function resetEngine(engine: SimulationEngine) {
  engine.agents = [];
  engine.segments = [];
  engine.pointCount = 0;
  if (engine.cylinderMesh) engine.cylinderMesh.count = 0;
  for (const app of engine.appendages.values()) {
    app.segments = [];
    app.dyingSet.clear();
    app.count = 0;
    if (app.mesh) app.mesh.count = 0;
  }
  engine.biomassMap.clear();
  engine.genomeMap.clear();
  engine.speciesLifecycleMap.clear();
  engine.dyingStems.clear();
  engine.dyingStrains.clear();
  engine.time = 0;
  engine.frameCount = 0;
  engine.unscaledTime = 0;
  engine.nextAgentId = 1;
  engine.matingCount = 0;
  engine.totalHybridCount = 0;
  engine.feelerCount = 0;
  engine.hasAnyOrganismBred = false;
  engine.kioskMode = false;
  engine.initAgents();
}

export function runMatingBenchmark(numRuns = 100, maxSeconds = 30, customParams: Record<string, any> = {}) {
  const fps = 60;
  const maxFrames = maxSeconds * fps; // 1800 frames

  let matedWithin30sCount = 0;
  let feelerMatingCount = 0;
  let bodyMatingCount = 0;
  let noMatingCount = 0;
  const matingTimes: number[] = [];

  const canvas = createMockCanvas();
  const engine = new SimulationEngine(canvas, 1280, 720);
  applyDefaults(engine, customParams);

  for (let run = 0; run < numRuns; run++) {
    resetEngine(engine);
    // Re-apply any custom params that might need refreshing
    applyDefaults(engine, customParams);

    let firstMating: { frame: number; timeSec: number; isFeeler: boolean } | null = null;

    engine.onMatingEvent = (event: any) => {
      if (!firstMating) {
        const p1Name = event.parent1?.name || '';
        const p2Name = event.parent2?.name || '';
        const isFeeler = p1Name.startsWith('Feeler-') || p2Name.startsWith('Feeler-') || !!(event as any).isFeeler;
        firstMating = {
          frame: engine.frameCount,
          timeSec: engine.frameCount / fps,
          isFeeler: !!isFeeler,
        };
      }
    };

    for (let frame = 1; frame <= maxFrames; frame++) {
      updateSimulation(engine);
      if (firstMating) {
        break; // First mating achieved!
      }
    }

    if (firstMating) {
      matedWithin30sCount++;
      matingTimes.push(firstMating.timeSec);
      if (firstMating.isFeeler) {
        feelerMatingCount++;
      } else {
        bodyMatingCount++;
      }
    } else {
      noMatingCount++;
    }

    if ((run + 1) % 20 === 0) {
      process.stdout.write(`Completed ${run + 1}/${numRuns} runs...\n`);
    }
  }

  const avgTime = matingTimes.length > 0 ? (matingTimes.reduce((a, b) => a + b, 0) / matingTimes.length) : 0;
  const feelerPct = matedWithin30sCount > 0 ? (feelerMatingCount / matedWithin30sCount) * 100 : 0;
  const matingSuccessRate = (matedWithin30sCount / numRuns) * 100;

  console.log(`\n================ BENCHMARK RESULTS (${numRuns} runs, ${maxSeconds}s cap) ================`);
  console.log(`Mated within 30s:      ${matedWithin30sCount}/${numRuns} (${matingSuccessRate.toFixed(1)}%)`);
  console.log(`  - Feeler route:      ${feelerMatingCount} (${feelerPct.toFixed(1)}% of matings)`);
  console.log(`  - Direct body route: ${bodyMatingCount} (${(100 - feelerPct).toFixed(1)}% of matings)`);
  console.log(`Did not mate:          ${noMatingCount}/${numRuns} (${((noMatingCount / numRuns) * 100).toFixed(1)}%)`);
  if (matingTimes.length > 0) {
    console.log(`Avg time to mate:      ${avgTime.toFixed(2)}s (min: ${Math.min(...matingTimes).toFixed(2)}s, max: ${Math.max(...matingTimes).toFixed(2)}s)`);
  }
  console.log(`=======================================================================\n`);

  return {
    numRuns,
    matedWithin30sCount,
    matingSuccessRate,
    feelerMatingCount,
    bodyMatingCount,
    feelerPct,
    noMatingCount,
    avgTime,
    matingTimes,
  };
}

if (process.argv[1]?.includes('test_mating_rate')) {
  console.log("Running baseline mating benchmark with current defaults...");
  runMatingBenchmark(100, 30);
}
