import * as THREE from "three";
import { DEFAULTS } from "../src/hooks/SimulationDefaults";
import {
  evaluateWindDisplacementCPU,
  setupNaturalWindMaterial,
  computeLfoModulatedOverall,
  pickNextLfoCycleLengthMult,
  pickNextLfoCycleRandomRoll,
  updateWindMaterialUniforms,
} from "../src/lib/SimulationWindMotion";
import { setupShaderMaterial } from "../src/lib/SimulationGenetics";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("Starting Wind Motion & Hierarchical Branching Automated Tests...");

// ==========================================
// Test 1: Defaults & Ranges
// ==========================================
console.log("-> Test 1: Defaults & Ranges");
assert(DEFAULTS.shimmer === 0.04, `Expected shimmer 0.04, got ${DEFAULTS.shimmer}`);
assert(DEFAULTS.wavy === 0.00, `Expected wavy 0.00, got ${DEFAULTS.wavy}`);
assert(DEFAULTS.branchMovement === 0.32, `Expected branchMovement 0.32, got ${DEFAULTS.branchMovement}`);
assert(DEFAULTS.overallMovement === 0.40, `Expected overallMovement 0.40, got ${DEFAULTS.overallMovement}`);
assert(DEFAULTS.movementLfoSpeed === 0.14, `Expected movementLfoSpeed 0.14, got ${DEFAULTS.movementLfoSpeed}`);
assert(DEFAULTS.movementLfoDepth === 0.12, `Expected movementLfoDepth 0.12, got ${DEFAULTS.movementLfoDepth}`);
assert(DEFAULTS.movementLfoPeak === 0.42, `Expected movementLfoPeak 0.42, got ${DEFAULTS.movementLfoPeak}`);
assert(DEFAULTS.movementLfoRandom === 73, `Expected movementLfoRandom 73, got ${DEFAULTS.movementLfoRandom}`);
assert(DEFAULTS.minCreatures === 4, `Expected minCreatures 4, got ${DEFAULTS.minCreatures}`);
assert(DEFAULTS.maxCreatures === 12, `Expected maxCreatures 12, got ${DEFAULTS.maxCreatures}`);
assert(DEFAULTS.showBoundaryBox === true, `Expected showBoundaryBox true, got ${DEFAULTS.showBoundaryBox}`);

const limits = DEFAULTS.dialLimits;
assert(limits.SHIMMER?.min === 0 && limits.SHIMMER?.max === 2, "SHIMMER limits should be 0..2");
assert(limits.WAVY?.min === 0 && limits.WAVY?.max === 2, "WAVY limits should be 0..2");
assert(limits.BRANCH_MOVE?.min === 0 && limits.BRANCH_MOVE?.max === 2, "BRANCH_MOVE limits should be 0..2");
assert(limits.MOVEMENT?.min === 0 && limits.MOVEMENT?.max === 2, "MOVEMENT limits should be 0..2");
assert(limits.LFO_SPEED?.min === 0 && limits.LFO_SPEED?.max === 2, "LFO_SPEED limits should be 0..2");
assert(limits.LFO_DEPTH?.min === 0 && limits.LFO_DEPTH?.max === 2, "LFO_DEPTH limits should be 0..2");
assert(limits.LFO_PEAK?.min === 0.05 && limits.LFO_PEAK?.max === 1.0, "LFO_PEAK limits should be 0.05..1.0");
assert(limits.LFO_RAND?.min === 0 && limits.LFO_RAND?.max === 100, "LFO_RAND limits should be 0..100");
console.log("   Test 1 Passed: Defaults & Ranges verified.");

// ==========================================
// Test 2: Zero Displacement when overallMovement === 0
// ==========================================
console.log("-> Test 2: Zero Displacement when overallMovement === 0");
const samplePositions = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 20, 30),
  new THREE.Vector3(-15, 45, -20),
  new THREE.Vector3(100, 200, 150),
];
const root = new THREE.Vector3(0, 0, 0);
const branchBase = new THREE.Vector3(10, 20, 0);

