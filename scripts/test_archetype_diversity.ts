/**
 * Headless Archetype Diversity & Growth Balance Verification Suite
 *
 * Verifies:
 * 1. Tree Morphological Diversity (monolith, big_branching, candelabra, spire, umbrella, filigree)
 * 2. Bush Stability & Sizing Variance (bush_compact, bush_medium, bush_giant)
 * 3. Multi-Seed Ecosystem & Multi-Generation Breeding Balance (Anti-Lichen & Anti-Snake)
 */
import * as THREE from "three";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

interface SegmentData {
  strainName: string;
  thickness: number;
  pos: THREE.Vector3;
  timestamp: number;
  agentId: number;
}

function extractSegments(engine: any): Map<string, SegmentData[]> {
  const map = new Map<string, SegmentData[]>();
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (!seg || seg.dyingStart || engine.dyingStems.has(i)) continue;
    const name = seg.strainName || "unknown";
    if (seg.isFeeler) continue;
    let arr = map.get(name);
    if (!arr) {
      arr = [];
      map.set(name, arr);
    }
    const el = seg.matrix.elements;
    arr.push({
      strainName: name,
      thickness: seg.thickness,
      pos: new THREE.Vector3(el[12], el[13], el[14]),
      timestamp: seg.timestamp,
      agentId: seg.agentId ?? 0,
    });
  }
  return map;
}

