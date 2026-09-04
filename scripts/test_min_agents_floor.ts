import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

console.log("===============================================================");
console.log("  MIN_AGENTS HARD LIMIT & EARLY DEATH HALT TEST SUITE        ");
console.log("===============================================================");

async function testMinAgentsHardLimit() {
  const canvas = {} as any;
  const engine = new SimulationEngine(canvas, 1920, 1080);
  engine.minCreatures = 9;
  engine.maxCreatures = 14;
  engine.maxAgents = 45;
  engine.growthSpeed = 1.0;
  engine.timeScale = 1.0;

  let deathLoggedBeforeMin = false;
  let floorBreachedAfterReachingMin = false;
  let minReached = false;
  let minReachedFrame = -1;

  engine.onLog = (msg: string) => {
    if (msg.includes("was fully eradicated") || msg.includes("completed lifecycle")) {
      if (!minReached) {
        console.error(`🚨 ILLEGAL DEATH BEFORE REACHING minAgents: ${msg}`);
        deathLoggedBeforeMin = true;
      }
    }
  };

  setupInitialCreatures(engine);

  console.log(`\n--- Starting Run with minAgents=9 (Initial agents: ${engine.getActiveAgentCount()}) ---`);

  // Run for 1500 frames (25s at 60fps)
  for (let frame = 1; frame <= 1500; frame++) {
    engine.update();

    const activeCount = engine.getActiveAgentCount();

    if (!minReached && activeCount >= engine.minCreatures) {
      minReached = true;
      minReachedFrame = frame;
      console.log(`🎯 Reached minAgents (${engine.minCreatures}) at frame ${frame} (t=${(frame / 60).toFixed(1)}s, activeCount=${activeCount})!`);
    }

    if (minReached) {
      if (activeCount < engine.minCreatures) {
        console.error(`🚨 FLOOR BREACHED: activeCount=${activeCount} < minAgents=${engine.minCreatures} at frame ${frame}`);
        floorBreachedAfterReachingMin = true;
      }
    }

    if (frame % 150 === 0) {
      const livingStrains = new Set(engine.agents.filter(a => a.active && !a.tapering && !a.isFeeler).map(a => a.genome.name));
      console.log(
        `Frame ${frame.toString().padStart(4, ' ')} | Active: ${activeCount.toString().padStart(2, ' ')} | Strains: ${livingStrains.size} | minReached: ${minReached} | dyingStrains: ${engine.dyingStrains?.size || 0}`
      );
    }
  }

  console.log(`\n--- Dynamic Test: Increase minAgents to 12 ---`);
  engine.setMinCreatures(12);
  let min12Reached = false;
  let floor12Breached = false;

  for (let frame = 1501; frame <= 2500; frame++) {
    engine.update();

    const activeCount = engine.getActiveAgentCount();

    if (!min12Reached && activeCount >= 12) {
      min12Reached = true;
      console.log(`🎯 Reached new minAgents (12) at frame ${frame} (activeCount=${activeCount})!`);
    }

    if (min12Reached) {
      if (activeCount < 12) {
        console.error(`🚨 FLOOR 12 BREACHED: activeCount=${activeCount} < 12 at frame ${frame}`);
        floor12Breached = true;
      }
    }

    if (frame % 250 === 0) {
      console.log(
        `Frame ${frame} | Active: ${activeCount} | min12Reached: ${min12Reached}`
      );
    }
  }

  console.log("\n===============================================================");
  console.log("  TEST RESULTS");
  console.log("===============================================================");
  console.log(`Min 9 reached: ${minReached} (at frame ${minReachedFrame})`);
  console.log(`Death before min 9: ${deathLoggedBeforeMin}`);
  console.log(`Floor 9 breached: ${floorBreachedAfterReachingMin}`);
  console.log(`Min 12 reached: ${min12Reached}`);
  console.log(`Floor 12 breached: ${floor12Breached}`);

  if (!deathLoggedBeforeMin && minReached && !floorBreachedAfterReachingMin && min12Reached && !floor12Breached) {
    console.log("\n✅ ALL MIN AGENTS HARD LIMIT TESTS PASSED!");
    return true;
  } else {
    console.error("\n❌ TESTS FAILED");
    return false;
  }
}

testMinAgentsHardLimit().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