for (const pos of samplePositions) {
  const disp = evaluateWindDisplacementCPU(
    pos,
    root,
    branchBase,
    1.0,
    0.5,
    3.5,
    { shimmer: 1.5, wavy: 1.5, branchMovement: 1.5, overallMovement: 0.0 }
  );
  assert(disp.x === 0 && disp.y === 0 && disp.z === 0, `Displacement at ${pos.toArray()} must be 0 when overallMovement=0, got ${disp.toArray()}`);
}
console.log("   Test 2 Passed: Zero displacement when overallMovement === 0.");

// ==========================================
// Test 3: Base-Vertex Zero Detachment & Root Anchor Invariant
// ==========================================
console.log("-> Test 3: Base-Vertex Zero Detachment & Root Anchor Invariant");
const time = 2.5;
const configMove = { shimmer: 0, wavy: 0, branchMovement: 2.0, overallMovement: 2.0 };

// 3a. At worldPos == rootOrigin, displacement must be strictly 0
const rootDisp = evaluateWindDisplacementCPU(root, root, branchBase, 0.0, 0.0, time, configMove);
assert(rootDisp.length() === 0, `Root displacement must be 0, got ${rootDisp.length()}`);

// 3b. At worldPos == branchBasePos with isLateral = 1 vs isLateral = 0 (parent trunk), zero detachment
const parentTrunkSway = evaluateWindDisplacementCPU(branchBase, root, branchBase, 0.0, 0.0, time, configMove);
const lateralBranchBaseSway = evaluateWindDisplacementCPU(branchBase, root, branchBase, 1.0, 0.0, time, configMove);

const detachment = new THREE.Vector3().subVectors(lateralBranchBaseSway, parentTrunkSway).length();
assert(detachment < 1e-6, `Detachment between lateral branch base vertex and parent trunk at branchBasePos must be < 1e-6, got ${detachment}`);
console.log(`   Test 3 Passed: Zero detachment & root anchor invariant verified (detachment=${detachment}).`);

// ==========================================
// Test 4: Coherent Cantilever Waving & Monotonic Lever-Arm Amplitude (No Seaweed S-Waves)
// ==========================================
console.log("-> Test 4: Coherent Cantilever Waving & Monotonic Lever-Arm Amplitude (No Seaweed S-Waves)");
const branchDir = new THREE.Vector3(1, 1, 0).normalize();
const distances = [0, 2, 5, 10, 15, 20];
const branchConfig = { shimmer: 0, wavy: 0, branchMovement: 1.0, overallMovement: 1.0 };

const amplitudes: number[] = [];

for (const d of distances) {
  const pt = root.clone().add(branchDir.clone().multiplyScalar(d));
  let sumSq = 0;
  const steps = 100;
  for (let s = 0; s < steps; s++) {
    const t = (s / steps) * 10.0;
    const disp = evaluateWindDisplacementCPU(pt, root, branchBase, 1.0, 0.0, t, branchConfig);
    const mag = disp.length();
    sumSq += mag * mag;
  }
  const rms = Math.sqrt(sumSq / steps);
  amplitudes.push(rms);
}

// Verify strict monotonic increase of amplitude with distance d from root anchor
assert(amplitudes[0] === 0, `Amplitude at root anchor (d=0) must be 0, got ${amplitudes[0]}`);
for (let i = 1; i < distances.length; i++) {
  assert(
    amplitudes[i] > amplitudes[i - 1],
    `Amplitude must increase strictly monotonically with distance from root anchor: at d=${distances[i]} (${amplitudes[i]}) vs d=${distances[i-1]} (${amplitudes[i-1]})`
  );
}

let sumCosSim = 0;
let countCosSim = 0;
for (let s = 0; s < 60; s++) {
  const t = s * 0.17;
  const refPt = root.clone().add(branchDir.clone().multiplyScalar(5));
  const refDisp = evaluateWindDisplacementCPU(refPt, root, branchBase, 1.0, 0.25, t, branchConfig);
  const refTrans = refDisp.clone().sub(branchDir.clone().multiplyScalar(refDisp.dot(branchDir)));
  if (refTrans.length() < 0.15) continue;
  refTrans.normalize();

  for (const d of [6, 8, 10]) {
    const pt = root.clone().add(branchDir.clone().multiplyScalar(d));
    const disp = evaluateWindDisplacementCPU(pt, root, branchBase, 1.0, 0.25, t, branchConfig);
    const trans = disp.clone().sub(branchDir.clone().multiplyScalar(disp.dot(branchDir)));
    if (trans.length() < 0.15) continue;
    trans.normalize();
    sumCosSim += refTrans.dot(trans);
    countCosSim++;
  }
}
const avgCosSim = countCosSim > 0 ? sumCosSim / countCosSim : 1.0;
assert(
  avgCosSim > 0.85,
  `Expected coherent cantilever waving across branch (avgCosSim > 0.85), got ${avgCosSim}`,
);
console.log(`   Test 4 Passed: Coherent cantilever waving verified (avgCosSim=${avgCosSim.toFixed(6)}, RMS: ${amplitudes.map(a => a.toFixed(4)).join(", ")}).`);