async function runTreeDiversityTest() {
  console.log("\n=== Test 1: Initial & Grown Tree Morphological Diversity ===");
  Math.random = mulberry32(42);

  const { SimulationEngine } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationEngine.ts")).href);
  const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, "src/hooks/SimulationDefaults.ts")).href);
  const { updateSimulation } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationUpdate.ts")).href);
  const { generateRandomGenome } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationSceneSetup.ts")).href);
  const { assignGenomeMorphology } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationMorphology.ts")).href);

  const engine: any = new SimulationEngine(createMockCanvas(), 1280, 720);
  Object.assign(engine, DEFAULTS, {
    timeScale: 2.0,
    kioskMode: false,
    soundEnabled: false,
    allowBreeding: false,
    showBoundaryBox: false,
    boundarySize: 500,
  });
  engine.agents = [];
  engine.segments = [];
  engine.pointCount = 0;
  engine.time = 0;
  engine.frameCount = 0;

  const modes = ["monolith", "big_branching", "candelabra", "spire", "umbrella", "filigree"] as const;
  const spawnedStrains: { name: string; mode: string; rootPos: THREE.Vector3; initialThickness: number }[] = [];

  let idx = 0;
  for (const mode of modes) {
    for (let rep = 0; rep < 4; rep++) {
      const name = `Tree-${mode}-${rep}`;
      const genome = generateRandomGenome(engine, name, "tree");
      assignGenomeMorphology(genome, mode);
      genome.name = name;
      engine.genomeMap.set(name, genome);

      const x = ((idx % 6) - 2.5) * 55;
      const z = (Math.floor(idx / 6) - 1.5) * 55;
      const rootPos = new THREE.Vector3(x, 0, z);

      engine.agents.push({
        id: engine.nextAgentId++,
        position: rootPos.clone(),
        lastPosition: rootPos.clone(),
        direction: new THREE.Vector3(0, 1, 0),
        genome,
        active: true,
        age: 0,
        thickness: genome.thicknessBase * 1.5,
        cooldown: 99999,
      });

      spawnedStrains.push({
        name,
        mode,
        rootPos,
        initialThickness: genome.thicknessBase,
      });
      idx++;
    }
  }

  // Step 500 frames at timeScale 2.0
  for (let frame = 1; frame <= 500; frame++) {
    updateSimulation(engine);
  }

  const segMap = extractSegments(engine);

  // Group metrics by mode
  const modeMetrics = new Map<string, {
    baseRadii: number[];
    meanThicknesses: number[];
    reaches: number[];
    segCounts: number[];
    uniqueBranchesArr: number[];
    segsPerBranchArr: number[];
  }>();

  for (const s of spawnedStrains) {
    const segs = segMap.get(s.name) || [];
    if (segs.length === 0) continue;

    // Measure baseRadius directly from the actual grown trunk segments
    const trunkSegs = segs.slice(0, Math.min(8, segs.length));
    const baseRadius = Math.max(...trunkSegs.map((x) => x.thickness));
    const uniqueBranches = new Set(segs.map((x) => x.agentId)).size;
    const segsPerBranch = segs.length / Math.max(1, uniqueBranches);

    let thickSum = 0;
    let maxReach = 0;

    for (const seg of segs) {
      thickSum += seg.thickness;
      const dist = seg.pos.distanceTo(s.rootPos);
      if (dist > maxReach) maxReach = dist;
    }

    const meanThick = thickSum / segs.length;

    let m = modeMetrics.get(s.mode);
    if (!m) {
      m = { baseRadii: [], meanThicknesses: [], reaches: [], segCounts: [], uniqueBranchesArr: [], segsPerBranchArr: [] };
      modeMetrics.set(s.mode, m);
    }
    m.baseRadii.push(baseRadius);
    m.meanThicknesses.push(meanThick);
    m.reaches.push(maxReach);
    m.segCounts.push(segs.length);
    m.uniqueBranchesArr.push(uniqueBranches);
    m.segsPerBranchArr.push(segsPerBranch);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  console.log("\n| Mode | Base Radius | Mean Thickness | Unique Branches | Segs / Branch | Reach |");
  console.log("| :--- | :---: | :---: | :---: | :---: | :---: |");
  for (const mode of modes) {
    const m = modeMetrics.get(mode);
    const avgBase = avg(m?.baseRadii || []);
    const avgThick = avg(m?.meanThicknesses || []);
    const avgBranches = avg(m?.uniqueBranchesArr || []);
    const avgSpb = avg(m?.segsPerBranchArr || []);
    const avgR = avg(m?.reaches || []);
    console.log(`| ${mode.padEnd(14)} | ${avgBase.toFixed(2).padStart(11)} | ${avgThick.toFixed(2).padStart(14)} | ${avgBranches.toFixed(1).padStart(15)} | ${avgSpb.toFixed(1).padStart(13)} | ${avgR.toFixed(1).padStart(5)} |`);
  }

  const monolithBaseRadius = avg(modeMetrics.get("monolith")?.baseRadii || []);
  const bigBranchBaseRadius = avg(modeMetrics.get("big_branching")?.baseRadii || []);
  const filigreeBaseRadius = avg(modeMetrics.get("filigree")?.baseRadii || []);

  const macroBaseAvg = (monolithBaseRadius + bigBranchBaseRadius) / 2;
  const baseRadiusRatio = macroBaseAvg / Math.max(0.01, filigreeBaseRadius);

  const monolithMeanThick = avg(modeMetrics.get("monolith")?.meanThicknesses || []);
  const bigBranchMeanThick = avg(modeMetrics.get("big_branching")?.meanThicknesses || []);
  const candelabraMeanThick = avg(modeMetrics.get("candelabra")?.meanThicknesses || []);
  const filigreeMeanThick = avg(modeMetrics.get("filigree")?.meanThicknesses || []);

  const macroMeanThick = (monolithMeanThick + bigBranchMeanThick + candelabraMeanThick) / 3;
  const meanThicknessRatio = macroMeanThick / Math.max(0.01, filigreeMeanThick);

  const filigreeBranches = avg(modeMetrics.get("filigree")?.uniqueBranchesArr || []);
  const monolithBranches = avg(modeMetrics.get("monolith")?.uniqueBranchesArr || []);
  const candelabraBranches = avg(modeMetrics.get("candelabra")?.uniqueBranchesArr || []);
  const monolithCandelabraBranches = (monolithBranches + candelabraBranches) / 2;
  const branchCountRatio = filigreeBranches / Math.max(1, monolithCandelabraBranches);

  const allReaches: number[] = [];
  modeMetrics.forEach((m) => allReaches.push(...m.reaches));
  const minReach = Math.min(...allReaches);
  const maxReach = Math.max(...allReaches);
  const reachRatio = maxReach / Math.max(0.1, minReach);

  console.log(`\n- Base Radius Ratio (Macro Avg ${macroBaseAvg.toFixed(2)} vs Filigree ${filigreeBaseRadius.toFixed(2)}): ${baseRadiusRatio.toFixed(2)}x (target >= 2.2x)`);
  console.log(`- Mean Thickness Ratio (Macro Avg ${macroMeanThick.toFixed(2)} vs Filigree ${filigreeMeanThick.toFixed(2)}): ${meanThicknessRatio.toFixed(2)}x (target >= 2.2x)`);
  console.log(`- Branch Count Ratio (Filigree ${filigreeBranches.toFixed(1)} vs Monolith/Candelabra ${monolithCandelabraBranches.toFixed(1)}): ${branchCountRatio.toFixed(2)}x (target >= 2.0x)`);
  console.log(`- Reach Min-to-Max Ratio (Max ${maxReach.toFixed(1)} vs Min ${minReach.toFixed(1)}): ${reachRatio.toFixed(2)}x (target >= 2.2x)`);

  if (baseRadiusRatio < 2.2) throw new Error(`Test 1 Failed: Trunk base radius ratio ${baseRadiusRatio.toFixed(2)} < 2.2x`);
  if (meanThicknessRatio < 2.2) throw new Error(`Test 1 Failed: Mean thickness ratio ${meanThicknessRatio.toFixed(2)} < 2.2x`);
  if (branchCountRatio < 2.0) throw new Error(`Test 1 Failed: Branch count ratio ${branchCountRatio.toFixed(2)} < 2.0x`);
  if (reachRatio < 2.2) throw new Error(`Test 1 Failed: Spatial reach ratio ${reachRatio.toFixed(2)} < 2.2x`);

  console.log("✓ Test 1 Passed: Tree morphological diversity confirmed.");
  return true;
}

