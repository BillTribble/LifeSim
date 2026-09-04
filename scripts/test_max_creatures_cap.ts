import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

console.log("===============================================================");
console.log("  MAX CREATURES (MAX_SPECIES) CAP ENFORCEMENT TEST SUITE      ");
console.log("===============================================================");

async function testMaxCreaturesCap() {
  const canvas = {} as any;
  const engine = new SimulationEngine(canvas, 1920, 1080);
  engine.minCreatures = 3;
  engine.maxCreatures = 9;
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
  engine.feelerProb = 0.8;
  engine.feelerDelay = 1.0;
  (engine as any).deathRate = 0;
  (engine as any).diebackRate = 0;
  engine.postMatingDieoff = false;

  let capBreached = false;
  let maxOrganismCount = 0;
  let breachFrame = -1;
  let breedingBlockedCount = 0;

  engine.onLog = (msg: string) => {
    if (msg.includes("Breeding blocked to honor maxCreatures")) {
      breedingBlockedCount++;
    }
  };

  setupInitialCreatures(engine);

  console.log(`\n--- Config: minCreatures=${engine.minCreatures}, maxCreatures(maxSpecies)=${engine.maxCreatures} ---`);
  console.log(`--- Initial living organisms: ${engine.getLivingOrganismCount()} ---\n`);

  for (let frame = 1; frame <= 3000; frame++) {
    engine.update();

    const livingCount = engine.getLivingOrganismCount();
    if (livingCount > maxOrganismCount) maxOrganismCount = livingCount;

    if (livingCount > engine.maxCreatures) {
      if (!capBreached) {
        breachFrame = frame;
        console.error(`🚨 CAP BREACHED at frame ${frame}: ${livingCount} organisms > maxSpecies=${engine.maxCreatures}`);
      }
      capBreached = true;
    }

    if (frame % 300 === 0) {
      const livingNames = Array.from(engine.getLivingOrganisms());
      console.log(
        `Frame ${frame.toString().padStart(4, ' ')} | Living: ${livingCount.toString().padStart(2, ' ')} | Cap: ${engine.maxCreatures} | Active Agents: ${engine.getActiveAgentCount()} | Breeding blocked: ${breedingBlockedCount}x | [${livingNames.join(", ")}]`
      );
    }
  }

  console.log("\n===============================================================");
  console.log("  TEST RESULTS");
  console.log("===============================================================");
  console.log(`maxSpecies cap: ${engine.maxCreatures}`);
  console.log(`Max organism count observed: ${maxOrganismCount}`);
  console.log(`Cap breached: ${capBreached}${capBreached ? ` (first at frame ${breachFrame})` : ""}`);
  console.log(`Breeding blocked count: ${breedingBlockedCount}`);

  if (!capBreached) {
    console.log("\n✅ MAX CREATURES CAP ENFORCED — organism count never exceeded maxSpecies!");
    return true;
  } else {
    console.error(`\n❌ CAP FAILED — reached ${maxOrganismCount} organisms with cap of ${engine.maxCreatures}`);
    return false;
  }
}

testMaxCreaturesCap().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