// ==========================================
// Test 5: Independent Layer Modulation by the 4 Dials
// ==========================================
console.log("-> Test 5: Independent Layer Modulation by the 4 Dials");
const evalPt = new THREE.Vector3(20, 40, 20);

// 5a. Shimmer increase
const shimmer0 = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 0, wavy: 0, branchMovement: 0, overallMovement: 1.0 }).length();
const shimmer1 = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 1.5, wavy: 0, branchMovement: 0, overallMovement: 1.0 }).length();
assert(shimmer0 === 0 && shimmer1 > 0, `Shimmer dial must increase displacement energy from 0: ${shimmer0} -> ${shimmer1}`);

// 5b. Wavy increase
const wavy0 = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 0, wavy: 0, branchMovement: 0, overallMovement: 1.0 }).length();
const wavy1 = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 0, wavy: 1.5, branchMovement: 0, overallMovement: 1.0 }).length();
assert(wavy0 === 0 && wavy1 > 0, `Wavy dial must increase displacement energy from 0: ${wavy0} -> ${wavy1}`);

// 5c. BranchMovement increase
const branch0 = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 0, wavy: 0, branchMovement: 0, overallMovement: 1.0 }).length();
const branch1 = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 0, wavy: 0, branchMovement: 1.5, overallMovement: 1.0 }).length();
assert(branch0 === 0 && branch1 > 0, `BranchMovement dial must increase displacement energy from 0: ${branch0} -> ${branch1}`);

// 5d. OverallMovement scaling & power curve
const combinedA = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 1.0, wavy: 1.0, branchMovement: 1.0, overallMovement: 1.0 }).length();
const combinedB = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 1.0, wavy: 1.0, branchMovement: 1.0, overallMovement: 2.0 }).length();
assert(Math.abs(combinedB / combinedA - 2.0) < 0.01, `OverallMovement in linear range [1, 2] must scale displacement proportionally: ${combinedA} * 2 ≈ ${combinedB}`);

const combinedLow = evaluateWindDisplacementCPU(evalPt, root, branchBase, 1.0, 0.0, 1.0, { shimmer: 1.0, wavy: 1.0, branchMovement: 1.0, overallMovement: 0.25 }).length();
const expectedLowRatio = Math.pow(0.25, 1.45);
assert(Math.abs(combinedLow / combinedA - expectedLowRatio) < 0.01, `Low overallMovement (0.25) must scale by pow(0.25, 1.45): ratio ${combinedLow / combinedA} ≈ ${expectedLowRatio}`);
console.log("   Test 5 Passed: Independent layer modulation & low-end curve verified.");

// ==========================================
// Test 6: Shader Hook & Material Compilation Verification
// ==========================================
console.log("-> Test 6: Shader Hook & Material Compilation Verification");

const testMats = [
  new THREE.MeshStandardMaterial(),
  new THREE.ShaderMaterial(),
];

for (const mat of testMats) {
  setupNaturalWindMaterial(mat, false);
  assert(typeof mat.onBeforeCompile === "function", "Material must have onBeforeCompile");

  const mockShader: any = {
    uniforms: {},
    vertexShader: `
      #include <common>
      #include <project_vertex>
      void main() {}
    `,
    fragmentShader: `
      #include <common>
      #include <lights_fragment_begin>
      void main() {}
    `,
  };

  mat.onBeforeCompile(mockShader, {} as any);

  assert(mockShader.uniforms.uWindTime !== undefined, "Uniform uWindTime must be bound");
  assert(mockShader.uniforms.uShimmer !== undefined, "Uniform uShimmer must be bound");
  assert(mockShader.uniforms.uWavy !== undefined, "Uniform uWavy must be bound");
  assert(mockShader.uniforms.uBranchMovement !== undefined, "Uniform uBranchMovement must be bound");
  assert(mockShader.uniforms.uOverallMovement !== undefined, "Uniform uOverallMovement must be bound");
  assert(mockShader.uniforms.uIsAppendage !== undefined, "Uniform uIsAppendage must be bound");
  assert(
    mockShader.vertexShader.includes("computeNaturalWindDisplacement"),
    "Vertex shader must inject computeNaturalWindDisplacement"
  );
}
console.log("   Test 6 Passed: Shader hook and compilation verification complete.");