async function runBushVarianceTest() {
  console.log("\n=== Test 2: Bush Stability + Bigger Sizing Variance ===");
  Math.random = mulberry32(1337);

  const { SimulationEngine } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationEngine.ts")).href);
  const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, "src/hooks/SimulationDefaults.ts")).href);
  const { updateSimulation } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationUpdate.ts")).href);
  const { generateRandomGenome } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationSceneSetup.ts")).href);
  const { assignGenomeMorphology } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationMorphology.ts")).href);

  const engine: any = new SimulationEngine(createMockCanvas(), 1280, 720);
  Object.assign(engine, DEFAULTS, {
    timeScale: 1.0,
    kioskMode: false,
    soundEnabled: false,
    allowBreeding: false,
    showBoundaryBox: false,
    boundarySize: 500,
  });
  engine.agents = [];
  engine.segments = [];
  engine.pointCount = 0;
  engine.time = 0;
  engine.frameCount = 0;

  const bushModes = ["bush_compact", "bush_medium", "bush_giant"] as const;
  const spawnedBushes: { name: string; mode: string; rootPos: THREE.Vector3 }[] = [];

  let idx = 0;
  for (const mode of bushModes) {
    for (let rep = 0; rep < 6; rep++) {
      const name = `Bush-${mode}-${rep}`;
      const genome = generateRandomGenome(engine, name, "bush");
      assignGenomeMorphology(genome, mode);
      genome.name = name;
      engine.genomeMap.set(name, genome);

      const x = ((idx % 6) - 2.5) * 45;
      const z = (Math.floor(idx / 6) - 1.0) * 45;
      const rootPos = new THREE.Vector3(x, 0, z);

      engine.agents.push({
        id: engine.nextAgentId++,
        position: rootPos.clone(),
        lastPosition: rootPos.clone(),
        direction: new THREE.Vector3(0, 1, 0),
        genome,
        active: true,
        age: 0,
        thickness: genome.thicknessBase * 1.05,
        cooldown: 99999,
      });

      spawnedBushes.push({ name, mode, rootPos });
      idx++;
    }
  }

  // Step 360 frames
  for (let frame = 1; frame <= 360; frame++) {
    updateSimulation(engine);
  }

  const segMap = extractSegments(engine);
  const reaches: number[] = [];
  let multiCaneCount = 0;
  let singleStrandSnakes = 0;

  for (const b of spawnedBushes) {
    const segs = segMap.get(b.name) || [];
    if (segs.length === 0) continue;

    let maxDist = 0;
    for (const seg of segs) {
      const d = seg.pos.distanceTo(b.rootPos);
      if (d > maxDist) maxDist = d;
    }
    reaches.push(maxDist);

    // Tip count: count active agents for this strain plus unique tip segments
    const activeTips = engine.agents.filter((a: any) => a.active && a.genome.name === b.name).length;
    // In addition, count how many distinct branch paths exist (number of segments vs depth)
    const isSnake = segs.length > 30 && activeTips <= 1;
    if (isSnake) singleStrandSnakes++;
    if (activeTips >= 6 || segs.length >= 40) multiCaneCount++;
  }

  const minReach = Math.min(...reaches);
  const maxReach = Math.max(...reaches);
  const reachRatio = maxReach / Math.max(0.1, minReach);

  const meanReach = reaches.reduce((a, b) => a + b, 0) / reaches.length;
  const variance = reaches.reduce((a, b) => a + Math.pow(b - meanReach, 2), 0) / reaches.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / meanReach;

  console.log(`- Bush Reach: Min=${minReach.toFixed(1)}, Max=${maxReach.toFixed(1)}, Ratio=${reachRatio.toFixed(2)}x (target >= 2.5x)`);
  console.log(`- Bush Reach CV: ${cv.toFixed(3)} (target >= 0.30)`);
  console.log(`- Multi-Cane Bushes: ${multiCaneCount}/${spawnedBushes.length}, Single-Strand Snakes: ${singleStrandSnakes}`);

  if (reachRatio < 2.5) throw new Error(`Test 2 Failed: Bush reach ratio ${reachRatio.toFixed(2)} < 2.5x`);
  if (cv < 0.30) throw new Error(`Test 2 Failed: Bush reach CV ${cv.toFixed(3)} < 0.30`);
  if (singleStrandSnakes > 0) throw new Error(`Test 2 Failed: Detected ${singleStrandSnakes} single-strand bush snakes`);

  console.log("✓ Test 2 Passed: Bush stability and sizing variance confirmed.");
  return true;
}

