/**
 * Population bounds, continuous growth, and hybridization regression suite.
 *
 * Verifies:
 *  1. Factory defaults: engine.minCreatures === 4, engine.maxCreatures === 10.
 *  2. Zero organism deaths (killSpecies, dyingStrains, or [GHOST] sweeps) occur before
 *     livingOrganismCount >= 4 (engine.hasReachedMinCreatures === true), and once >= 4
 *     is reached, livingOrganismCount NEVER drops below 4.
 *  3. Continuous post-flush growth: tracks individual mature organisms (including founders)
 *     across windows 1000–2000, 2000–3000, and 3000–4000 and asserts that mature organisms
 *     continue adding new stem segments (> 0 new segments in each window after frame 1000).
 *  4. Hybridization artifacts: asserts that mating events spawn hybridization artifacts
 *     (engine.hybridCount > 2, engine.totalHybridCount > 0) with visible scale (>= 0.8).
 */
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';
import { DEFAULTS } from '../src/hooks/SimulationDefaults';

console.log("===============================================================");
console.log("  POPULATION BOUNDS, CONTINUOUS GROWTH & HYBRID ARTIFACTS TEST ");
console.log("===============================================================");

// 1. Assert Factory Defaults
console.log("\n[1] Verifying Factory Defaults...");
const defaultEngine = new SimulationEngine({} as any, 1920, 1080);
const defaultsOk =
  defaultEngine.minCreatures === 4 &&
  defaultEngine.maxCreatures === 10 &&
  DEFAULTS.minCreatures === 4 &&
  DEFAULTS.maxCreatures === 10;

console.log(
  `  ${defaultsOk ? "✅" : "❌"} Factory defaults: ` +
    `engine.minCreatures=${defaultEngine.minCreatures} (expected 4), ` +
    `engine.maxCreatures=${defaultEngine.maxCreatures} (expected 10), ` +
    `DEFAULTS.minCreatures=${DEFAULTS.minCreatures}, ` +
    `DEFAULTS.maxCreatures=${DEFAULTS.maxCreatures}`,
);

if (!defaultsOk) {
  console.error("❌ Factory defaults mismatch!");
  process.exit(1);
}

// 2. Comprehensive 4000-frame simulation test for Floor, Continuous Growth, and Hybrid Artifacts
console.log("\n[2] Running 4000-frame Comprehensive Ecology Test (min=4, max=10)...");
const engine = new SimulationEngine({} as any, 1920, 1080);
engine.minCreatures = 4;
engine.maxCreatures = 10;
engine.growthSpeed = 1.0;
engine.timeScale = 1.0;
engine.allowBreeding = true;

let deathsBeforeFloor = 0;
let ghostSweeps = 0;
const logMessages: string[] = [];
engine.onLog = (msg: string) => {
  logMessages.push(msg);
  if (msg.includes("[GHOST] swept")) {
    ghostSweeps++;
  }
};

setupInitialCreatures(engine);

let peak = 0;
let trough = Infinity;
let floorBreached = false;
let breachFrame = -1;

// Segment count tracking for mature strains across post-flush windows
const segCountsAt1000 = new Map<string, number>();
const segCountsAt2000 = new Map<string, number>();
const segCountsAt3000 = new Map<string, number>();
const segCountsAt4000 = new Map<string, number>();

function countStrainSegments(eng: SimulationEngine): Map<string, number> {
  const counts = new Map<string, number>();
  const limit = Math.min(eng.pointCount, eng.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const s = eng.segments[i];
    if (s && !s.dyingStart && !eng.dyingStems.has(i) && s.strainName && !s.isFeeler) {
      counts.set(s.strainName, (counts.get(s.strainName) || 0) + 1);
    }
  }
  return counts;
}

for (let f = 1; f <= 4000; f++) {
  const beforeLiving = engine.getLivingOrganismCount();
  const dyingBefore = engine.dyingStrains?.size || 0;

  engine.update();

  const n = engine.getLivingOrganismCount();
  const dyingAfter = engine.dyingStrains?.size || 0;

  if (!engine.hasReachedMinCreatures) {
    if (dyingAfter > dyingBefore) {
      deathsBeforeFloor++;
      console.error(`❌ Premature death before reaching minCreatures at frame ${f}!`);
    }
  }

  if (n > peak) peak = n;
  if (engine.hasReachedMinCreatures) {
    if (n < trough) trough = n;
    if (n < 4) {
      floorBreached = true;
      if (breachFrame < 0) breachFrame = f;
    }
  }

  if (f % 500 === 0) {
    console.log(`  Frame ${f}/4000: living=${n}, points=${engine.pointCount}, hybrids=${engine.hybridCount}`);
  }

  if (f === 1000) {
    const counts = countStrainSegments(engine);
    for (const [k, v] of counts) segCountsAt1000.set(k, v);
  } else if (f === 2000) {
    const counts = countStrainSegments(engine);
    for (const [k, v] of counts) segCountsAt2000.set(k, v);
  } else if (f === 3000) {
    const counts = countStrainSegments(engine);
    for (const [k, v] of counts) segCountsAt3000.set(k, v);
  } else if (f === 4000) {
    const counts = countStrainSegments(engine);
    for (const [k, v] of counts) segCountsAt4000.set(k, v);
  }
}

