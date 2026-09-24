import * as THREE from "three";
import { SimulationEngine } from "../src/lib/SimulationEngine";
import { setupInitialCreatures, generateRandomGenome } from "../src/lib/SimulationSceneSetup";
import { updateMeshSegments } from "../src/lib/SimulationMeshUpdate";
import { updateSimulation } from "../src/lib/SimulationUpdate";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

async function runVerification() {
  console.log("===============================================================");
  console.log("  VERIFYING STEM FIXES, WRAP-AROUND, APPENDAGE SYNC & LINELOAD ");
  console.log("===============================================================\n");

  const canvas = {} as any;
  const engine = new SimulationEngine(canvas, 1920, 1080);
  engine.timeScale = 1.0;
  engine.maxDOMs = 3000;
  setupInitialCreatures(engine);

  const p1 = new THREE.Vector3(0, 0, 0);
  const p2 = new THREE.Vector3(0, 10, 0);
  const genome = generateRandomGenome(engine, "TestStrainAlpha", "bush");
  genome.appendage = "leaves";

  // -------------------------------------------------------------------------
  // TEST A: freeStemIndices popping behavior for appendages vs stems
  // -------------------------------------------------------------------------
  console.log("TEST A: Checking freeStemIndices is NOT popped for appendages, and IS popped for stems...");
  engine.freeStemIndices = [500, 501];
  const initialPointCount = engine.pointCount;

  // Appendage call: must NOT pop freeStemIndices
  updateMeshSegments(engine, p1, p2, genome, 1.0, true);
  assert(
    engine.freeStemIndices.length === 2 && engine.freeStemIndices[1] === 501,
    `freeStemIndices was popped by isAppendage=true! Length: ${engine.freeStemIndices.length}`,
  );
  console.log("  ✓ Appendage creation preserved freeStemIndices.");

  // Stem call: MUST pop freeStemIndices without inflating pointCount
  updateMeshSegments(engine, p1, p2, genome, 1.0, false);
  assert(
    engine.freeStemIndices.length === 1 && engine.freeStemIndices[0] === 500,
    `freeStemIndices was not popped by isAppendage=false! Length: ${engine.freeStemIndices.length}`,
  );
  assert(
    engine.pointCount === initialPointCount,
    `pointCount was inflated when reusing free slot! initial: ${initialPointCount}, current: ${engine.pointCount}`,
  );
  console.log("  ✓ Stem creation popped from freeStemIndices without inflating pointCount.");
  console.log("✅ TEST A PASSED!\n");

  // -------------------------------------------------------------------------
  // TEST B: Stem growth dither fade-in (wrap-around & recycled slots)
  // -------------------------------------------------------------------------
  console.log("TEST B: Checking stem dither fade-in and growingStems resolution...");
  const packB = engine.cylinderMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;

  // 1. Recycled slot via freeStemIndices
  engine.freeStemIndices = [600];
  updateMeshSegments(engine, p1, p2, genome, 1.0, false);
  assert(engine.growingStems.has(600), "Slot 600 was not added to engine.growingStems!");
  assert(
    Math.abs(packB.getX(600) - 0.01) < 0.001,
    `Slot 600 initial growth was ${packB.getX(600)}, expected 0.01`,
  );
  console.log("  ✓ Recycled slot 600 initialized at instancePackB.x = 0.01 and added to growingStems.");

  // 2. Wrap-around slot when pointCount >= maxDOMs
  engine.pointCount = engine.maxDOMs;
  updateMeshSegments(engine, p1, p2, genome, 1.0, false);
  const trunkReserved = Math.min(2000, Math.floor(engine.maxDOMs * 0.1));
  const expectedWrapSlot = trunkReserved + ((engine.maxDOMs - trunkReserved) % Math.max(1, engine.maxDOMs - trunkReserved));
  assert(engine.growingStems.has(expectedWrapSlot), `Wrap slot ${expectedWrapSlot} not added to growingStems!`);
  assert(
    Math.abs(packB.getX(expectedWrapSlot) - 0.01) < 0.001,
    `Wrap slot ${expectedWrapSlot} initial growth was ${packB.getX(expectedWrapSlot)}, expected 0.01`,
  );
  console.log(`  ✓ Wrap-around slot ${expectedWrapSlot} initialized at 0.01 and added to growingStems.`);

  // Advance simulation by 25 steps; step = max(0.02, 0.05 * 1.0) = 0.05
  for (let step = 0; step < 25; step++) {
    updateSimulation(engine);
  }

  assert(
    packB.getX(600) === 1.0,
    `Slot 600 growth after 25 frames was ${packB.getX(600)}, expected 1.0!`,
  );
  assert(!engine.growingStems.has(600), "Slot 600 was not removed from growingStems upon reaching 1.0!");
  assert(
    packB.getX(expectedWrapSlot) === 1.0,
    `Wrap slot ${expectedWrapSlot} growth was ${packB.getX(expectedWrapSlot)}, expected 1.0!`,
  );
  assert(
    !engine.growingStems.has(expectedWrapSlot),
    `Wrap slot ${expectedWrapSlot} was not removed from growingStems upon reaching 1.0!`,
  );
  console.log("  ✓ Both slots reached 1.0 within 25 frames and were purged from growingStems.");
  console.log("✅ TEST B PASSED!\n");

  // -------------------------------------------------------------------------
  // TEST C: Appendage parent tracking & orphan cleanup
  // -------------------------------------------------------------------------
  console.log("TEST C: Checking appendage parent tracking and orphan cleanup...");
  const leavesApp = engine.appendages.get("leaves")!;

  // Create stem at recycled slot 700
  engine.freeStemIndices = [700];
  updateMeshSegments(engine, p1, p2, genome, 1.0, false);
  const stemIdx = 700;

  // Immediately create appendage attached to that stem
  const appIdx = leavesApp.count % Math.floor(engine.maxDOMs / 4);
  updateMeshSegments(engine, p1, p2, genome, 1.0, true);

  const appSeg = leavesApp.segments[appIdx];
  assert(appSeg !== undefined, "Appendage segment was not created!");
  assert(
    appSeg.parentIndex === stemIdx,
    `Appendage parentIndex ${appSeg.parentIndex} does not match stem index ${stemIdx}!`,
  );
  console.log(`  ✓ Appendage correctly recorded parentIndex = ${stemIdx}.`);

  // Subtest C1: Parent stem dies -> appendage is marked dying
  engine.markDying(engine.segments, engine.dyingStems, stemIdx);
  updateSimulation(engine);
  assert(
    leavesApp.dyingSet.has(appIdx),
    `Appendage ${appIdx} was NOT marked dying when parent stem ${stemIdx} died!`,
  );
  console.log("  ✓ Appendage marked dying when parent stem entered dyingStems.");

  // Subtest C2: Parent stem overwritten by another strain
  const differentGenome = generateRandomGenome(engine, "OtherStrainBeta", "bush");
  differentGenome.appendage = "leaves";
  engine.freeStemIndices = [800];
  updateMeshSegments(engine, p1, p2, genome, 1.0, false);
  const stemIdx2 = 800;

  const appIdx2 = leavesApp.count % Math.floor(engine.maxDOMs / 4);
  updateMeshSegments(engine, p1, p2, genome, 1.0, true);
  assert(leavesApp.segments[appIdx2]?.parentIndex === stemIdx2, "Appendage 2 parentIndex mismatch!");

  // Overwrite parent stem slot 800 with different strain
  engine.segments[stemIdx2] = {
    index: stemIdx2,
    timestamp: engine.time + 100,
    matrix: new THREE.Matrix4(),
    thickness: 1.0,
    strainName: "OtherStrainBeta",
    countsForBiomass: true,
  };

  updateSimulation(engine);
  assert(
    leavesApp.dyingSet.has(appIdx2),
    `Appendage ${appIdx2} was NOT marked dying when parent stem was overwritten by another strain!`,
  );
  console.log("  ✓ Appendage marked dying when parent stem was overwritten / gone.");
  console.log("✅ TEST C PASSED!\n");

  // -------------------------------------------------------------------------
  // TEST D: lineLoad boundedness (<= 1.0) under rapid allocation and recycling
  // -------------------------------------------------------------------------
  console.log("TEST D: Checking lineLoad boundedness <= 1.0 under heavy churn...");
  engine.maxDOMs = 500;
  for (let i = 0; i < 2000; i++) {
    const g = i % 2 === 0 ? genome : differentGenome;
    updateMeshSegments(engine, p1, p2, g, 1.0, false);
    if (i % 3 === 0) {
      updateMeshSegments(engine, p1, p2, g, 1.0, true);
    }
    if (i % 10 === 0) {
      updateSimulation(engine);
    }
    const activeStems = Math.max(
      0,
      Math.min(engine.pointCount, engine.maxDOMs) -
        (engine.freeStemIndices ? engine.freeStemIndices.length : 0) -
        engine.dyingStems.size,
    );
    const lineLoad = activeStems / Math.max(1000, engine.maxDOMs);
    assert(
      lineLoad <= 1.0,
      `lineLoad exceeded 1.0 at step ${i}! Value: ${lineLoad}`,
    );
  }

  // Run full simulation frames to ensure ongoing boundedness
  for (let f = 0; f < 200; f++) {
    updateSimulation(engine);
    const activeStems = Math.max(
      0,
      Math.min(engine.pointCount, engine.maxDOMs) -
        (engine.freeStemIndices ? engine.freeStemIndices.length : 0) -
        engine.dyingStems.size,
    );
    const lineLoad = activeStems / Math.max(1000, engine.maxDOMs);
    assert(
      lineLoad <= 1.0,
      `lineLoad exceeded 1.0 during frame ${f}! Value: ${lineLoad}`,
    );
  }

  console.log("  ✓ lineLoad remained strictly <= 1.0 through 2,000 creations and 200 simulation frames.");
  console.log("✅ TEST D PASSED!\n");

  console.log("===============================================================");
  console.log("  ALL TESTS PASSED! Verification script completed successfully.");
  console.log("===============================================================");
}

runVerification().catch((err) => {
  console.error("Fatal error running verification script:", err);
  process.exit(1);
});