async function runEcosystemBreedingTest() {
  console.log("\n=== Test 3: Multi-Seed Ecosystem & Multi-Generation Breeding Balance ===");

  const { SimulationEngine } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationEngine.ts")).href);
  const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, "src/hooks/SimulationDefaults.ts")).href);
  const { updateSimulation } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationUpdate.ts")).href);
  const { isOverSizeBudget } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationPartnerSearch.ts")).href);

  const seeds = [101, 202, 303];
  const simSeconds = 45;
  const totalFrames = Math.round(simSeconds * 60); // 2700 frames

  for (const seed of seeds) {
    Math.random = mulberry32(seed);
    const engine: any = new SimulationEngine(createMockCanvas(), 1280, 720);
    Object.assign(engine, DEFAULTS, {
      timeScale: 1.5,
      kioskMode: false,
      soundEnabled: false,
      minCreatures: 4,
      maxCreatures: 7,
      allowBreeding: true,
    });
    engine.agents = [];
    engine.segments = [];
    engine.pointCount = 0;
    engine.biomassMap.clear();
    engine.genomeMap.clear();
    engine.speciesLifecycleMap.clear();
    engine.dyingStems.clear();
    engine.dyingStrains.clear();
    engine.time = 0;
    engine.frameCount = 0;
    engine.initAgents();

    const bornMorphModes = new Set<string>();
    let birthsCount = 0;

    engine.onLog = (msg: string) => {
      const m = msg.match(/💖 Offspring (.+?) \[[A-Z]+\]/);
      if (m) {
        birthsCount++;
      }
    };

    const sampleArchBiomass: Record<string, number> = { tree: 0, bush: 0, rhizome: 0, snake: 0 };
    let sampleCount = 0;

    // Run 2700 frames
    for (let f = 1; f <= totalFrames; f++) {
      updateSimulation(engine);
      for (const a of engine.agents) {
        if (a.genome?.morphMode) bornMorphModes.add(a.genome.morphMode);
      }
      if (f % 100 === 0) {
        sampleCount++;
        engine.biomassMap.forEach((bm: number, name: string) => {
          const g = engine.genomeMap.get(name);
          const arch = g?.archetype || "bush";
          sampleArchBiomass[arch] = (sampleArchBiomass[arch] || 0) + bm;
        });
      }
    }

    // Collect all living & born morph modes
    const allLivingStrains = engine.getLivingOrganisms() as Set<string>;
    allLivingStrains.forEach((n) => {
      const g = engine.genomeMap.get(n);
      if (g?.morphMode) bornMorphModes.add(g.morphMode);
    });

    let totalSampleBiomass = Object.values(sampleArchBiomass).reduce((a, b) => a + b, 0);
    const avgArchBiomass: Record<string, number> = {
      tree: Math.round(sampleArchBiomass.tree / (sampleCount || 1)),
      bush: Math.round(sampleArchBiomass.bush / (sampleCount || 1)),
      rhizome: Math.round(sampleArchBiomass.rhizome / (sampleCount || 1)),
    };
    const avgRhizomeShare = totalSampleBiomass > 0 ? sampleArchBiomass.rhizome / totalSampleBiomass : 0;
    const avgMaxArchShare = totalSampleBiomass > 0 ? Math.max(...Object.values(sampleArchBiomass)) / totalSampleBiomass : 0;

    console.log(`[Seed ${seed} Time-Averaged] Tree: ${avgArchBiomass.tree}, Bush: ${avgArchBiomass.bush}, Rhizome: ${avgArchBiomass.rhizome}`);
    console.log(`[Seed ${seed} Time-Averaged] Rhizome Share: ${(avgRhizomeShare * 100).toFixed(1)}%, Max Arch Share: ${(avgMaxArchShare * 100).toFixed(1)}%`);

    // Check biomass distribution across archetypes
    let totalBiomass = 0;
    const archBiomass: Record<string, number> = { tree: 0, bush: 0, rhizome: 0, snake: 0 };

    engine.biomassMap.forEach((bm: number, name: string) => {
      totalBiomass += bm;
      const g = engine.genomeMap.get(name);
      const arch = g?.archetype || "bush";
      archBiomass[arch] = (archBiomass[arch] || 0) + bm;
    });

    const rhizomeShare = totalBiomass > 0 ? (archBiomass["rhizome"] || 0) / totalBiomass : 0;
    const maxArchShare = totalBiomass > 0 ? Math.max(...Object.values(archBiomass)) / totalBiomass : 0;

    // Check snake-like strands among living strains
    const segMap = extractSegments(engine);
    let snakeCount = 0;
    let checkedCount = 0;

    for (const name of allLivingStrains) {
      const segs = segMap.get(name) || [];
      if (segs.length > 45) {
        checkedCount++;
        const uniqueBranches = new Set(segs.map((x) => x.agentId)).size;
        const g = engine.genomeMap.get(name);
        const isSnake = uniqueBranches <= 2 && segs.length > 45;
        console.log(`    Strain ${name}: arch=${g?.archetype}, morph=${g?.morphMode}, segs=${segs.length}, uniqueBranches=${uniqueBranches}, isSnake=${isSnake}`);
        if (isSnake) {
          snakeCount++;
        }
      }
    }

    const snakeFraction = checkedCount > 0 ? snakeCount / checkedCount : 0;

    const effectiveRhizomeShare = avgRhizomeShare;
    const effectiveMaxArchShare = avgMaxArchShare;

    let lichenBiomass = 0;
    engine.biomassMap.forEach((bm: number, name: string) => {
      const g = engine.genomeMap.get(name);
      if (g?.morphMode === "rhizome_lace") {
        lichenBiomass += bm;
      }
    });
    const lichenShare = totalBiomass > 0 ? lichenBiomass / totalBiomass : 0;

    console.log(`[Seed ${seed}] Births: ${birthsCount}, Unique MorphModes: ${bornMorphModes.size} (${Array.from(bornMorphModes).join(", ")})`);
    console.log(`[Seed ${seed}] Snapshot Biomass: Tree=${archBiomass.tree}, Bush=${archBiomass.bush}, Rhizome=${archBiomass.rhizome}`);
    console.log(`[Seed ${seed}] Ecosystem Biomass Share: Rhizome=${(effectiveRhizomeShare * 100).toFixed(1)}% (target < 75%), Max Arch=${(effectiveMaxArchShare * 100).toFixed(1)}% (target < 80%)`);
    console.log(`[Seed ${seed}] Lichen Share: ${(lichenShare * 100).toFixed(1)}% (target < 25%), Snake Strands: ${snakeCount}/${checkedCount} (${(snakeFraction * 100).toFixed(1)}%, target < 20%)`);

    if (bornMorphModes.size < 3) {
      throw new Error(`Test 3 Failed on Seed ${seed}: Only ${bornMorphModes.size} distinct morphModes observed (expected >= 3)`);
    }
    if (effectiveRhizomeShare >= 0.75) {
      throw new Error(`Test 3 Failed on Seed ${seed}: Rhizome biomass share ${(effectiveRhizomeShare * 100).toFixed(1)}% >= 75%`);
    }
    if (effectiveMaxArchShare >= 0.80) {
      throw new Error(`Test 3 Failed on Seed ${seed}: Archetype monopoly ${(effectiveMaxArchShare * 100).toFixed(1)}% >= 80%`);
    }
    if (lichenShare >= 0.25) {
      throw new Error(`Test 3 Failed on Seed ${seed}: Lichen share ${(lichenShare * 100).toFixed(1)}% >= 25%`);
    }
    if (snakeFraction >= 0.20) {
      throw new Error(`Test 3 Failed on Seed ${seed}: Snake fraction ${(snakeFraction * 100).toFixed(1)}% >= 20%`);
    }
  }

  console.log("✓ Test 3 Passed: Multi-seed ecosystem diversity & breeding balance confirmed.");
  return true;
}

async function main() {
  console.log("Starting LifeSim Archetype Diversity & Growth Balance Suite...");
  const t0 = performance.now();

  try {
    await runTreeDiversityTest();
    await runBushVarianceTest();
    await runEcosystemBreedingTest();

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    console.log(`\n======================================================`);
    console.log(`ALL DIVERSITY & GROWTH TESTS PASSED in ${elapsed}s!`);
    console.log(`======================================================`);
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ TEST SUITE FAILED: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