// ==========================================
// Test 7: Powerful Positive-Only (+0..) LFO Modulation & Per-Cycle Random Influence
// ==========================================
console.log("-> Test 7: Powerful Positive-Only (+0..) LFO Modulation & Per-Cycle Random Influence");
// 7a. Zero overall movement yields zero effective
const lfoZero = computeLfoModulatedOverall({ overallMovement: 0.0, movementLfoSpeed: 1.0, movementLfoDepth: 1.0 });
assert(lfoZero.effectiveOverall === 0.0 && lfoZero.lfoDelta === 0.0, "Zero overallMovement must yield 0 effective");

// 7b. Zero speed or depth yields identity
const lfoZeroSpeed = computeLfoModulatedOverall({ overallMovement: 0.5, movementLfoSpeed: 0.0, movementLfoDepth: 0.5 });
assert(lfoZeroSpeed.effectiveOverall === 0.5 && lfoZeroSpeed.lfoDelta === 0.0, "Zero speed must yield identity");
const lfoZeroDepth = computeLfoModulatedOverall({ overallMovement: 0.5, movementLfoSpeed: 0.5, movementLfoDepth: 0.0 });
assert(lfoZeroDepth.effectiveOverall === 0.5 && lfoZeroDepth.lfoDelta === 0.0, "Zero depth must yield identity");

// 7c. Positive-only swing across full 2*PI cycle (always more wind, never less!)
const overallVal = 0.25;
const speedVal = 0.35;

// 7c-i. Check new default depth = 0.07
let minDeltaNew = Infinity;
let maxDeltaNew = -Infinity;
let minEffectiveNew = Infinity;
let maxEffectiveNew = -Infinity;

for (let p = 0; p <= Math.PI * 2; p += 0.05) {
  const res = computeLfoModulatedOverall({
    overallMovement: overallVal,
    movementLfoSpeed: speedVal,
    movementLfoDepth: 0.07,
    movementLfoPhase: p,
    movementLfoRandom: 50,
  });
  if (res.effectiveOverall < minEffectiveNew) minEffectiveNew = res.effectiveOverall;
  if (res.effectiveOverall > maxEffectiveNew) maxEffectiveNew = res.effectiveOverall;
  if (res.lfoDelta < minDeltaNew) minDeltaNew = res.lfoDelta;
  if (res.lfoDelta > maxDeltaNew) maxDeltaNew = res.lfoDelta;
}

assert(minDeltaNew >= -1e-6, `Expected positive-only LFO delta at depth=0.07 (minDelta >= 0.0), got ${minDeltaNew}`);
assert(minEffectiveNew >= overallVal - 1e-6, `Expected minEffective >= base overall (${overallVal}), got ${minEffectiveNew}`);
assert(maxDeltaNew > 0.10, `Expected positive LFO delta > 0.10 at depth=0.07, got ${maxDeltaNew}`);

// 7c-ii. Check high depth = 0.65
let minDeltaHigh = Infinity;
let maxDeltaHigh = -Infinity;
let minEffectiveHigh = Infinity;
let maxEffectiveHigh = -Infinity;

for (let p = 0; p <= Math.PI * 2; p += 0.05) {
  const res = computeLfoModulatedOverall({
    overallMovement: overallVal,
    movementLfoSpeed: speedVal,
    movementLfoDepth: 0.65,
    movementLfoPhase: p,
    movementLfoRandom: 50,
  });
  if (res.effectiveOverall < minEffectiveHigh) minEffectiveHigh = res.effectiveOverall;
  if (res.effectiveOverall > maxEffectiveHigh) maxEffectiveHigh = res.effectiveOverall;
  if (res.lfoDelta < minDeltaHigh) minDeltaHigh = res.lfoDelta;
  if (res.lfoDelta > maxDeltaHigh) maxDeltaHigh = res.lfoDelta;
}

