import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

// Mock WebGLRenderer
class MockWebGLRenderer {
  domElement = { clientWidth: 1920, clientHeight: 1080 };
  shadowMap = { enabled: false, type: 0 };
  outputColorSpace = '';
  toneMapping = 0;
  toneMappingExposure = 1;
  autoClear = true;
  setPixelRatio() {}
  setSize() {}
  render() {}
  clearDepth() {}
  dispose() {}
}

console.log("===============================================================");
console.log("  20-SECOND SLOW-MO (timeScale=2.0) DISAPPEARANCE TEST SUITE  ");
console.log("===============================================================");

async function runDisappearanceTest(timeScale: number) {
  const container = {} as any;
  const renderer = new MockWebGLRenderer() as any;
  const engine = new SimulationEngine(container, renderer);
  engine.timeScale = timeScale;
  engine.growthSpeed = 1.0;
  engine.maxSpecies = 16;
  engine.minAgents = 10;
  engine.maxAgents = 150;

  let invisibleBugTriggered = false;
  let prematureDisappearanceCount = 0;

  engine.onLog = (msg: string) => {
    if (msg.includes("INVISIBLE BUG") || msg.includes("APPENDAGE DISAPPEARANCE WARNING")) {
      console.error(`  ${msg}`);
      invisibleBugTriggered = true;
    }
  };

  setupInitialCreatures(engine);

  console.log(`\n--- Starting 20s Run at timeScale=${timeScale} (60 FPS = 1200 frames) ---`);

  let prevLiveStems = 0;
  let prevLiveAppendages = 0;

  for (let sec = 1; sec <= 20; sec++) {
    // Run 60 frames per second
    for (let f = 0; f < 60; f++) {
      engine.update();
    }

    // Count live stems
    let liveStems = 0;
    for (let i = 0; i < engine.maxDOMs; i++) {
      if (engine.segments[i] && !engine.dyingStems.has(i)) {
        liveStems++;
      }
    }

    // Count live appendages
    let liveAppendages = 0;
    for (const app of engine.appendages.values()) {
      const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
      for (let i = 0; i < lim; i++) {
        if (app.segments[i] && !app.dyingSet.has(i)) {
          liveAppendages++;
        }
      }
    }

    const activeAgentsCount = engine.agents.filter(a => a.active && !a.isFeeler).length;
    const livingStrains = new Set(engine.agents.filter(a => a.active && !a.isFeeler).map(a => a.genome.name));

    console.log(
      `T+${sec.toString().padStart(2, ' ')}s | Active Agts: ${activeAgentsCount.toString().padStart(3, ' ')} | Species: ${livingStrains.size} | Live Stems: ${liveStems.toString().padStart(5, ' ')} | Live Apps: ${liveAppendages.toString().padStart(5, ' ')} | Dying Strains: ${engine.dyingStrains?.size || 0}`
    );

    // If creatures are active but live stems dropped to 0
    if (activeAgentsCount > 0 && liveStems === 0) {
      prematureDisappearanceCount++;
    }

    prevLiveStems = liveStems;
    prevLiveAppendages = liveAppendages;
  }

  return { invisibleBugTriggered, prematureDisappearanceCount, finalLiveStems: prevLiveStems, finalLiveAppendages: prevLiveAppendages };
}

async function main() {
  // Test 1: slow mode 2 (timeScale = 2.0)
  const res1 = await runDisappearanceTest(2.0);

  // Test 2: slow mode 0.4 (timeScale = 0.4)
  const res2 = await runDisappearanceTest(0.4);

  console.log("\n===============================================================");
  console.log("  TEST RESULTS SUMMARY");
  console.log("===============================================================");
  console.log(`Test 1 (timeScale=2.0): Stems=${res1.finalLiveStems}, Apps=${res1.finalLiveAppendages}, InvisibleBug=${res1.invisibleBugTriggered}`);
  console.log(`Test 2 (timeScale=0.4): Stems=${res2.finalLiveStems}, Apps=${res2.finalLiveAppendages}, InvisibleBug=${res2.invisibleBugTriggered}`);

  if (!res1.invisibleBugTriggered && res1.prematureDisappearanceCount === 0 && res1.finalLiveStems > 500 &&
      !res2.invisibleBugTriggered && res2.prematureDisappearanceCount === 0 && res2.finalLiveStems > 500) {
    console.log("\n✅ ALL DISAPPEARANCE TESTS PASSED: Creatures and appendages persist continuously without vanishing.");
    process.exit(0);
  } else {
    console.error("\n❌ DISAPPEARANCE TESTS FAILED");
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
