/**
 * Regression test: offspring must never spawn detached from living tissue.
 *
 * Reproduces the bug where an organism registered "contact" with an unrelated (or its own)
 * feeler's segments, then spawned the child at the midpoint between two growth tips that were
 * hundreds of units apart — producing an isolated bush floating in empty space.
 */
import * as THREE from "three";
import {
  buildFeelerOwnerMap,
  ownerOfStrain,
  handleBreedingAndFeelers,
} from "../src/lib/SimulationBreeding";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

function mkGenome(name: string, archetype = "bush") {
  return {
    name,
    archetype,
    createdAt: 0,
    color: new THREE.Color(0x00ff00),
    thicknessBase: 1.0,
    minThickness: 0.5,
    stepSize: 1.0,
    wanderIntensity: 0.2,
    bifurcationRate: 0.01,
    branchTendency: 0.5,
    stability: 1.0,
    movementType: "default",
    geometryType: "cylinder",
    appendage: "none",
  };
}

function mkAgent(genome: any, pos: THREE.Vector3, opts: any = {}) {
  return {
    position: pos.clone(),
    lastPosition: pos.clone(),
    direction: new THREE.Vector3(1, 0, 0),
    genome,
    active: true,
    age: 5000,
    thickness: 1.0,
    cooldown: 0,
    ...opts,
  } as any;
}

function mkSegment(index: number, strainName: string, pos: THREE.Vector3) {
  const matrix = new THREE.Matrix4();
  matrix.setPosition(pos);
  return { index, timestamp: 0, matrix, thickness: 1.0, strainName, agentId: 0 };
}

// --- Scenario -------------------------------------------------------------
// Organism A at the origin. Organism B's growth tip is 500 units away (far off screen).
// A's OWN feeler has left segments right next to A. Under the old logic those
// `Feeler-*` segments matched B's proximity scan, so A "touched" B and spawned a child
// at the midpoint (250, 0, 0) — in the middle of nowhere.

const genomeA = mkGenome("Bush Alpha");
const genomeB = mkGenome("Tree Beta", "tree");

const agentA = mkAgent(genomeA, new THREE.Vector3(0, 0, 0));
const agentB = mkAgent(genomeB, new THREE.Vector3(500, 0, 0));

const feelerGenomeA = { ...genomeA, name: "Feeler-1111" };
const feelerA = mkAgent(feelerGenomeA, new THREE.Vector3(1, 0, 0), {
  isFeeler: true,
  realGenome: genomeA,
  parentAgent: agentA,
  thickness: 0.3,
});

const activeAgents = [agentA, agentB, feelerA];

const spawned: any[] = [];
const logs: string[] = [];

const engine: any = {
  time: 10000,
  timeScale: 1,
  agents: activeAgents,
  segments: [
    // A's own feeler tissue, essentially touching A
    mkSegment(0, "Feeler-1111", new THREE.Vector3(1, 0, 0)),
    mkSegment(1, "Feeler-1111", new THREE.Vector3(1.2, 0, 0)),
    // B's real tissue, far away
    mkSegment(2, "Tree Beta", new THREE.Vector3(500, 0, 0)),
    mkSegment(3, "Tree Beta", new THREE.Vector3(498, 0, 0)),
  ],
  genomeMap: new Map(),
  speciesLifecycleMap: new Map([
    ["Bush Alpha", { matingCount: 0, hasBred: false, phase: "GROWING" }],
    ["Tree Beta", { matingCount: 0, hasBred: false, phase: "GROWING" }],
  ]),
  dyingStrains: new Set(),
  suppressedStrains: new Set(),
  maxMatings: 6,
  minCreatures: 2,
  maxCreatures: 12,
  proximity: 20,
  desperation: 2,
  despairAge: 1200,
  seekAmount: 0.65,
  allowBreeding: true,
  postMatingDieoff: false,
  hasAnyOrganismBred: true,
  hybridCooldown: 300,
  feelerDelay: 6.0,
  feelerProb: 0.0, // suppress random feeler emission noise
  feelerCount: 99,
  matingCount: 99,
  traitProbs: {},
  multicolorAppProb: 0,
  sameColorAppProb: 0,
  appendageSpawnRate: 0,
  glowProbability: 0,
  camera: null,
  onLog: (m: string) => logs.push(m),
  getLivingOrganismCount: () => 2,
  initSpeciesLifecycle: () => {},
  killSpecies: () => {},
  spawnHybridArtifact: () => {},
};