// Check Continuous Post-Flush Growth:
// Identify strains alive at 1000 that remained alive through 2000, 3000, and 4000.
let continuousGrowthOk = false;
let verifiedStrainsCount = 0;
console.log("\n[3] Verifying Continuous Post-Flush Growth for Mature Strains...");
for (const [strain, count1000] of segCountsAt1000) {
  const count2000 = segCountsAt2000.get(strain);
  const count3000 = segCountsAt3000.get(strain);
  const count4000 = segCountsAt4000.get(strain);
  if (count2000 !== undefined && count3000 !== undefined && count4000 !== undefined) {
    const growth1to2 = count2000 - count1000;
    const growth2to3 = count3000 - count2000;
    const growth3to4 = count4000 - count3000;
    console.log(
      `  Strain '${strain}': segs@1000=${count1000}, segs@2000=${count2000} (+${growth1to2}), ` +
        `segs@3000=${count3000} (+${growth2to3}), segs@4000=${count4000} (+${growth3to4})`,
    );
    if (growth1to2 > 0 && growth2to3 > 0 && growth3to4 > 0) {
      continuousGrowthOk = true;
      verifiedStrainsCount++;
    }
  }
}

// 4. Check Hybridization Artifacts
console.log("\n[4] Verifying Hybridization Artifacts...");
const totalHybrids = engine.hybridCount;
const hybridSegmentsCount = engine.hybridSegments.filter((s) => !!s && !s.dyingStart).length;
let minHybridScale = Infinity;
for (let i = 0; i < Math.min(engine.hybridCount, engine.hybridSegments.length); i++) {
  const seg = engine.hybridSegments[i];
  if (seg) {
    const scale = seg.thickness || 0;
    if (scale < minHybridScale) minHybridScale = scale;
  }
}
const hybridsOk = totalHybrids > 2 && hybridSegmentsCount > 0 && minHybridScale >= 0.8;
console.log(
  `  ${hybridsOk ? "✅" : "❌"} Hybrid Artifacts: totalSpawns=${totalHybrids}, active=${hybridSegmentsCount}, minScale=${minHybridScale.toFixed(2)} (>= 0.8)`,
);

// 5. Check Floor and Cap
const floorOk = !floorBreached && deathsBeforeFloor === 0 && ghostSweeps === 0;
const capOk = peak <= 10;
console.log("\n[5] Summary Population Metrics:");
console.log(`  Peak living organisms: ${peak} (cap=10) -> ${capOk ? "✅ OK" : "❌ FAIL"}`);
console.log(`  Trough living organisms (after reached): ${trough} (floor=4) -> ${floorOk ? "✅ OK" : "❌ FAIL"}`);
console.log(`  Premature deaths before floor: ${deathsBeforeFloor} -> ${deathsBeforeFloor === 0 ? "✅ OK" : "❌ FAIL"}`);
console.log(`  Ghost strain sweeps: ${ghostSweeps} -> ${ghostSweeps === 0 ? "✅ OK" : "❌ FAIL"}`);
console.log(`  Continuous growth verified strains: ${verifiedStrainsCount} -> ${continuousGrowthOk ? "✅ OK" : "❌ FAIL"}`);

// Run other configs as quick regression
interface Config {
  min: number;
  max: number;
  frames: number;
}
const QUICK_CONFIGS: Config[] = [
  { min: 3, max: 9, frames: 500 },
  { min: 4, max: 12, frames: 500 },
];
let quickConfigsOk = true;
for (const cfg of QUICK_CONFIGS) {
  const eng = new SimulationEngine({} as any, 1920, 1080);
  eng.minCreatures = cfg.min;
  eng.maxCreatures = cfg.max;
  eng.growthSpeed = 1.0;
  eng.timeScale = 1.0;
  eng.allowBreeding = true;
  eng.onLog = () => {};
  setupInitialCreatures(eng);
  let reached = false;
  let quickBreach = false;
  for (let f = 1; f <= cfg.frames; f++) {
    eng.update();
    const c = eng.getLivingOrganismCount();
    if (c >= cfg.min) reached = true;
    if (reached && c < cfg.min) quickBreach = true;
  }
  if (quickBreach) quickConfigsOk = false;
}

const allPassed = defaultsOk && floorOk && capOk && continuousGrowthOk && hybridsOk && quickConfigsOk;

console.log("\n===============================================================");
if (allPassed) {
  console.log("✅ ALL POPULATION, GROWTH & HYBRID CHECKS PASSED!");
  process.exit(0);
} else {
  console.error("❌ REGRESSION CHECKS FAILED!");
  process.exit(1);
}
