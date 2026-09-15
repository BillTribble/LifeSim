/**
 * Population bounds regression suite.
 *
 * Verifies that `maxCreatures` (organism ceiling) and `minCreatures` (organism floor) are both
 * honoured across a range of dial configurations — not just the single configuration exercised
 * by test_max_creatures_cap.ts.
 *
 * Historical failures this guards against:
 *  1. Feeler sacrifice was accepted as payment for a birth when at the cap. A feeler is a
 *     temporary sensory extension, not an organism, so terminating one frees zero census slots
 *     and the population grew without bound.
 *  2. The safety-net cull only considered organisms with `hasBred === true`, so a population of
 *     never-bred organisms produced no eligible victim and drifted past the cap.
 *  3. Strain names are drawn from a small fixed pool and the entire organism census is keyed by
 *     name, so colliding names collapsed two organisms into one census entry and corrupted the
 *     accounting.
 */
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

console.log("===============================================================");
console.log("  POPULATION BOUNDS (minCreatures / maxCreatures) TEST SUITE   ");
console.log("===============================================================");

interface Config {
  min: number;
  max: number;
  frames: number;
}

const CONFIGS: Config[] = [
  { min: 3, max: 9, frames: 3000 },
  { min: 9, max: 14, frames: 3000 },
  { min: 2, max: 4, frames: 2500 },
  { min: 5, max: 6, frames: 2500 },
];

function runConfig(cfg: Config) {
  const engine = new SimulationEngine({} as any, 1920, 1080);
  engine.minCreatures = cfg.min;
  engine.maxCreatures = cfg.max;
  engine.maxAgents = 200;
  engine.growthSpeed = 1.0;
  engine.timeScale = 1.0;
  engine.allowBreeding = true;
  engine.maxMatings = 6;
  engine.hybridCooldown = 50;
  engine.proximity = 1500;
  engine.desperation = 10;
  engine.despairAge = 100;
  engine.magnetism = 0.2;
  engine.seekAmount = 1.0;
  (engine as any).feelerProb = 0.8;
  (engine as any).feelerDelay = 1.0;
  engine.postMatingDieoff = false;
  engine.onLog = () => {};

  setupInitialCreatures(engine);

  let peak = 0;
  let trough = Infinity;
  let reached = false;
  let floorBreached = false;
  let breachFrame = -1;
  let duplicateNames = 0;

  for (let f = 1; f <= cfg.frames; f++) {
    engine.update();
    const n = engine.getLivingOrganismCount();
    if (n > peak) peak = n;
    if (n > cfg.max && breachFrame < 0) breachFrame = f;
    if (n >= cfg.min) reached = true;
    if (reached) {
      if (n < trough) trough = n;
      if (n < cfg.min) floorBreached = true;
    }
  }

  // Every living organism must own a globally unique strain name, otherwise the
  // name-keyed census silently merges distinct organisms.
  const seen = new Map<string, Set<any>>();
  for (const a of engine.agents) {
    if (!a.active || a.tapering || a.isFeeler) continue;
    if (!seen.has(a.genome.name)) seen.set(a.genome.name, new Set());
    seen.get(a.genome.name)!.add(a.genome);
  }
  for (const [, genomes] of seen) if (genomes.size > 1) duplicateNames++;

  const capOk = peak <= cfg.max;
  const floorOk = !floorBreached;
  const namesOk = duplicateNames === 0;
  const ok = capOk && floorOk && namesOk;

  console.log(
    `  ${ok ? "✅" : "❌"} min=${cfg.min} max=${cfg.max} | ` +
      `peak=${peak} trough=${trough === Infinity ? "-" : trough} | ` +
      `cap ${capOk ? "OK" : `FAIL (first breach frame ${breachFrame})`} | ` +
      `floor ${floorOk ? "OK" : "FAIL"} | ` +
      `unique names ${namesOk ? "OK" : `FAIL (${duplicateNames} collisions)`}`,
  );

  return ok;
}

let allOk = true;
console.log("");
for (const cfg of CONFIGS) {
  if (!runConfig(cfg)) allOk = false;
}

console.log("\n===============================================================");
if (allOk) {
  console.log("✅ ALL POPULATION BOUNDS TESTS PASSED");
} else {
  console.error("❌ POPULATION BOUNDS TESTS FAILED");
}
process.exit(allOk ? 0 : 1);
