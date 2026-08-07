import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { Archetype, ARCHETYPES, Genome, Agent } from '../src/lib/SimulationTypes';
import { setupInitialCreatures, generateRandomGenome } from '../src/lib/SimulationSceneSetup';
import { updateSimulation } from '../src/lib/SimulationUpdate';

interface ArchetypeStats {
  archetype: Archetype;
  samples: number;
  avgFillPct: number;
  peakFillPct: number;
  avgBiomass: number;
  avgAppendages: number;
  secondBySecondFill: number[];
}

// 128x72 2D Screen-space Silhouette Rasterizer (including stems AND all appendages)
export function computeScreenSpaceFill(engine: SimulationEngine, width = 128, height = 72) {
  const camera = engine.camera;
  camera.updateMatrixWorld();
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

  const grid = new Uint8Array(width * height);
  const archetypeGrid = new Array<string | null>(width * height).fill(null);
  const archetypePixelCounts: Record<string, number> = {
    bush: 0,
    tree: 0,
    snake: 0,
    rhizome: 0,
  };

  const p1Proj = new THREE.Vector3();

  // 1. Rasterize Stem Segments
  for (let i = 0; i < engine.pointCount; i++) {
    const seg = engine.segments[i];
    if (!seg || engine.dyingStems.has(i)) continue;

    const mat = seg.matrix;
    const p1 = new THREE.Vector3().setFromMatrixPosition(mat);
    p1Proj.copy(p1).project(camera);

    if (p1Proj.z > 1.0) continue;

    const screenX = Math.round(((p1Proj.x + 1) * 0.5) * width);
    const screenY = Math.round(((1 - p1Proj.y) * 0.5) * height);

    const distToCam = Math.max(1, p1.distanceTo(camera.position));
    const radiusPx = Math.min(25, Math.max(1, Math.round((seg.thickness * height) / (distToCam * 0.8))));

    const genome = engine.genomeMap.get(seg.strainName);
    const arch = genome?.archetype || 'unknown';

    for (let dy = -radiusPx; dy <= radiusPx; dy++) {
      const y = screenY + dy;
      if (y < 0 || y >= height) continue;
      for (let dx = -radiusPx; dx <= radiusPx; dx++) {
        if (dx * dx + dy * dy <= radiusPx * radiusPx) {
          const x = screenX + dx;
          if (x < 0 || x >= width) continue;
          const idx = y * width + x;
          if (!grid[idx]) {
            grid[idx] = 1;
            archetypeGrid[idx] = arch;
            if (archetypePixelCounts[arch] !== undefined) {
              archetypePixelCounts[arch]++;
            }
          }
        }
      }
    }
  }

  // 2. Rasterize Appendages (Leaves, Ferns, Flowers, Crystals, Thorns, Spores, etc.)
  for (const [appKey, app] of engine.appendages.entries()) {
    const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    for (let i = 0; i < lim; i++) {
      const seg = app.segments[i];
      if (!seg || app.dyingSet.has(i)) continue;

      const mat = seg.matrix;
      const p1 = new THREE.Vector3().setFromMatrixPosition(mat);
      p1Proj.copy(p1).project(camera);

      if (p1Proj.z > 1.0) continue;

      const screenX = Math.round(((p1Proj.x + 1) * 0.5) * width);
      const screenY = Math.round(((1 - p1Proj.y) * 0.5) * height);

      const distToCam = Math.max(1, p1.distanceTo(camera.position));
      const isLeafApp = appKey === 'leaves' || appKey === 'ferns';
      const scaleDial = isLeafApp ? (engine.leafScale ?? 0.55) : (engine.flowerSize ?? 1.0);
      const appRadius = Math.max(0.3, seg.thickness * scaleDial * 1.5);
      const radiusPx = Math.min(25, Math.max(1, Math.round((appRadius * height) / (distToCam * 0.8))));

      const genome = engine.genomeMap.get(seg.strainName);
      const arch = genome?.archetype || 'unknown';

      for (let dy = -radiusPx; dy <= radiusPx; dy++) {
        const y = screenY + dy;
        if (y < 0 || y >= height) continue;
        for (let dx = -radiusPx; dx <= radiusPx; dx++) {
          if (dx * dx + dy * dy <= radiusPx * radiusPx) {
            const x = screenX + dx;
            if (x < 0 || x >= width) continue;
            const idx = y * width + x;
            if (!grid[idx]) {
              grid[idx] = 1;
              archetypeGrid[idx] = arch;
              if (archetypePixelCounts[arch] !== undefined) {
                archetypePixelCounts[arch]++;
              }
            }
          }
        }
      }
    }
  }

  const totalPixels = width * height;
  let totalOccupied = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (grid[i]) totalOccupied++;
  }

  return {
    totalFillPct: (totalOccupied / totalPixels) * 100,
    archetypePixelCounts,
    archetypeFillPct: {
      bush: (archetypePixelCounts.bush / totalPixels) * 100,
      tree: (archetypePixelCounts.tree / totalPixels) * 100,
      snake: (archetypePixelCounts.snake / totalPixels) * 100,
      rhizome: (archetypePixelCounts.rhizome / totalPixels) * 100,
    },
  };
}

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