assert(minDeltaHigh >= -1e-6, `Expected positive-only LFO delta at depth=0.65 (minDelta >= 0.0), got ${minDeltaHigh}`);
assert(maxDeltaHigh > 1.0, `Expected large positive LFO delta (> +1.0) at depth=0.65, got ${maxDeltaHigh}`);
assert(maxEffectiveHigh > 1.25, `Expected peak effectiveOverall > 1.25 from base 0.25 at depth=0.65, got ${maxEffectiveHigh}`);

// 7c-ii. Squashed curved sine peak window & flat baseline lull
const numSamples = 1000;
let flatSamples = 0;
let peakSamples = 0;
let maxUnipolar = 0;
let peakNormPhase = 0;

for (let i = 0; i < numSamples; i++) {
  const normP = i / numSamples;
  const p = normP * Math.PI * 2.0;
  const res = computeLfoModulatedOverall({
    overallMovement: 0.5,
    movementLfoSpeed: 0.35,
    movementLfoDepth: 1.0,
    movementLfoPeak: 0.33,
    movementLfoPhase: p,
    movementLfoRandom: 0,
  });
  if (res.lfoUnipolar === 0 && res.lfoDelta === 0) {
    flatSamples++;
  } else {
    peakSamples++;
    if (res.lfoUnipolar > maxUnipolar) {
      maxUnipolar = res.lfoUnipolar;
      peakNormPhase = normP;
    }
  }
}

const flatFraction = flatSamples / numSamples;
assert(flatFraction >= 0.65 && flatFraction <= 0.69, `Expected ~2/3 flat baseline lull (~67%), got ${(flatFraction * 100).toFixed(1)}%`);
assert(maxUnipolar > 0.99, `Squashed peak should reach > 0.99 unipolar, got ${maxUnipolar}`);
assert(peakNormPhase >= 0.49 && peakNormPhase <= 0.51, `Peak should center at normPhase=0.50, got ${peakNormPhase}`);

// Check rapid ramp-up: reaches >85% of peak within the first 1/3 of the peak window
const oneThirdPeakPhase = (0.335 + 0.33 * 0.33) * Math.PI * 2.0;
const oneThirdRes = computeLfoModulatedOverall({
  overallMovement: 0.5,
  movementLfoSpeed: 0.35,
  movementLfoDepth: 1.0,
  movementLfoPeak: 0.33,
  movementLfoPhase: oneThirdPeakPhase,
  movementLfoRandom: 0,
});
assert(oneThirdRes.lfoUnipolar > 0.85, `Rapid ramp-up should reach > 85% of peak in first 1/3 of peak window, got ${oneThirdRes.lfoUnipolar}`);

// When movementLfoPeak = 1.0, peak spans the full cycle (no flat baseline)
let fullCycleFlatSamples = 0;
for (let i = 1; i < numSamples - 1; i++) {
  const normP = i / numSamples;
  const p = normP * Math.PI * 2.0;
  const res = computeLfoModulatedOverall({
    overallMovement: 0.5,
    movementLfoSpeed: 0.35,
    movementLfoDepth: 1.0,
    movementLfoPeak: 1.0,
    movementLfoPhase: p,
    movementLfoRandom: 0,
  });
  if (res.lfoUnipolar === 0) fullCycleFlatSamples++;
}
assert(fullCycleFlatSamples === 0, `movementLfoPeak=1.0 should have active modulation throughout full cycle, got ${fullCycleFlatSamples} flat samples`);

// 7d. Random % cycle length multiplier & cycle random roll
assert(pickNextLfoCycleLengthMult(0, () => 0.9) === 1.0, "0% random must always yield cycle length mult 1.0");
assert(pickNextLfoCycleRandomRoll(0, () => 0.9) === 0.0, "0% random must yield 0.0 random roll");

const shortCycle = pickNextLfoCycleLengthMult(100, () => 0.0);
const longCycle = pickNextLfoCycleLengthMult(100, () => 1.0);
assert(shortCycle < 0.35 && longCycle > 3.0, `100% random must span wide cycle lengths: short=${shortCycle}, long=${longCycle}`);

