import * as THREE from "three";
import { handleBreedingAndFeelers, updateFeelerSeeking } from "./src/lib/SimulationBreeding";
import { getFertilityMinTicks } from "./src/lib/SimulationSeekRamp";

console.log("=== STARTING QA FEELER TARGETING & FERTILITY VERIFICATION ===");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, desc: string) {
  if (condition) {
    console.log(`[PASS] ${testId}: ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testId}: ${desc}`);
    failed++;
  }
}

function createMockEngine(time: number = 0) {
  return {
    time,
    timeScale: 1.0,
    allowBreeding: true,
    feelerProb: 1.0,
    feelerDelay: 6.0,
    hybridCooldown: 3.0,
    proximity: 80.0,
    desperation: 1.5,
    despairAge: 2000,
    minCreatures: 2,
    maxCreatures: 10,
    maxMatings: 3,
    feelerCount: 0,
    matingCount: 0,
    totalHybridCount: 0,
    hasAnyOrganismBred: false,
    traitProbs: {},
    segments: [] as any[],
    agents: [] as any[],
    dyingStrains: new Set<string>(),
    suppressedStrains: new Set<string>(),
    speciesLifecycleMap: new Map<string, any>(),
    getLivingOrganisms() {
      return new Set(this.agents.filter((a: any) => a.active && !a.tapering && !a.isFeeler).map((a: any) => a.genome.name));
    },
    getLivingOrganismCount() {
      return this.getLivingOrganisms().size;
    },
    onLog: () => {},
    spawnHybridArtifact: () => {},
  } as any;
}

// ---------------------------------------------------------
// TEST 1: Solo creature spawns 0 feelers
// ---------------------------------------------------------
{
  const engine = createMockEngine(500); // Mature age
  const alphaGenome = {
    name: "Alpha-101",
    archetype: "bush",
    createdAt: 0,
    thicknessBase: 1.0,
  } as any;

  const agentAlpha = {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(1, 0, 0),
    genome: alphaGenome,
    active: true,
    age: 500,
    thickness: 1.0,
    cooldown: 0,
  } as any;

  const activeAgents = [agentAlpha];
  const newAgents: any[] = [];
  const bredThisFrame = new Set<any>();
  const nonTaperingStrains = new Set<string>(["Alpha-101"]);

  // Run multiple iterations
  for (let iter = 0; iter < 50; iter++) {
    handleBreedingAndFeelers(agentAlpha, 0, activeAgents, newAgents, bredThisFrame, engine, nonTaperingStrains);
  }

  assert(newAgents.length === 0, "QA-FEELER-01", "Solo creature spawns 0 feelers (no fertile partner in world)");
}

// ---------------------------------------------------------
// TEST 2: Two immature creatures (time < minGrowthTicks) spawn 0 feelers
// ---------------------------------------------------------
{
  const immatureTime = 60; // 1 second (minGrowthTicks = 180 = 3s)
  const engine = createMockEngine(immatureTime);
  const minTicks = getFertilityMinTicks(engine);
  assert(immatureTime < minTicks, "QA-FEELER-PRE", `Setup verification: immatureTime (${immatureTime}) < minGrowthTicks (${minTicks})`);

  const alphaGenome = {
    name: "Alpha-101",
    archetype: "bush",
    createdAt: 0,
    thicknessBase: 1.0,
    color: new THREE.Color(0x00ff00),
  } as any;
  const betaGenome = {
    name: "Beta-202",
    archetype: "bush",
    createdAt: 0,
    thicknessBase: 1.0,
    color: new THREE.Color(0xff00ff),
  } as any;

  const agentAlpha = {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(1, 0, 0),
    genome: alphaGenome,
    active: true,
    age: immatureTime,
    thickness: 1.0,
    cooldown: 0,
  } as any;
  const agentBeta = {
    position: new THREE.Vector3(10, 0, 0),
    direction: new THREE.Vector3(-1, 0, 0),
    genome: betaGenome,
    active: true,
    age: immatureTime,
    thickness: 1.0,
    cooldown: 0,
  } as any;

  const activeAgents = [agentAlpha, agentBeta];
  const newAgents: any[] = [];
  const bredThisFrame = new Set<any>();
  const nonTaperingStrains = new Set<string>(["Alpha-101", "Beta-202"]);

  for (let iter = 0; iter < 50; iter++) {
    handleBreedingAndFeelers(agentAlpha, 0, activeAgents, newAgents, bredThisFrame, engine, nonTaperingStrains);
    handleBreedingAndFeelers(agentBeta, 1, activeAgents, newAgents, bredThisFrame, engine, nonTaperingStrains);
  }

  assert(newAgents.length === 0, "QA-FEELER-02", "Two immature creatures (time < minGrowthTicks) spawn 0 feelers");
}