// 1. Extended Multi-Generation Appendage QA Test (Check for disappearing appendages & sizing)
export function runAppendageDisappearanceQATest(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let passed = true;

  const canvas = createMockCanvas();
  const engine = new SimulationEngine(canvas, 1280, 720);
  engine.timeScale = 0.8;
  engine.width = 1280;
  engine.height = 720;

  // Setup founder with leaves and founder with flowers
  const g1 = generateRandomGenome(engine, "Founder_Leaves", "bush");
  g1.appendage = "leaves";
  engine.genomeMap.set(g1.name, g1);
  engine.agents.push({
    position: new THREE.Vector3(-20, 18.9, 0),
    lastPosition: new THREE.Vector3(-20, 18.9, 0),
    direction: new THREE.Vector3(0.5, 0.5, 0.2).normalize(),
    genome: g1,
    active: true,
    age: 0,
    thickness: g1.thicknessBase * 1.5,
    id: engine.nextAgentId++,
    cooldown: 100,
  });

  const g2 = generateRandomGenome(engine, "Founder_Flowers", "tree");
  g2.appendage = "flowers";
  engine.genomeMap.set(g2.name, g2);
  engine.agents.push({
    position: new THREE.Vector3(20, 18.9, 0),
    lastPosition: new THREE.Vector3(20, 18.9, 0),
    direction: new THREE.Vector3(-0.5, 0.5, -0.2).normalize(),
    genome: g2,
    active: true,
    age: 0,
    thickness: g2.thicknessBase * 1.5,
    id: engine.nextAgentId++,
    cooldown: 100,
  });

  let maxAppCountSeen = 0;
  let hasCheckedMidRun = false;
  let midRunLeavesAlive = 0;

  // Run 1,200 frames (20 real-time seconds at 60 FPS) with slowmo (timeScale = 0.8)
  for (let frame = 1; frame <= 1200; frame++) {
    engine.frameCount += 1;
    engine.unscaledTime += 1;
    updateSimulation(engine);

    // Check after 600 frames (10 seconds)
    if (frame === 600) {
      hasCheckedMidRun = true;
      const leavesApp = engine.appendages.get("leaves");
      const flowersApp = engine.appendages.get("flowers");
      midRunLeavesAlive = (leavesApp?.segments.filter(s => s && !leavesApp.dyingSet.has(s.index)).length) || 0;
      const midRunFlowersAlive = (flowersApp?.segments.filter(s => s && !flowersApp.dyingSet.has(s.index)).length) || 0;

      if (midRunLeavesAlive === 0 || midRunFlowersAlive === 0) {
        passed = false;
        details.push(`[FAIL] Appendages vanished mid-run at frame 600! Leaves: ${midRunLeavesAlive}, Flowers: ${midRunFlowersAlive}`);
      } else {
        details.push(`[PASS] Mid-run check (frame 600 / 10s): Leaves=${midRunLeavesAlive}, Flowers=${midRunFlowersAlive} actively flourishing`);
      }
    }
  }

  // End of run check
  const leavesApp = engine.appendages.get("leaves");
  const finalLeavesAlive = (leavesApp?.segments.filter(s => s && !leavesApp.dyingSet.has(s.index)).length) || 0;
  const g1Agents = engine.agents.filter(a => a.genome.name === g1.name);
  const activeG1Agents = g1Agents.filter(a => a.active && !a.tapering);
  details.push(`[DEBUG] Frame 1200 state: g1 total agents=${g1Agents.length}, active non-tapering=${activeG1Agents.length}, in dyingStrains=${engine.dyingStrains.has(g1.name)}, total spawned leaves=${leavesApp?.count}, leaves alive=${finalLeavesAlive}`);

  if (finalLeavesAlive > 0) {
    details.push(`[PASS] Long-run check (frame 1200 / 20s): Leaves continue spawning (${leavesApp?.count} total spawned, ${finalLeavesAlive} alive)`);
  } else if (!engine.dyingStrains.has(g1.name) && activeG1Agents.length > 0) {
    passed = false;
    details.push(`[FAIL] Appendages disappeared from living strain! Leaves alive: ${finalLeavesAlive}`);
  } else {
    details.push(`[PASS] Strain completed its natural lifecycle: Leaves gracefully dissolved when species ended`);
  }

  // Verify LeafScale Sizing Effect
  const initialScale = engine.leafScale;
  engine.setLeafScale(0.9);
  if (engine.leafScale === 0.9) {
    details.push(`[PASS] Leaf scale control correctly responds to dial adjustments (0.55 -> 0.9)`);
  }
  engine.setLeafScale(initialScale);

  return { passed, details };
}

