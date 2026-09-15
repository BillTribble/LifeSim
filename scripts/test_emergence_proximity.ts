/**
 * Regression test: spontaneously emerging organisms must join the existing colony.
 *
 * `spawnNewSpecies()` used to place new organisms with a flat
 * `(Math.random() - 0.5) * 80` box sample, completely unrelated to where life actually was.
 * When the population dipped below `minCreatures` the resulting "spontaneous emergence" could
 * drop an organism on the far side of the world with nothing around it.
 */
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures, spawnNewSpecies } from '../src/lib/SimulationSceneSetup';

console.log("===============================================================");
console.log("  EMERGENCE PROXIMITY TEST SUITE                               ");
console.log("===============================================================");

// Maximum distance an emergent organism may be from the nearest living neighbour.
// pickEmergencePosition() offsets 6-12 units from a living anchor, so allow a little headroom.
const MAX_EMERGENCE_DIST = 15;

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

function nearestLivingDistance(engine: any, pos: any, exclude: any): number {
  let nearest = Infinity;
  for (const a of engine.agents) {
    if (a === exclude || !a.active || a.tapering || a.isFeeler) continue;
    const d = a.position.distanceTo(pos);
    if (d < nearest) nearest = d;
  }
  return nearest;
}

function makeEngine() {
  const engine = new SimulationEngine({} as any, 1920, 1080);
  engine.minCreatures = 6;
  engine.maxCreatures = 12;
  engine.maxAgents = 200;
  engine.growthSpeed = 1.0;
  engine.timeScale = 1.0;
  engine.allowBreeding = true;
  engine.maxMatings = 6;
  engine.onLog = () => {};
  return engine;
}

console.log("\n=== Test 1: direct spawnNewSpecies() calls anchor to living tissue ===");
{
  const engine = makeEngine();
  setupInitialCreatures(engine);
  // Let the founders grow so there is real tissue to anchor against.
  for (let f = 0; f < 400; f++) engine.update();

  let worst = 0;
  let worstName = "";
  for (let i = 0; i < 40; i++) {
    const genome = spawnNewSpecies(engine);
    const agent = engine.agents[engine.agents.length - 1];
    const d = nearestLivingDistance(engine, agent.position, agent);
    if (d !== Infinity && d > worst) {
      worst = d;
      worstName = genome.name;
    }
  }
  check(
    `All 40 emergent organisms within ${MAX_EMERGENCE_DIST} units of living tissue (worst ${worst.toFixed(1)})`,
    worst <= MAX_EMERGENCE_DIST,
    `worst offender: ${worstName} at ${worst.toFixed(1)}`,
  );
}

console.log("\n=== Test 2: in-simulation emergence never lands detached ===");
{
  const engine = makeEngine();
  const violations: string[] = [];
  let emergenceCount = 0;

  engine.onLog = (msg: string) => {
    const m = msg.match(/Emergence of new species: (.+?) \[.*nearest living neighbour (\S+?)\./);
    if (!m) return;
    emergenceCount++;
    const nearest = m[2];
    if (nearest !== "none" && parseFloat(nearest) > MAX_EMERGENCE_DIST) {
      violations.push(`${m[1]} @ ${nearest}`);
    }
  };

  setupInitialCreatures(engine);
  for (let f = 0; f < 4000; f++) engine.update();

  console.log(`  (observed ${emergenceCount} emergence events)`);
  check(
    "No emergence landed detached from the colony",
    violations.length === 0,
    violations.join(", "),
  );
}

console.log("\n=== Test 3: empty world still seeds successfully ===");
{
  const engine = makeEngine();
  engine.agents = [];
  engine.segments = [];
  engine.pointCount = 0;
  const genome = spawnNewSpecies(engine);
  const agent = engine.agents[engine.agents.length - 1];
  check("Emergence into an empty world produces a finite position", Number.isFinite(agent.position.x) && Number.isFinite(agent.position.y) && Number.isFinite(agent.position.z));
  check("Empty-world emergence still creates an organism", !!genome?.name);
}

console.log(`\n${failures === 0 ? "✅ ALL EMERGENCE PROXIMITY TESTS PASSED" : `❌ ${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