console.log("\n=== Test 1: owner map resolves feeler segments to parent organism ===");
const ownerMap = buildFeelerOwnerMap(engine, activeAgents);
check(
  "Feeler-1111 resolves to Bush Alpha",
  ownerOfStrain("Feeler-1111", ownerMap) === "Bush Alpha",
  `got ${ownerOfStrain("Feeler-1111", ownerMap)}`,
);
check(
  "Real strain names pass through unchanged",
  ownerOfStrain("Tree Beta", ownerMap) === "Tree Beta",
);

console.log("\n=== Test 2: no phantom long-range mating ===");
const newAgents: any[] = [];
const bred = new Set<any>();
for (let tick = 0; tick < 400; tick++) {
  engine.time++;
  newAgents.length = 0;
  handleBreedingAndFeelers(
    agentA,
    0,
    activeAgents,
    newAgents,
    bred,
    engine,
    new Set(["Bush Alpha", "Tree Beta"]),
  );
  for (const na of newAgents) {
    if (!na.isFeeler) spawned.push(na);
  }
  agentA.cooldown = 0;
}
check(
  "No offspring spawned while parents are 500 units apart",
  spawned.length === 0,
  `spawned ${spawned.length}: ${spawned
    .map((s) => `${s.genome.name}@${s.position.toArray().map((v: number) => v.toFixed(1))}`)
    .join(", ")}`,
);

console.log("\n=== Test 3: genuine contact spawns child AT the contact point ===");
// Move B's tissue into genuine touching distance of A (within the strict contact threshold).
// A.thickness = B.thickness = 1.0, so touchDist = max(0.5, 0.5) = 0.5 — tissue must be ≤0.5 apart.
engine.segments[2] = mkSegment(2, "Tree Beta", new THREE.Vector3(0.4, 0, 0));
engine.segments[3] = mkSegment(3, "Tree Beta", new THREE.Vector3(0.45, 0, 0));
agentB.position.set(400, 0, 0); // tip has grown far away from the contact point
agentB.lastPosition.set(400, 0, 0);

const spawned2: any[] = [];
for (let tick = 0; tick < 200 && spawned2.length === 0; tick++) {
  engine.time++;
  newAgents.length = 0;
  bred.clear();
  agentA.cooldown = 0;
  agentB.cooldown = 0;
  handleBreedingAndFeelers(
    agentA,
    0,
    activeAgents,
    newAgents,
    bred,
    engine,
    new Set(["Bush Alpha", "Tree Beta"]),
  );
  for (const na of newAgents) if (!na.isFeeler) spawned2.push(na);
}

check("Offspring produced on genuine contact", spawned2.length > 0);
if (spawned2.length > 0) {
  const child = spawned2[0];
  const distToA = child.position.distanceTo(agentA.position);
  const touchDist = Math.max(2.0, agentA.thickness + agentB.thickness);
  check(
    `Child spawns within touch distance of parent A (${distToA.toFixed(2)} <= ${touchDist.toFixed(2)})`,
    distToA <= touchDist + 1e-6,
  );
  check(
    "Child is NOT at the midpoint of the two distant growth tips",
    Math.abs(child.position.x - 200) > 1.0,
    `x=${child.position.x.toFixed(2)}`,
  );
}

console.log(`\n${failures === 0 ? "✅ ALL TESTS PASSED" : `❌ ${failures} TEST(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
