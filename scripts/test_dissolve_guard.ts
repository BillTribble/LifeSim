import * as THREE from "three";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SimulationEngine } from "../src/lib/SimulationEngine";
import {
  STEM_BIRTH_GROWTH_INIT,
  APPENDAGE_BIRTH_GROWTH_INIT,
  updateMeshSegments,
  processDyingSegments,
} from "../src/lib/SimulationMeshUpdate";
import { updateMeshesAndStemsGrowth } from "../src/lib/SimulationUpdateVisuals";
import type { Genome } from "../src/lib/SimulationTypes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMockCanvas() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    clientWidth: 1280,
    clientHeight: 720,
    width: 1280,
    height: 720,
    getContext: () => ({
      getExtension: () => null,
      getParameter: () => 0,
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      clearColor: () => {},
      clearDepth: () => {},
      clearStencil: () => {},
      enable: () => {},
      disable: () => {},
      depthFunc: () => {},
      blendEquationSeparate: () => {},
      blendFuncSeparate: () => {},
      viewport: () => {},
      scissor: () => {},
    }),
  } as any;
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED ASSERTION: ${msg}`);
    throw new Error(msg);
  }
}

async function runDissolveGuardTests() {
  console.log("Running Dissolve Regression Guard Invariants...");

  const engine = new SimulationEngine(createMockCanvas(), 1280, 720);
  engine.onLog = () => {};

  const genomeStem: Genome = {
    name: "TestStrain",
    archetype: "bush",
    appendage: "leaves",
    color: new THREE.Color("#3e5e50"),
    palette: ["#0b939c", "#3e5e50"],
    vernationType: "convolute",
  } as any;
  engine.genomeMap.set(genomeStem.name, genomeStem);

  // Invariant 1: Birth Initial State
  assert(STEM_BIRTH_GROWTH_INIT <= 0.05, `STEM_BIRTH_GROWTH_INIT must be <= 0.05, got ${STEM_BIRTH_GROWTH_INIT}`);
  assert(APPENDAGE_BIRTH_GROWTH_INIT <= 0.05, `APPENDAGE_BIRTH_GROWTH_INIT must be <= 0.05, got ${APPENDAGE_BIRTH_GROWTH_INIT}`);

  updateMeshSegments(engine, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), genomeStem, 0.2, false, 1, false);
  const stemIdx = engine.lastAgentStemIndex.get(1)!;
  assert(stemIdx !== undefined, "Stem segment was not allocated");

  const packB = engine.cylinderMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
  const initialStemGrowth = packB.getX(stemIdx);
  assert(initialStemGrowth <= 0.05, `Initial stem growth must be <= 0.05, got ${initialStemGrowth}`);
  assert(engine.growingStems.has(stemIdx) === true, "engine.growingStems must contain stemIdx at birth");

  updateMeshSegments(engine, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.5, 1.5, 0), genomeStem, 0.1, true, 1, false);
  const leafApp = engine.appendages.get("leaves");
  assert(leafApp !== undefined && leafApp.count > 0, "Leaf appendage was not spawned");
  const leafPackB = leafApp!.mesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
  const initialAppGrowth = leafPackB.getX(leafApp!.count - 1);
  assert(initialAppGrowth <= 0.05, `Initial appendage growth must be <= 0.05, got ${initialAppGrowth}`);
  console.log("✓ Invariant 1 passed (Birth Initial State <= 0.05, tracked in growingStems)");

  // Invariant 2: No Premature Snap or Coalesce on Next Step
  const firstSegEnd = engine.segments[stemIdx].endPos.clone();
  updateMeshSegments(engine, firstSegEnd, firstSegEnd.clone().add(new THREE.Vector3(0, 1, 0)), genomeStem, 0.2, false, 1, false);
  const stemIdx2 = engine.lastAgentStemIndex.get(1)!;
  assert(stemIdx2 !== stemIdx, `Second segment must get a new slot index, got ${stemIdx2} vs ${stemIdx}`);
  assert(packB.getX(stemIdx) <= 0.05, `stemIdx1 must not snap to 1.0 on next step, got ${packB.getX(stemIdx)}`);
  assert(engine.growingStems.has(stemIdx) === true, "stemIdx1 must remain in growingStems on next step");
  console.log("✓ Invariant 2 passed (No premature snap or coalesce on subsequent birth)");

  // Invariant 3: Smooth Multi-Frame Birth Ramp, Independent of Wind
  engine.overallMovement = 0.0;
  engine.timeScale = 1.0;
  let prevGrowth = packB.getX(stemIdx);
  for (let f = 0; f < 10; f++) {
    engine.time += 0.016;
    engine.unscaledTime += 1;
    updateMeshesAndStemsGrowth(engine, engine.genomeMap, []);
    const curGrowth = packB.getX(stemIdx);
    assert(curGrowth > prevGrowth, `Growth did not increase monotonically at frame ${f}: ${curGrowth} <= ${prevGrowth}`);
    prevGrowth = curGrowth;
  }
  const valAfter10 = packB.getX(stemIdx);
  assert(valAfter10 > 0.02 && valAfter10 < 0.50, `valAfter10 should be in (0.02, 0.50), got ${valAfter10}`);

  let framesToReach1 = 10;
  while (packB.getX(stemIdx) < 1.0 && framesToReach1 < 200) {
    framesToReach1++;
    engine.time += 0.016;
    engine.unscaledTime += 1;
    updateMeshesAndStemsGrowth(engine, engine.genomeMap, []);
  }
  assert(framesToReach1 >= 30, `Birth ramp finished too quickly: took ${framesToReach1} frames, expected >= 30`);
  console.log(`✓ Invariant 3 passed (Smooth wind-independent birth ramp: valAfter10=${valAfter10.toFixed(3)}, ${framesToReach1} frames to full solid)`);

  // Invariant 4: Smooth Multi-Frame Death Dissolve
  engine.markDying(engine.segments, engine.dyingStems, stemIdx, engine.unscaledTime);
  const packA = engine.cylinderMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
  let midLifeDecay = -1;
  for (let step = 0; step < 12; step++) {
    engine.unscaledTime += 60;
    processDyingSegments(engine, engine.segments, engine.dyingStems, engine.cylinderMesh);
    const curDecay = packA.getZ(stemIdx);
    if (step === 4) { // frame tick ~300 of 540 (~55% through fade)
      midLifeDecay = curDecay;
    }
  }
  assert(midLifeDecay > 0 && midLifeDecay < 1, `Mid-life vDecay must be between 0 and 1, got ${midLifeDecay}`);
  assert(engine.segments[stemIdx] === undefined, "Segment must be removed after fadeAge >= 540");
  assert(packA.getZ(stemIdx) === 1.0, `Final vDecay must be 1.0, got ${packA.getZ(stemIdx)}`);
  console.log(`✓ Invariant 4 passed (Smooth multi-frame death dissolve: midLifeDecay=${midLifeDecay.toFixed(3)}, cleanly purged at 540 frames)`);

  // Invariant 5: Shader Source Guard
  const geneticsSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/SimulationGenetics.ts"), "utf-8");
  const trimmerSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/SimulationVertexTrimmer.ts"), "utf-8");
  const requiredShaderTokens = ["axialGrowth", "ditherIn > axialGrowth", "diffuseColor.rgb *= mix(", "vDecay"];

  for (const [name, src] of [["SimulationGenetics.ts", geneticsSrc], ["SimulationVertexTrimmer.ts", trimmerSrc]]) {
    for (const token of requiredShaderTokens) {
      assert(src.includes(token), `Shader source guard failed: ${name} does not contain required token "${token}"`);
    }
  }
  console.log("✓ Invariant 5 passed (Shader source guard verified in SimulationGenetics and SimulationVertexTrimmer)");

  console.log("\nALL DISSOLVE GUARD INVARIANTS PASSED");
}

runDissolveGuardTests().catch((err) => {
  console.error("Dissolve Guard FAILED:", err);
  process.exit(1);
});
