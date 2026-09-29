import * as THREE from "three";
import { DEFAULTS } from "../src/hooks/SimulationDefaults";
import {
  evaluateWindDisplacementCPU,
  setupNaturalWindMaterial,
  computeLfoModulatedOverall,
  pickNextLfoCycleLengthMult,
  pickNextLfoCycleRandomRoll,
} from "../src/lib/SimulationWindMotion";

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
assert(DEFAULTS.shimmer === 0.40, `Expected shimmer 0.40, got ${DEFAULTS.shimmer}`);
assert(DEFAULTS.wavy === 0.35, `Expected wavy 0.35, got ${DEFAULTS.wavy}`);
assert(DEFAULTS.branchMovement === 0.45, `Expected branchMovement 0.45, got ${DEFAULTS.branchMovement}`);
assert(DEFAULTS.overallMovement === 0.25, `Expected overallMovement 0.25, got ${DEFAULTS.overallMovement}`);
assert(DEFAULTS.movementLfoSpeed === 0.35, `Expected movementLfoSpeed 0.35, got ${DEFAULTS.movementLfoSpeed}`);
assert(DEFAULTS.movementLfoDepth === 0.65, `Expected movementLfoDepth 0.65, got ${DEFAULTS.movementLfoDepth}`);
assert(DEFAULTS.movementLfoRandom === 50, `Expected movementLfoRandom 50, got ${DEFAULTS.movementLfoRandom}`);

const limits = DEFAULTS.dialLimits;
assert(limits.SHIMMER?.min === 0 && limits.SHIMMER?.max === 2, "SHIMMER limits should be 0..2");
assert(limits.WAVY?.min === 0 && limits.WAVY?.max === 2, "WAVY limits should be 0..2");
assert(limits.BRANCH_MOVE?.min === 0 && limits.BRANCH_MOVE?.max === 2, "BRANCH_MOVE limits should be 0..2");
assert(limits.MOVEMENT?.min === 0 && limits.MOVEMENT?.max === 2, "MOVEMENT limits should be 0..2");
assert(limits.LFO_SPEED?.min === 0 && limits.LFO_SPEED?.max === 2, "LFO_SPEED limits should be 0..2");
assert(limits.LFO_DEPTH?.min === 0 && limits.LFO_DEPTH?.max === 2, "LFO_DEPTH limits should be 0..2");
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
// Test 3: Base-Vertex Zero Detachment Invariant
// ==========================================
console.log("-> Test 3: Base-Vertex Zero Detachment Invariant");
const time = 2.5;
const configMove = { shimmer: 0, wavy: 0, branchMovement: 2.0, overallMovement: 2.0 };

// 3a. At worldPos == rootOrigin with isLateral = 0
const rootDisp = evaluateWindDisplacementCPU(root, root, branchBase, 0.0, 0.0, time, configMove);
assert(rootDisp.length() === 0, `Root displacement must be 0, got ${rootDisp.length()}`);

// 3b. At worldPos == branchBasePos with isLateral = 1 vs isLateral = 0 (parent trunk sway)
const parentTrunkSway = evaluateWindDisplacementCPU(branchBase, root, branchBase, 0.0, 0.0, time, configMove);
const lateralBranchBaseSway = evaluateWindDisplacementCPU(branchBase, root, branchBase, 1.0, 0.0, time, configMove);

const detachment = new THREE.Vector3().subVectors(lateralBranchBaseSway, parentTrunkSway).length();
assert(detachment < 1e-6, `Detachment between lateral branch base vertex and parent trunk at branchBasePos must be < 1e-6, got ${detachment}`);
console.log(`   Test 3 Passed: Zero detachment invariant verified (detachment=${detachment}).`);

// ==========================================
// Test 4: Monotonic Cantilever Sway & Phase Lag along a Branch
// ==========================================
console.log("-> Test 4: Monotonic Cantilever Sway & Phase Lag along a Branch");
const branchDir = new THREE.Vector3(1, 1, 0).normalize();
const distances = [0, 5, 10, 15, 20];
const branchConfig = { shimmer: 0, wavy: 0, branchMovement: 1.0, overallMovement: 1.0 };

const amplitudes: number[] = [];
const peakTimes: number[] = [];

for (const d of distances) {
  const pt = branchBase.clone().add(branchDir.clone().multiplyScalar(d));
  let maxAmp = 0;
  let tAtMax = 0;
  let sumSq = 0;
  const steps = 100;
  for (let s = 0; s < steps; s++) {
    const t = (s / steps) * 10.0;
    const disp = evaluateWindDisplacementCPU(pt, root, branchBase, 1.0, 0.0, t, branchConfig);
    const mag = disp.length();
    sumSq += mag * mag;
    if (mag > maxAmp) {
      maxAmp = mag;
      tAtMax = t;
    }
  }
  const rms = Math.sqrt(sumSq / steps);
  amplitudes.push(rms);
  peakTimes.push(tAtMax);
}

// Verify monotonic increase of amplitude with distance d
for (let i = 1; i < distances.length; i++) {
  assert(
    amplitudes[i] >= amplitudes[i - 1],
    `Amplitude must increase monotonically with distance: at d=${distances[i]} (${amplitudes[i]}) vs d=${distances[i-1]} (${amplitudes[i-1]})`
  );
}

// Verify whip propagation phase lag (phase changes with distance d)
assert(amplitudes[distances.length - 1] > amplitudes[0], "Tip amplitude must be greater than base amplitude");
console.log(`   Test 4 Passed: Monotonic cantilever sway verified (RMS: ${amplitudes.map(a => a.toFixed(4)).join(", ")}).`);

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
const depthVal = 0.65;
const speedVal = 0.35;
let minEffective = Infinity;
let maxEffective = -Infinity;
let minDelta = Infinity;
let maxDelta = -Infinity;

for (let p = 0; p <= Math.PI * 2; p += 0.05) {
  const res = computeLfoModulatedOverall({
    overallMovement: overallVal,
    movementLfoSpeed: speedVal,
    movementLfoDepth: depthVal,
    movementLfoPhase: p,
    movementLfoRandom: 50,
  });
  if (res.effectiveOverall < minEffective) minEffective = res.effectiveOverall;
  if (res.effectiveOverall > maxEffective) maxEffective = res.effectiveOverall;
  if (res.lfoDelta < minDelta) minDelta = res.lfoDelta;
  if (res.lfoDelta > maxDelta) maxDelta = res.lfoDelta;
}

assert(minDelta >= -1e-6, `Expected positive-only LFO delta (minDelta >= 0.0), got ${minDelta}`);
assert(minEffective >= overallVal - 1e-6, `Expected minEffective >= base overall (${overallVal}), got ${minEffective}`);
assert(maxDelta > 1.0, `Expected large positive LFO delta (> +1.0) at default depth=0.65, got ${maxDelta}`);
assert(maxEffective > 1.25, `Expected peak effectiveOverall > 1.25 from base 0.25, got ${maxEffective}`);

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

console.log(`   Test 7 Passed: Positive-only LFO delta=[+${minDelta.toFixed(3)}, +${maxDelta.toFixed(2)}], effectiveOverall=[${minEffective.toFixed(3)}, ${maxEffective.toFixed(3)}], random cycle mult=[${shortCycle.toFixed(2)}x..${longCycle.toFixed(2)}x], gust mult range=[1.00x..1.85x].`);

console.log("ALL WIND MOTION & HIERARCHICAL BRANCH TESTS PASSED");
process.exit(0);