// ---------------------------------------------------------
// TEST 3: Mature and fertile creatures spawn a feeler aiming directly at the partner
// ---------------------------------------------------------
{
  const matureTime = 400; // > feelerDelay (360) and > minGrowthTicks (180)
  const engine = createMockEngine(matureTime);

  const alphaGenome = {
    name: "Alpha-101",
    archetype: "bush",
    createdAt: 0,
    thicknessBase: 1.0,
    color: new THREE.Color(0x00ff00),
  } as any;
  const betaGenome = {
    name: "Beta-202",
    archetype: "bush",
    createdAt: 0,
    thicknessBase: 1.0,
    color: new THREE.Color(0xff00ff),
  } as any;

  const agentAlpha = {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 1, 0), // pointing UP (orthogonal to partner!)
    genome: alphaGenome,
    active: true,
    age: matureTime,
    thickness: 1.0,
    cooldown: 0,
  } as any;
  const agentBeta = {
    position: new THREE.Vector3(30, 0, 0), // Partner is along +X axis
    direction: new THREE.Vector3(-1, 0, 0),
    genome: betaGenome,
    active: true,
    age: matureTime,
    thickness: 1.0,
    cooldown: 0,
  } as any;

  const activeAgents = [agentAlpha, agentBeta];
  const newAgents: any[] = [];
  const bredThisFrame = new Set<any>();
  const nonTaperingStrains = new Set<string>(["Alpha-101", "Beta-202"]);

  // Set feelerProb high to guarantee spawn on first frame
  engine.feelerProb = 100.0;

  handleBreedingAndFeelers(agentAlpha, 0, activeAgents, newAgents, bredThisFrame, engine, nonTaperingStrains);

  assert(newAgents.length === 1, "QA-FEELER-03-SPAWN", "Feeler spawned when both creatures are mature and fertile");
  const feeler = newAgents[0];

  assert(feeler.isFeeler === true, "QA-FEELER-03-TYPE", "Spawned agent is marked as isFeeler: true");
  assert(agentAlpha.cooldown === 0, "QA-FEELER-03-COOLDOWN", "Parent creature cooldown is NOT set by feeler spawn (remains 0)");

  // Expected target direction from (0,0,0) to (30,0,0) is (1, 0, 0)
  const expectedDir = new THREE.Vector3(1, 0, 0);
  const dotProd = feeler.direction.dot(expectedDir);
  assert(dotProd > 0.99, "QA-FEELER-03-DIRECTION", `Feeler aims directly at partner (dot product = ${dotProd.toFixed(4)} > 0.99, branch was pointing UP)`);

  // ---------------------------------------------------------
  // TEST 4: Direct Homing in updateFeelerSeeking
  // ---------------------------------------------------------
  engine.agents = [agentAlpha, agentBeta, feeler];
  // Slightly disturb feeler position
  feeler.position.set(10, 5, 0);
  updateFeelerSeeking(feeler, engine);

  const homingTarget = new THREE.Vector3().subVectors(agentBeta.position, feeler.position).normalize();
  const homingDot = feeler.direction.dot(homingTarget);
  assert(homingDot > 0.99, "QA-FEELER-04-HOMING", `updateFeelerSeeking steers feeler directly at partner (dot = ${homingDot.toFixed(4)} > 0.99)`);

  // ---------------------------------------------------------
  // TEST 5: Successful mating upon contact
  // ---------------------------------------------------------
  // Place feeler right on top of Beta (touching)
  feeler.position.set(29.8, 0, 0);
  const matingNewAgents: any[] = [];
  const matingBredThisFrame = new Set<any>();

  handleBreedingAndFeelers(feeler, 2, [agentAlpha, agentBeta, feeler], matingNewAgents, matingBredThisFrame, engine, nonTaperingStrains);

  assert(matingBredThisFrame.has(feeler), "QA-FEELER-05-MATE", "Feeler successfully mates upon physical contact with partner");
  assert(engine.hasAnyOrganismBred === true, "QA-FEELER-05-BRED", "Engine records successful organism breeding");
  assert(feeler.active === false, "QA-FEELER-05-FREEZE", "Feeler freezes in place after mating");
}

console.log(`\n=== QA TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