const minRoll = pickNextLfoCycleRandomRoll(100, () => 0.0);
const maxRoll = pickNextLfoCycleRandomRoll(100, () => 1.0);
assert(minRoll >= 0.08 && minRoll < 0.10, `Expected minRoll ~0.08, got ${minRoll}`);
assert(maxRoll === 1.0, `Expected maxRoll 1.0, got ${maxRoll}`);

// 7e. Cycle random influence and meter normalization
const zeroRandRes = computeLfoModulatedOverall({ overallMovement: 0.25, movementLfoRandom: 0 });
assert(zeroRandRes.cycleRandomInfluence === 0.0 && zeroRandRes.cycleGustMult === 1.0, "0% random must yield 1.0x gust mult");

const maxRandRes = computeLfoModulatedOverall({ overallMovement: 0.25, movementLfoRandom: 100, movementLfoCycleRand: 1.0 });
assert(Math.abs(maxRandRes.cycleRandomInfluence - 1.0) < 1e-6, `100% random with 1.0 roll must yield 1.0 influence, got ${maxRandRes.cycleRandomInfluence}`);
assert(Math.abs(maxRandRes.cycleGustMult - 1.85) < 1e-6, `100% random with 1.0 roll must yield 1.85x gust mult, got ${maxRandRes.cycleGustMult}`);

console.log(`   Test 7 Passed: Positive-only LFO delta=[+${minDeltaNew.toFixed(3)}, +${maxDeltaNew.toFixed(2)}], effectiveOverall=[${minEffectiveNew.toFixed(3)}, ${maxEffectiveNew.toFixed(3)}], random cycle mult=[${shortCycle.toFixed(2)}x..${longCycle.toFixed(2)}x], gust mult range=[1.00x..1.85x].`);

// ==========================================
// Test 8: Hybridisation Artifacts Unaffected by Wind
// ==========================================
console.log("-> Test 8: Hybridisation Artifacts Unaffected by Wind");
const hybridMat = setupShaderMaterial(
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, wireframe: true }),
  false,
  false,
  false,
);
assert(hybridMat.userData.uOverallMovement.value === 0.0, "Hybrid material uOverallMovement must initialize to 0");
assert(hybridMat.userData.uShimmer.value === 0.0, "Hybrid material uShimmer must initialize to 0");
assert(hybridMat.userData.uWavy.value === 0.0, "Hybrid material uWavy must initialize to 0");
assert(hybridMat.userData.uBranchMovement.value === 0.0, "Hybrid material uBranchMovement must initialize to 0");

const mockHybridShader: any = {
  uniforms: {},
  vertexShader: `
    #include <common>
    #include <color_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    void main() {}
  `,
  fragmentShader: `
    #include <common>
    #include <color_fragment>
    #include <normal_fragment_maps>
    vec4 diffuseColor = vec4( diffuse, opacity );
    #include <opaque_fragment>
    void main() {}
  `,
};
hybridMat.onBeforeCompile(mockHybridShader, {} as any);
assert(
  !mockHybridShader.vertexShader.includes("mvPosition.xyz += computeNaturalWindDisplacement"),
  "Hybrid vertex shader must NOT apply computeNaturalWindDisplacement",
);
assert(
  !mockHybridShader.fragmentShader.includes("shimmerPulse"),
  "Hybrid fragment shader must NOT apply wind shimmerPulse",
);

