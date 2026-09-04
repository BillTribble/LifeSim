import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

console.log("===============================================================");
console.log("  MIN_ORGANISMS (SIDE PANEL CREATURES) 9 HARD LIMIT TEST SUITE ");
console.log("===============================================================");

async function testMinOrganismsHardLimit() {
  const canvas = {} as any;
  const engine = new SimulationEngine(canvas, 1920, 1080);
  engine.minCreatures = 9; // User dial: 9 minimum organisms
  engine.maxCreatures = 14;
  engine.maxAgents = 100;
  engine.growthSpeed = 1.0;
  engine.timeScale = 1.0;

  let deathLoggedBeforeMin = false;
  let floorBreachedAfterReachingMin = false;
  let minReached = false;
  let minReachedFrame = -1;
  let maxSidePanelCount = 0;

  let lastEmittedStrains: any[] = [];
  engine.onStateUpdate = (state: any) => {
    if (state.strains) {
      lastEmittedStrains = state.strains;
      const count = state.strains.filter((s: any) => !s.name.startsWith("Feeler-")).length;
      if (count > maxSidePanelCount) maxSidePanelCount = count;
    }
  };

  engine.onLog = (msg: string) => {
    if (msg.includes("was fully eradicated") || msg.includes("completed lifecycle") || msg.includes("entering end-of-life")) {
      if (!minReached) {
        console.error(`🚨 ILLEGAL CREATURE DEATH BEFORE REACHING 9 ORGANISMS: ${msg}`);
        deathLoggedBeforeMin = true;
      }
    }
  };

  setupInitialCreatures(engine);

  console.log(`\n--- Initial State: ${engine.getLivingOrganismCount()} living organisms (Target: 9) ---`);

  // Run until min 9 is reached + extra frames to test floor stability
  let frame = 1;
  for (; frame <= 2000; frame++) {
    engine.update();

    const livingCount = engine.getLivingOrganismCount();

    if (!minReached && livingCount >= 9) {
      minReached = true;
      minReachedFrame = frame;
      console.log(`🎯 Reached min organisms (9) at frame ${frame} (t=${(frame / 60).toFixed(1)}s, livingCount=${livingCount})!`);
    }

    if (minReached) {
      if (livingCount < 9) {
        console.error(`🚨 ORGANISM FLOOR BREACHED: livingCount=${livingCount} < 9 at frame ${frame}`);
        floorBreachedAfterReachingMin = true;
      }
    }

    if (frame % 150 === 0) {
      const livingNames = Array.from(engine.getLivingOrganisms());
      const sidePanelCreatures = lastEmittedStrains.filter((s: any) => !s.name.startsWith("Feeler-")).length;
      console.log(
        `Frame ${frame.toString().padStart(4, ' ')} | Living Organisms: ${livingCount.toString().padStart(2, ' ')} | SidePanel Strains: ${sidePanelCreatures} | Active Agents: ${engine.getActiveAgentCount()} | Creatures: [${livingNames.join(", ")}]`
      );
    }

    if (minReached && frame >= minReachedFrame + 400) {
      break;
    }
  }

  console.log(`\n--- Dynamic Test: Increase minCreatures to 12 Organisms ---`);
  engine.setMinCreatures(12);
  let min12Reached = false;
  let floor12Breached = false;
  const startFrame12 = frame + 1;

  for (frame = startFrame12; frame <= startFrame12 + 1500; frame++) {
    engine.update();

    const livingCount = engine.getLivingOrganismCount();

    if (!min12Reached && livingCount >= 12) {
      min12Reached = true;
      console.log(`🎯 Reached new min organisms (12) at frame ${frame} (livingCount=${livingCount})!`);
    }

    if (min12Reached) {
      if (livingCount < 12) {
        console.error(`🚨 FLOOR 12 BREACHED: livingCount=${livingCount} < 12 at frame ${frame}`);
        floor12Breached = true;
      }
    }

    if (frame % 250 === 0) {
      console.log(
        `Frame ${frame} | Living Organisms: ${livingCount} | min12Reached: ${min12Reached}`
      );
    }
  }

  console.log("\n===============================================================");
  console.log("  TEST RESULTS");
  console.log("===============================================================");
  console.log(`Min 9 organisms reached: ${minReached} (at frame ${minReachedFrame})`);
  console.log(`Organism death before min 9: ${deathLoggedBeforeMin}`);
  console.log(`Floor 9 breached: ${floorBreachedAfterReachingMin}`);
  console.log(`Max Side Panel Creatures: ${maxSidePanelCount}`);
  console.log(`Min 12 organisms reached: ${min12Reached}`);
  console.log(`Floor 12 breached: ${floor12Breached}`);

  const sidePanelShowsMin9 = maxSidePanelCount >= 9;

  if (!deathLoggedBeforeMin && minReached && !floorBreachedAfterReachingMin && min12Reached && !floor12Breached && sidePanelShowsMin9) {
    console.log("\n✅ ALL MINIMUM ORGANISMS & SIDE PANEL TESTS PASSED!");
    return true;
  } else {
    console.error("\n❌ TESTS FAILED");
    return false;
  }
}

testMinOrganismsHardLimit().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