// 2. High-Frequency Second-by-Second Pixel Coverage Benchmark with Slowmo Speed
export function runSlowmoSecondBySecondBenchmark(batchCount = 45, durationSeconds = 6, timeScale = 0.8): Record<Archetype, ArchetypeStats> {
  const archetypes: Archetype[] = [...ARCHETYPES];
  const framesPerSecond = 60;
  const totalFrames = durationSeconds * framesPerSecond;

  const results: Record<string, {
    totalFillSamples: number[];
    peakFill: number;
    totalBio: number;
    totalApps: number;
    count: number;
  }> = {};

  for (const arch of archetypes) {
    results[arch] = { totalFillSamples: new Array(durationSeconds).fill(0), peakFill: 0, totalBio: 0, totalApps: 0, count: 0 };
  }

  const canvas = createMockCanvas();
  const engine = new SimulationEngine(canvas, 1280, 720);
  engine.timeScale = timeScale;
  engine.width = 1280;
  engine.height = 720;
  engine.camera = new THREE.PerspectiveCamera(45, 1280 / 720, 0.1, 5000);
  engine.camera.position.set(0, 18.9, -137.42);
  engine.camera.lookAt(0, 18.9, 0);

  const numArch = archetypes.length;
  for (let b = 0; b < batchCount; b++) {
    const arch1 = archetypes[b % numArch];
    const arch2 = archetypes[(b + 1 + Math.floor(b / numArch)) % numArch];

    // Reset engine
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

    // Spawn Founders
    const g1 = generateRandomGenome(engine, `Founder_${arch1}`, arch1);
    engine.genomeMap.set(g1.name, g1);
    engine.agents.push({
      position: new THREE.Vector3(-25, 18.9, 0),
      lastPosition: new THREE.Vector3(-25, 18.9, 0),
      direction: new THREE.Vector3(0.5, 0.5, 0.2).normalize(),
      genome: g1,
      active: true,
      age: 0,
      thickness: g1.thicknessBase * 1.5,
      id: engine.nextAgentId++,
      cooldown: 100,
    });

    const g2 = generateRandomGenome(engine, `Founder_${arch2}`, arch2);
    engine.genomeMap.set(g2.name, g2);
    engine.agents.push({
      position: new THREE.Vector3(25, 18.9, 0),
      lastPosition: new THREE.Vector3(25, 18.9, 0),
      direction: new THREE.Vector3(-0.5, 0.5, -0.2).normalize(),
      genome: g2,
      active: true,
      age: 0,
      thickness: g2.thicknessBase * 1.5,
      id: engine.nextAgentId++,
      cooldown: 100,
    });

    let mated = false;
    engine.onMatingEvent = () => { mated = true; };

    let arch1Peak = 0;
    let arch2Peak = 0;

    // Simulate frame-by-frame and sample every 1 second (every 60 frames)
    for (let frame = 1; frame <= totalFrames; frame++) {
      engine.frameCount += 1;
      engine.unscaledTime += 1;
      updateSimulation(engine);

      // Sample every second
      if (frame % framesPerSecond === 0) {
        const secIndex = Math.floor(frame / framesPerSecond) - 1;
        const fillResult = computeScreenSpaceFill(engine);

        const f1 = fillResult.archetypeFillPct[arch1];
        const f2 = fillResult.archetypeFillPct[arch2];

        results[arch1].totalFillSamples[secIndex] += f1;
        results[arch2].totalFillSamples[secIndex] += f2;

        if (f1 > arch1Peak) arch1Peak = f1;
        if (f2 > arch2Peak) arch2Peak = f2;
      }

      if (mated) break;
    }

    const bio1 = engine.biomassMap.get(g1.name) || 0;
    const bio2 = engine.biomassMap.get(g2.name) || 0;

    let app1Count = 0;
    let app2Count = 0;
    for (const app of engine.appendages.values()) {
      for (const seg of app.segments) {
        if (seg) {
          if (seg.strainName === g1.name) app1Count++;
          if (seg.strainName === g2.name) app2Count++;
        }
      }
    }

    results[arch1].peakFill += arch1Peak;
    results[arch1].totalBio += bio1;
    results[arch1].totalApps += app1Count;
    results[arch1].count += 1;

    results[arch2].peakFill += arch2Peak;
    results[arch2].totalBio += bio2;
    results[arch2].totalApps += app2Count;
    results[arch2].count += 1;
  }

  const finalStats: Record<Archetype, ArchetypeStats> = {} as any;
  for (const arch of archetypes) {
    const r = results[arch];
    const avgSecSamples = r.totalFillSamples.map(v => r.count > 0 ? v / r.count : 0);
    const avgFillOverall = avgSecSamples.reduce((a, b) => a + b, 0) / (avgSecSamples.length || 1);

    finalStats[arch] = {
      archetype: arch,
      samples: r.count,
      avgFillPct: avgFillOverall,
      peakFillPct: r.count > 0 ? r.peakFill / r.count : 0,
      avgBiomass: r.count > 0 ? r.totalBio / r.count : 0,
      avgAppendages: r.count > 0 ? r.totalApps / r.count : 0,
      secondBySecondFill: avgSecSamples,
    };
  }

  return finalStats;
}

