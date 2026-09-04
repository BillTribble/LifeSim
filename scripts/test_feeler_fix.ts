import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

async function testFeelerBreedingAndCreatureControls() {
  console.log("===============================================================");
  console.log("  TESTING FEELER GENOME RESOLUTION & CREATURE CONTROLS        ");
  console.log("===============================================================");

  const canvas = {} as any;
  const engine = new SimulationEngine(canvas, 1920, 1080);
  engine.setMinCreatures(6);
  engine.setMaxCreatures(60);
  engine.growthSpeed = 1.5;
  engine.timeScale = 1.0;
  engine.allowBreeding = true;
  engine.proximity = 60;
  engine.seekAmount = 0.9;

  setupInitialCreatures(engine);

  let snakeEncountered = false;
  let feelerChildEncountered = false;
  let matingEvents = 0;

  engine.onLog = (msg: string) => {
    if (msg.includes("[SNAKE]")) {
      console.error(`🚨 SNAKE CREATURE SPAWNED: ${msg}`);
      snakeEncountered = true;
    }
    if (msg.includes("Feeler-") && msg.includes("Offspring")) {
      console.error(`🚨 FEELER SPAWNED AS OFFSPRING: ${msg}`);
      feelerChildEncountered = true;
    }
    if (msg.includes("💖 Offspring")) {
      matingEvents++;
      console.log(`  ${msg}`);
    }
  };

  for (let frame = 1; frame <= 2000; frame++) {
    engine.update();

    for (const [name, g] of engine.genomeMap.entries()) {
      if (g.archetype === ("snake" as any)) {
        console.error(`🚨 GENOME WITH SNAKE ARCHETYPE FOUND IN genomeMap: ${name}`);
        snakeEncountered = true;
      }
      if (name.startsWith("Feeler-") && !engine.agents.some(a => a.genome.name === name && a.isFeeler)) {
        console.error(`🚨 FEELER PERSISTED IN GENOME MAP AS ORGANISM: ${name}`);
        feelerChildEncountered = true;
      }
    }

    if (frame % 500 === 0) {
      const living = Array.from(engine.getLivingOrganisms());
      console.log(`Frame ${frame} | Living Creatures (${living.length}): ${living.join(", ")}`);
    }
  }

  console.log(`\nSimulation complete over 2000 frames.`);
  console.log(`Mating events recorded: ${matingEvents}`);
  console.log(`Snake organisms encountered: ${snakeEncountered}`);
  console.log(`Feeler leaked as child organism: ${feelerChildEncountered}`);

  if (snakeEncountered || feelerChildEncountered) {
    console.error(`❌ TESTS FAILED`);
    process.exit(1);
  } else {
    console.log(`✅ ALL TESTS PASSED: Feelers remain extensions of organisms and only valid organism archetypes are bred!`);
  }
}

testFeelerBreedingAndCreatureControls();