const mockStemMat = setupShaderMaterial(new THREE.MeshPhysicalMaterial(), false, false, true);
const mockEngine: any = {
  shimmer: 1.5,
  wavy: 1.5,
  branchMovement: 1.5,
  overallMovement: 1.5,
  movementLfoSpeed: 1.0,
  movementLfoDepth: 1.0,
  movementLfoRandom: 80,
  windVelocity: 1.2,
  flutterIntensity: 1.2,
  cylinderMesh: { material: mockStemMat },
  appendages: new Map(),
  hybridMeshes: [{ material: hybridMat }],
};
updateWindMaterialUniforms(mockEngine);
assert(mockStemMat.userData.uOverallMovement.value === 1.5, "Stem material uOverallMovement must remain unmodulated (1.5)");
assert(mockStemMat.userData.uShimmer.value === 1.5, "Stem material uShimmer must remain unmodulated (1.5)");
assert(mockStemMat.userData.uWavy.value === 1.5, "Stem material uWavy must remain unmodulated (1.5)");
assert(hybridMat.userData.uOverallMovement.value === 0.0, "Hybrid material uOverallMovement must remain 0 after updateWindMaterialUniforms");
assert(hybridMat.userData.uShimmer.value === 0.0, "Hybrid material uShimmer must remain 0 after updateWindMaterialUniforms");
assert(hybridMat.userData.uWavy.value === 0.0, "Hybrid material uWavy must remain 0 after updateWindMaterialUniforms");
assert(hybridMat.userData.uBranchMovement.value === 0.0, "Hybrid material uBranchMovement must remain 0 after updateWindMaterialUniforms");

// Verify that across a full LFO cycle, LFO ONLY modulates uBranchMovement, NEVER uShimmer, uWavy, uOverallMovement, or windTime rate
let minBranchUniform = Infinity;
let maxBranchUniform = -Infinity;
for (let p = 0; p <= Math.PI * 2; p += 0.1) {
  mockEngine.movementLfoPhase = p;
  mockEngine.windTime = 10.0;
  updateWindMaterialUniforms(mockEngine);
  const dtLfoOn = mockEngine.windTime - 10.0;
  assert(
    mockStemMat.userData.uShimmer.value === 1.5,
    `LFO must never influence uShimmer: expected 1.5 at phase=${p}, got ${mockStemMat.userData.uShimmer.value}`,
  );
  assert(
    mockStemMat.userData.uWavy.value === 1.5,
    `LFO must never influence uWavy: expected 1.5 at phase=${p}, got ${mockStemMat.userData.uWavy.value}`,
  );
  assert(
    mockStemMat.userData.uOverallMovement.value === 1.5,
    `LFO must never influence uOverallMovement: expected 1.5 at phase=${p}, got ${mockStemMat.userData.uOverallMovement.value}`,
  );
  const bVal = mockStemMat.userData.uBranchMovement.value;
  if (bVal < minBranchUniform) minBranchUniform = bVal;
  if (bVal > maxBranchUniform) maxBranchUniform = bVal;

  // Compare windTime step with LFO depth = 0
  const savedDepth = mockEngine.movementLfoDepth;
  mockEngine.movementLfoDepth = 0.0;
  mockEngine.windTime = 10.0;
  updateWindMaterialUniforms(mockEngine);
  const dtLfoOff = mockEngine.windTime - 10.0;
  mockEngine.movementLfoDepth = savedDepth;
  assert(
    Math.abs(dtLfoOn - dtLfoOff) < 1e-9,
    `LFO must not alter windTime progression for shimmer/wavy: dtLfoOn=${dtLfoOn} vs dtLfoOff=${dtLfoOff}`,
  );
}
assert(
  Math.abs(minBranchUniform - 1.5) < 1e-6 && maxBranchUniform > 2.5,
  `LFO must modulate uBranchMovement above baseline 1.5: min=${minBranchUniform}, max=${maxBranchUniform}`,
);
console.log("   Test 8 Passed: Hybridisation artifacts unaffected, and LFO exclusively modulates uBranchMovement (not shimmer or wavy).");

// ==========================================
// Test 9: Tree & Bush Spawn-Point Anchor Assignment (branchBasePos != rootOrigin)
// ==========================================
console.log("-> Test 9: Tree & Bush Spawn-Point Anchor Assignment");
import { stepTreeArchitecture, createTreeShoot } from "../src/lib/SimulationTreeArchitecture";
import { stepBushTendrilBranching } from "../src/lib/SimulationBushTendrils";

const mockTreeEngine: any = {
  nextAgentId: 100,
  designerMode: true,
  agents: [],
  biomassMap: new Map(),
  maxDOMs: 32000,
  boundarySize: 120,
  onLog: () => {},
};