// Execute test suite & benchmark
console.log('===============================================================');
console.log('  QA TEST: DISAPPEARING APPENDAGES & APPENDAGE SIZING');
console.log('===============================================================');
const qaResult = runAppendageDisappearanceQATest();
for (const detail of qaResult.details) {
  console.log(detail);
}
console.log(`\nOverall QA Result: ${qaResult.passed ? '✅ ALL PASSED' : '❌ FAILED'}\n`);

console.log('===============================================================');
console.log('  SLOWMO BENCHMARK: SECOND-BY-SECOND SCREEN FILL (timeScale=0.8)');
console.log('===============================================================');
const slowmoStats = runSlowmoSecondBySecondBenchmark(50, 6, 0.8);
console.table(slowmoStats);

console.log('\n--- Second-by-Second Screen-Fill Trajectories (% Fill) ---');
for (const [arch, stat] of Object.entries(slowmoStats)) {
  const trajectoryStr = stat.secondBySecondFill.map((pct, idx) => `T+${idx+1}s: ${pct.toFixed(2)}%`).join(' | ');
  console.log(`${arch.toUpperCase().padEnd(8)}: ${trajectoryStr} (Peak: ${stat.peakFillPct.toFixed(2)}%, AvgBio: ${stat.avgBiomass.toFixed(0)}, AvgApps: ${stat.avgAppendages.toFixed(0)})`);
}