const treeRootPos = new THREE.Vector3(0, 0, 0);
const trunkForkPos = new THREE.Vector3(0, 18, 0);
const treeAgent: any = {
  id: 1,
  position: trunkForkPos.clone(),
  lastPosition: trunkForkPos.clone(),
  direction: new THREE.Vector3(0, 1, 0),
  genome: { name: "TestOak", archetype: "tree", morphScale: 1.0, minThickness: 0.08 },
  active: true,
  age: 30,
  thickness: 1.2,
  branchDepth: 0,
  treeRoot: treeRootPos.clone(),
  rootOrigin: treeRootPos.clone(),
  branchBasePos: treeRootPos.clone(),
  treeLen: 18.0,
  treeBudget: 18.0,
  treeNextBud: Infinity,
};
const spawnedTreeChildren: any[] = [];
stepTreeArchitecture(mockTreeEngine, treeAgent, spawnedTreeChildren, 1, 0.5);

assert(treeAgent.branchDepth === 1, `Expected crown division k=0 to set branchDepth=1, got ${treeAgent.branchDepth}`);
assert(
  treeAgent.branchBasePos.distanceTo(trunkForkPos) < 1e-5,
  `Expected k=0 crown limb branchBasePos to equal trunkForkPos ${trunkForkPos.toArray()}, got ${treeAgent.branchBasePos.toArray()}`,
);
assert(spawnedTreeChildren.length >= 1, "Expected crown division to spawn sibling limbs");
for (const child of spawnedTreeChildren) {
  assert(
    child.branchBasePos.distanceTo(trunkForkPos) < 1e-5,
    `Expected spawned depth=1 limb branchBasePos to equal trunkForkPos ${trunkForkPos.toArray()}, got ${child.branchBasePos.toArray()}`,
  );
}

// Verify depth=2 sub-branch inherits its parent bough's branchBasePos
const boughTipPos = new THREE.Vector3(8, 25, 4);
const shootDepth2 = createTreeShoot(
  mockTreeEngine,
  treeAgent,
  boughTipPos,
  new THREE.Vector3(1, 1, 0).normalize(),
  1,
  0.5,
  1.0,
  trunkForkPos,
);
assert(
  shootDepth2.branchBasePos.distanceTo(trunkForkPos) < 1e-5,
  `Expected depth>=2 shoot to inherit bough spawn point ${trunkForkPos.toArray()}, got ${shootDepth2.branchBasePos.toArray()}`,
);

// Verify Bush shrub-base cane burst sets branchBasePos to the cane fork point on all 3 canes
const bushRootPos = new THREE.Vector3(-20, 0, 0);
const bushForkPos = new THREE.Vector3(-20, 6, 0);
const bushAgent: any = {
  id: 50,
  position: bushForkPos.clone(),
  lastPosition: bushForkPos.clone(),
  direction: new THREE.Vector3(0, 1, 0),
  genome: { name: "TestBush", archetype: "bush", morphScale: 1.0, minThickness: 0.08 },
  active: true,
  age: 12,
  thickness: 0.9,
  branchDepth: 0,
  rootOrigin: bushRootPos.clone(),
  branchBasePos: bushRootPos.clone(),
  branchDist: 6.0,
  distSinceLastFork: 6.0,
};
const spawnedBushCanes: any[] = [];
const bushCounts = new Map<string, number>([["TestBush", 1]]);
const didBurst = stepBushTendrilBranching(mockTreeEngine, bushAgent, [bushAgent], spawnedBushCanes, bushCounts, false);
assert(didBurst, "Expected bush trunk at dist=6.0 to burst into 3 canes");
assert(
  bushAgent.branchBasePos.distanceTo(bushForkPos) < 1e-5,
  `Expected c=0 bush cane branchBasePos to equal bushForkPos ${bushForkPos.toArray()}, got ${bushAgent.branchBasePos.toArray()}`,
);
assert(spawnedBushCanes.length === 2, `Expected 2 sibling bush canes, got ${spawnedBushCanes.length}`);
for (const cane of spawnedBushCanes) {
  assert(
    cane.branchBasePos.distanceTo(bushForkPos) < 1e-5,
    `Expected sibling bush cane branchBasePos to equal bushForkPos ${bushForkPos.toArray()}, got ${cane.branchBasePos.toArray()}`,
  );
}
console.log("   Test 9 Passed: Tree & Bush spawn-point anchor assignment verified.");

console.log("ALL WIND MOTION & HIERARCHICAL BRANCH TESTS PASSED");
process.exit(0);



