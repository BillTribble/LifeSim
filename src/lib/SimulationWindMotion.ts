import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";

export interface WindMotionConfig {
  shimmer: number;
  wavy: number;
  branchMovement: number;
  overallMovement: number;
  windVelocity?: number;
  flutterIntensity?: number;
}

export function initWindMaterialUniforms(material: THREE.MeshPhysicalMaterial, isAppendage: boolean) {
  if (!material.userData) material.userData = {};
  material.userData.uWindTime = { value: 0.0 };
  material.userData.uShimmer = { value: 0.65 };
  material.userData.uWavy = { value: 0.60 };
  material.userData.uBranchMovement = { value: 0.75 };
  material.userData.uOverallMovement = { value: 0.70 };
  material.userData.uWindVelocity = { value: 0.20 };
  material.userData.uFlutterIntensity = { value: 0.50 };
  material.userData.uIsAppendage = { value: isAppendage ? 1.0 : 0.0 };
}

export function bindWindUniformsToShader(shader: any, material: THREE.MeshPhysicalMaterial) {
  const ud = material.userData;
  shader.uniforms.uWindTime = ud.uWindTime;
  shader.uniforms.uShimmer = ud.uShimmer;
  shader.uniforms.uWavy = ud.uWavy;
  shader.uniforms.uBranchMovement = ud.uBranchMovement;
  shader.uniforms.uOverallMovement = ud.uOverallMovement;
  shader.uniforms.uWindVelocity = ud.uWindVelocity;
  shader.uniforms.uFlutterIntensity = ud.uFlutterIntensity;
  shader.uniforms.uIsAppendage = ud.uIsAppendage;
}

export const WIND_VERTEX_DECLARATIONS = /* glsl */ `
attribute vec4 instanceRootAnchor;
attribute vec4 instanceBranchAnchor;
varying float vShimmerPhase;

uniform float uWindTime;
uniform float uShimmer;
uniform float uWavy;
uniform float uBranchMovement;
uniform float uOverallMovement;
uniform float uWindVelocity;
uniform float uFlutterIntensity;
uniform float uIsAppendage;

vec3 computeNaturalWindDisplacement(vec3 worldPos, vec3 bladeWorldOffset, vec3 attachWorldPos, float hashVal) {
  if (uOverallMovement <= 0.0001 || (uShimmer <= 0.0001 && uWavy <= 0.0001 && uBranchMovement <= 0.0001)) return vec3(0.0);
  float effOverall = (uOverallMovement < 1.0) ? pow(max(uOverallMovement, 0.0), 1.45) : uOverallMovement;
  vec3 structPos = (uIsAppendage >= 0.5) ? attachWorldPos : worldPos;

  vec3 rootPos = instanceRootAnchor.xyz;
  float strainPhase = instanceRootAnchor.w;
  vec3 r0 = structPos - rootPos;
  float d0 = length(r0);

  // Layer 1: Terrestrial Waving Branches (pivoting coherently from branch spawn point branchBasePos)
  // Primary trunks (isLateral == 0) remain stationary under uBranchMovement.
  // Lateral branches (isLateral == 1) pivot as coherent woody limbs around their spawn point
  // with zero spatial traveling S-wave phase lag along the branch.
  vec3 branchBase = instanceBranchAnchor.xyz;
  float isLateral = step(0.05, instanceBranchAnchor.w);
  vec3 r1 = structPos - branchBase;
  float d1 = length(r1);
  float collarEase = d1 / (d1 + 0.85);
  float effScale = isLateral * collarEase / (1.0 + 0.012 * d1);
  vec3 r1Eff = r1 * effScale;

  float branchSeed = dot(branchBase - rootPos, vec3(0.065, 0.045, 0.055)) + strainPhase;
  float branchId = dot(branchBase, vec3(0.17, 0.31, 0.23)) + strainPhase * 0.7;
  float wPhase = uWindTime * 2.15 + branchSeed;
  float gPhase = uWindTime * 0.95 + branchSeed * 0.65 + 0.8;

  // Dominant back-and-forth waving oscillation (vertical bobbing + leeward/windward arc)
  float primaryWave = sin(wPhase) * 0.74 + sin(gPhase) * 0.36;
  // Subtle secondary cross-breeze (~25% amplitude) to avoid both a 1D rail and 360-deg aquatic swirl
  float secondarySway = cos(wPhase * 0.82 + 0.5) * 0.22 + cos(gPhase * 1.15) * 0.12;

  vec3 axisPrimary = normalize(vec3(cos(branchId), 0.28 * sin(branchId * 0.7), sin(branchId)));
  vec3 axisSecondary = normalize(vec3(-sin(branchId), 0.85, cos(branchId) * 0.45));

  vec3 omega = axisPrimary * (primaryWave * 0.22) + axisSecondary * (secondarySway * 0.22);
  vec3 sway1 = cross(omega, r1Eff);
  // Radial arc-length preservation around branchBase so waving branches never stretch
  sway1 -= r1 * (dot(sway1, sway1) / (2.0 * max(d1 * d1, 4.0)));
  vec3 branchDisp = sway1 * (uBranchMovement * effOverall);

  // Layer 2: Natural Cantilever Bending in the Wind (stiff woody lower trunk, supple outer canopy flex)
  float wavyEnv = smoothstep(0.0, 10.0, d0) * (0.42 + 0.58 * smoothstep(0.0, 18.0, d0));
  float wPhase1 = uWindTime * 2.4 - d0 * 0.075 + dot(structPos, vec3(0.06, 0.04, 0.05)) + strainPhase;
  float wPhase2 = uWindTime * 3.6 - d0 * 0.11 + dot(structPos, vec3(-0.08, 0.06, -0.07));
  float wGust = sin(wPhase1) * 0.68 + sin(wPhase2) * 0.32;
  float wCross = cos(wPhase1 * 0.85 + 0.7) * 0.28 + sin(wPhase2 * 0.95) * 0.16;
  vec3 wavyWave = vec3(
    wGust * 0.82 + wCross * 0.25,
    -abs(wGust) * 0.26 + sin(wPhase2 * 0.9) * 0.14,
    wGust * 0.58 - wCross * 0.35
  );
  vec3 wavyDisp = wavyWave * (wavyEnv * uWavy * (1.0 + uWindVelocity * 0.3) * effOverall * 0.85);

  float tipDist = clamp(length(bladeWorldOffset), 0.0, 5.0);
  if (uIsAppendage >= 0.5) {
    float localWPhase = uWindTime * 4.2 + hashVal * 19.0 + dot(bladeWorldOffset, vec3(0.55, 0.70, 0.55));
    vec3 localBladeWave = vec3(sin(localWPhase), cos(localWPhase * 1.1) * 0.65, cos(localWPhase * 0.85)) *
      (tipDist * uWavy * (1.0 + uWindVelocity * 0.3) * effOverall * 0.22);
    wavyDisp += localBladeWave;
  }

  // Layer 3: High-Frequency Canopy Shimmer & Leaf Tremble
  float canopyReach = smoothstep(2.0, 10.0, d0);
  float sPhase = uWindTime * 15.0 + strainPhase * 3.0 + dot(structPos, vec3(0.95, 1.25, 1.05));
  float sPhase2 = uWindTime * 21.0 + dot(structPos, vec3(-1.35, 1.05, 1.20));
  vec3 canopyShimmer = vec3(
    sin(sPhase) * 0.6 + cos(sPhase2) * 0.4,
    cos(sPhase * 1.25) * 0.55 + sin(sPhase2 * 0.9) * 0.35,
    cos(sPhase * 0.9) * 0.6 + sin(sPhase2 * 1.1) * 0.4
  ) * (canopyReach * uShimmer * (1.0 + uFlutterIntensity * 0.3) * effOverall * 0.32);

  if (uIsAppendage >= 0.5) {
    float appShimmerPhase = uWindTime * 19.5 + hashVal * 47.0 + dot(bladeWorldOffset, vec3(2.5, 2.9, 2.5));
    vec3 appShimmer = vec3(
      sin(appShimmerPhase),
      cos(appShimmerPhase * 1.15) * 0.85,
      sin(appShimmerPhase * 0.8)
    ) * (tipDist * uShimmer * (1.0 + uFlutterIntensity * 0.3) * effOverall * 0.25);
    canopyShimmer += appShimmer;
  }

  return branchDisp + wavyDisp + canopyShimmer;
}
`;

export const WIND_FRAGMENT_DECLARATIONS = /* glsl */ `
varying float vShimmerPhase;
uniform float uWindTime;
uniform float uShimmer;
uniform float uOverallMovement;
`;

export const WIND_FRAGMENT_SHIMMER = /* glsl */ `
float shimmerPulse = pow(max(0.0, sin(uWindTime * 6.0 + vShimmerPhase)), 4.0) * (uShimmer * uOverallMovement * 0.18);
diffuseColor.rgb += mix(diffuseColor.rgb, vec3(0.95, 1.0, 0.88), 0.6) * shimmerPulse;
`;

export function evaluateNaturalWindOffset(
  worldPos: THREE.Vector3,
  rootAnchor: THREE.Vector4,
  branchAnchor: THREE.Vector4,
  windTime: number,
  config: WindMotionConfig,
  isAppendage = false,
  rawLocalPos = new THREE.Vector3(),
  attachWorldPos?: THREE.Vector3,
  hashVal = 0.5,
): THREE.Vector3 {
  const overall = config.overallMovement;
  if (overall <= 0.0001 || (config.shimmer <= 0.0001 && config.wavy <= 0.0001 && config.branchMovement <= 0.0001)) {
    return new THREE.Vector3(0, 0, 0);
  }
  const effOverall = overall < 1.0 ? Math.pow(Math.max(overall, 0.0), 1.45) : overall;

  const structPos = isAppendage && attachWorldPos ? attachWorldPos : worldPos;
  const rootPos = new THREE.Vector3(rootAnchor.x, rootAnchor.y, rootAnchor.z);
  const strainPhase = rootAnchor.w;
  const r0 = new THREE.Vector3().subVectors(structPos, rootPos);
  const d0 = r0.length();

  // Layer 1: Terrestrial Waving Branches (pivoting coherently from branch spawn point branchBasePos)
  const branchBase = new THREE.Vector3(branchAnchor.x, branchAnchor.y, branchAnchor.z);
  const isLateral = branchAnchor.w >= 0.05 ? 1.0 : 0.0;
  const r1 = new THREE.Vector3().subVectors(structPos, branchBase);
  const d1 = r1.length();
  const collarEase = d1 / (d1 + 0.85);
  const effScale = (isLateral * collarEase) / (1.0 + 0.012 * d1);
  const r1Eff = r1.clone().multiplyScalar(effScale);

  const branchOffset = new THREE.Vector3().subVectors(branchBase, rootPos);
  const branchSeed = branchOffset.dot(new THREE.Vector3(0.065, 0.045, 0.055)) + strainPhase;
  const branchId = branchBase.dot(new THREE.Vector3(0.17, 0.31, 0.23)) + strainPhase * 0.7;
  const wPhase = windTime * 2.15 + branchSeed;
  const gPhase = windTime * 0.95 + branchSeed * 0.65 + 0.8;

  const primaryWave = Math.sin(wPhase) * 0.74 + Math.sin(gPhase) * 0.36;
  const secondarySway = Math.cos(wPhase * 0.82 + 0.5) * 0.22 + Math.cos(gPhase * 1.15) * 0.12;

  const axisPrimary = new THREE.Vector3(
    Math.cos(branchId),
    0.28 * Math.sin(branchId * 0.7),
    Math.sin(branchId),
  ).normalize();
  const axisSecondary = new THREE.Vector3(
    -Math.sin(branchId),
    0.85,
    Math.cos(branchId) * 0.45,
  ).normalize();

  const omega = axisPrimary
    .multiplyScalar(primaryWave * 0.22)
    .add(axisSecondary.multiplyScalar(secondarySway * 0.22));
  const sway1 = new THREE.Vector3().crossVectors(omega, r1Eff);
  sway1.sub(r1.clone().multiplyScalar(sway1.lengthSq() / (2.0 * Math.max(d1 * d1, 4.0))));
  const branchDisp = sway1.multiplyScalar(config.branchMovement * effOverall);

  const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
  const wavyEnv = smoothstep(0.0, 10.0, d0) * (0.42 + 0.58 * smoothstep(0.0, 18.0, d0));
  const wPhase1 = windTime * 2.4 - d0 * 0.075 + structPos.dot(new THREE.Vector3(0.06, 0.04, 0.05)) + strainPhase;
  const wPhase2 = windTime * 3.6 - d0 * 0.11 + structPos.dot(new THREE.Vector3(-0.08, 0.06, -0.07));
  const wGust = Math.sin(wPhase1) * 0.68 + Math.sin(wPhase2) * 0.32;
  const wCross = Math.cos(wPhase1 * 0.85 + 0.7) * 0.28 + Math.sin(wPhase2 * 0.95) * 0.16;
  const wavyWave = new THREE.Vector3(
    wGust * 0.82 + wCross * 0.25,
    -Math.abs(wGust) * 0.26 + Math.sin(wPhase2 * 0.9) * 0.14,
    wGust * 0.58 - wCross * 0.35,
  );
  const windVel = config.windVelocity ?? 0.2;
  const flutterInt = config.flutterIntensity ?? 0.5;
  const wavyDisp = wavyWave.multiplyScalar(wavyEnv * config.wavy * (1.0 + windVel * 0.3) * effOverall * 0.85);

  const tipDist = Math.max(0.0, Math.min(5.0, rawLocalPos.length()));
  if (isAppendage) {
    const localWPhase = windTime * 4.2 + hashVal * 19.0 + rawLocalPos.dot(new THREE.Vector3(0.55, 0.70, 0.55));
    const localBladeWave = new THREE.Vector3(
      Math.sin(localWPhase),
      Math.cos(localWPhase * 1.1) * 0.65,
      Math.cos(localWPhase * 0.85),
    ).multiplyScalar(tipDist * config.wavy * (1.0 + windVel * 0.3) * effOverall * 0.22);
    wavyDisp.add(localBladeWave);
  }

  const canopyReach = smoothstep(2.0, 10.0, d0);
  const sPhase = windTime * 15.0 + strainPhase * 3.0 + structPos.dot(new THREE.Vector3(0.95, 1.25, 1.05));
  const sPhase2 = windTime * 21.0 + structPos.dot(new THREE.Vector3(-1.35, 1.05, 1.20));
  const canopyShimmer = new THREE.Vector3(
    Math.sin(sPhase) * 0.6 + Math.cos(sPhase2) * 0.4,
    Math.cos(sPhase * 1.25) * 0.55 + Math.sin(sPhase2 * 0.9) * 0.35,
    Math.cos(sPhase * 0.9) * 0.6 + Math.sin(sPhase2 * 1.1) * 0.4,
  ).multiplyScalar(canopyReach * config.shimmer * (1.0 + flutterInt * 0.3) * effOverall * 0.32);

  if (isAppendage) {
    const appPhase = windTime * 19.5 + hashVal * 47.0 + rawLocalPos.dot(new THREE.Vector3(2.5, 2.9, 2.5));
    const appShimmer = new THREE.Vector3(
      Math.sin(appPhase),
      Math.cos(appPhase * 1.15) * 0.85,
      Math.sin(appPhase * 0.8),
    ).multiplyScalar(tipDist * config.shimmer * (1.0 + flutterInt * 0.3) * effOverall * 0.25);
    canopyShimmer.add(appShimmer);
  }

  return branchDisp.add(wavyDisp).add(canopyShimmer);
}

export function pickNextLfoCycleLengthMult(
  randomPct: number,
  rng: () => number = Math.random,
): number {
  const clampedPct = Math.max(0, Math.min(100, randomPct ?? 0));
  const randNorm = clampedPct / 100.0;
  if (randNorm <= 0.0001) return 1.0;
  // Asymmetric organic wind spread: at 100% random, cycle length varies from ~0.26x (rapid gust) to ~3.8x (long drawn-out breeze/lull)
  const u = rng() * 2.0 - 1.0; // [-1, +1]
  return Math.pow(3.8, u * randNorm);
}

export function pickNextLfoCycleRandomRoll(
  randomPct: number,
  rng: () => number = Math.random,
): number {
  const clampedPct = Math.max(0, Math.min(100, randomPct ?? 0));
  if (clampedPct <= 0.0001) return 0.0;
  return 0.08 + 0.92 * rng();
}

export function computeLfoModulatedOverall(engine: {
  overallMovement?: number;
  movementLfoSpeed?: number;
  movementLfoDepth?: number;
  movementLfoPeak?: number;
  movementLfoRandom?: number;
  movementLfoPhase?: number;
  movementLfoCycleMult?: number;
  movementLfoCycleRand?: number;
}): {
  effectiveOverall: number;
  lfoMult: number;
  lfoUnipolar: number;
  lfoBipolar: number;
  lfoDelta: number;
  lfoMeterNorm: number;
  cycleLengthMult: number;
  cycleRandomInfluence: number;
  cycleGustMult: number;
  cycleRandomMeterNorm: number;
} {
  const overall = engine.overallMovement ?? 0.40;
  const cycleLengthMult = engine.movementLfoCycleMult ?? 1.0;
  const randNorm = Math.max(0, Math.min(100, engine.movementLfoRandom ?? 73)) / 100.0;
  const rawCycleRand = randNorm <= 0.0001 ? 0.0 : (engine.movementLfoCycleRand ?? 0.65);
  const cycleRandomInfluence = Math.max(0.0, Math.min(1.0, rawCycleRand * randNorm));
  const cycleGustMult = 1.0 + cycleRandomInfluence * 0.85;
  const cycleRandomMeterNorm = cycleRandomInfluence;

  if (overall <= 0.0001) {
    return {
      effectiveOverall: 0.0,
      lfoMult: 1.0,
      lfoUnipolar: 0.0,
      lfoBipolar: 0.0,
      lfoDelta: 0.0,
      lfoMeterNorm: 0.0,
      cycleLengthMult,
      cycleRandomInfluence,
      cycleGustMult,
      cycleRandomMeterNorm,
    };
  }
  const lfoSpeed = engine.movementLfoSpeed ?? 0.28;
  const lfoDepth = engine.movementLfoDepth ?? 0.07;
  if (lfoSpeed <= 0.0001 || lfoDepth <= 0.0001) {
    return {
      effectiveOverall: overall,
      lfoMult: 1.0,
      lfoUnipolar: 0.0,
      lfoBipolar: 0.0,
      lfoDelta: 0.0,
      lfoMeterNorm: 0.0,
      cycleLengthMult,
      cycleRandomInfluence,
      cycleGustMult,
      cycleRandomMeterNorm,
    };
  }
  const peakWidth = Math.max(0.05, Math.min(1.0, engine.movementLfoPeak ?? 0.48));
  const TWO_PI = Math.PI * 2.0;
  const rawPhase = engine.movementLfoPhase ?? 0.0;
  const normPhase = (((rawPhase % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI; // [0, 1)
  const flatHalf = 0.5 * (1.0 - peakWidth);
  const peakStart = flatHalf;
  const peakEnd = 1.0 - flatHalf;
  let lfoUnipolar = 0.0;
  if (normPhase > peakStart && normPhase < peakEnd && peakWidth > 0.0001) {
    const localU = (normPhase - peakStart) / peakWidth; // [0, 1] across the squashed peak
    const localTheta = localU * TWO_PI; // [0, 2*PI]
    // Rapid ramp-up (~first 1/3 of peak window, ~1s) followed by smooth curved sine drop-down
    const skewedTheta = localTheta + 0.38 * Math.sin(localTheta);
    lfoUnipolar = Math.max(0.0, Math.min(1.0, 0.5 * (1.0 - Math.cos(skewedTheta))));
  }

  const baseSwing = lfoDepth * 1.60 + overall * lfoDepth * 0.50;
  const lfoSwing = baseSwing * cycleGustMult;
  const lfoDelta = lfoUnipolar * lfoSwing; // strictly >= 0 (POSITIVE ONLY - more wind!)
  const effectiveOverall = overall + lfoDelta; // strictly >= overall
  const lfoMult = overall > 0.0001 ? effectiveOverall / overall : 1.0;
  const lfoMeterNorm = Math.max(
    0.0,
    Math.min(1.0, lfoUnipolar * Math.min(1.0, (lfoDepth / 0.85) * (0.75 + 0.25 * cycleGustMult)))
  );

  return {
    effectiveOverall,
    lfoMult,
    lfoUnipolar,
    lfoBipolar: lfoUnipolar,
    lfoDelta,
    lfoMeterNorm,
    cycleLengthMult,
    cycleRandomInfluence,
    cycleGustMult,
    cycleRandomMeterNorm,
  };
}

export function updateWindMaterialUniforms(engine: SimulationEngine) {
  const shimmer = engine.shimmer ?? 0.34;
  const wavy = engine.wavy ?? 0.40;
  const branchMovement = engine.branchMovement ?? 0.31;
  const overallMovement = engine.overallMovement ?? 0.40;
  const anyActive = overallMovement > 0.0001 && (shimmer > 0.0001 || wavy > 0.0001 || branchMovement > 0.0001);

  const lfoSpeed = engine.movementLfoSpeed ?? 0.28;
  const lfoDepth = engine.movementLfoDepth ?? 0.07;
  const lfoRandom = engine.movementLfoRandom ?? 73;

  if (lfoRandom <= 0.0001) {
    engine.movementLfoCycleMult = 1.0;
    engine.movementLfoCycleRand = 0.0;
  } else if (!engine.movementLfoCycleRand || engine.movementLfoCycleRand <= 0) {
    engine.movementLfoCycleMult = pickNextLfoCycleLengthMult(lfoRandom);
    engine.movementLfoCycleRand = pickNextLfoCycleRandomRoll(lfoRandom);
  } else if (!engine.movementLfoCycleMult || engine.movementLfoCycleMult <= 0) {
    engine.movementLfoCycleMult = 1.0;
  }

  if (anyActive && lfoSpeed > 0.0001 && lfoDepth > 0.0001) {
    const baseStep = 0.004 + lfoSpeed * 0.036;
    const cycleMult = engine.movementLfoCycleMult || 1.0;
    const nextPhase = (engine.movementLfoPhase || 0) + baseStep / cycleMult;
    const TWO_PI = Math.PI * 2.0;
    if (nextPhase >= TWO_PI) {
      engine.movementLfoPhase = nextPhase % TWO_PI;
      engine.movementLfoCycleMult = pickNextLfoCycleLengthMult(lfoRandom);
      engine.movementLfoCycleRand = pickNextLfoCycleRandomRoll(lfoRandom);
      engine.movementLfoCycleCount = (engine.movementLfoCycleCount || 0) + 1;
    } else {
      engine.movementLfoPhase = nextPhase;
    }
  }

  const { effectiveOverall } = computeLfoModulatedOverall(engine);

  if (engine.windTime === undefined) {
    engine.windTime = 0.0;
  }
  if (anyActive) {
    engine.windTime += 0.024 * (0.20 + 0.90 * Math.min(3.5, effectiveOverall));
  }

  const mats: (THREE.MeshPhysicalMaterial | undefined)[] = [
    engine.cylinderMesh?.material as THREE.MeshPhysicalMaterial,
    engine.appendageMaterial,
    engine.appendages.get("leaves")?.mesh?.material as THREE.MeshPhysicalMaterial,
  ];

  for (const mat of mats) {
    if (!mat || !mat.userData?.uWindTime) continue;
    mat.userData.uWindTime.value = engine.windTime;
    mat.userData.uShimmer.value = shimmer;
    mat.userData.uWavy.value = wavy;
    mat.userData.uBranchMovement.value = branchMovement;
    mat.userData.uOverallMovement.value = effectiveOverall;
    mat.userData.uWindVelocity.value = engine.windVelocity ?? 0.20;
    mat.userData.uFlutterIntensity.value = engine.flutterIntensity ?? 0.50;
  }

  // Hybridisation artifacts must never be affected by wind
  if (engine.hybridMeshes?.length > 0) {
    const hybridMat = engine.hybridMeshes[0]?.material as THREE.MeshPhysicalMaterial | undefined;
    if (hybridMat?.userData?.uOverallMovement) {
      hybridMat.userData.uOverallMovement.value = 0.0;
      hybridMat.userData.uShimmer.value = 0.0;
      hybridMat.userData.uWavy.value = 0.0;
      hybridMat.userData.uBranchMovement.value = 0.0;
      hybridMat.userData.uWindVelocity.value = 0.0;
      hybridMat.userData.uFlutterIntensity.value = 0.0;
    }
  }
}

export function evaluateWindDisplacementCPU(
  worldPos: THREE.Vector3,
  rootOrigin: THREE.Vector3,
  branchBasePos: THREE.Vector3,
  isLateral: number,
  strainPhase: number,
  time: number,
  config: WindMotionConfig,
): THREE.Vector3 {
  const rootAnchor = new THREE.Vector4(rootOrigin.x, rootOrigin.y, rootOrigin.z, strainPhase);
  const branchAnchor = new THREE.Vector4(branchBasePos.x, branchBasePos.y, branchBasePos.z, isLateral);
  return evaluateNaturalWindOffset(worldPos, rootAnchor, branchAnchor, time, config);
}

export function setupNaturalWindMaterial(material: any, isAppendage = false) {
  initWindMaterialUniforms(material, isAppendage);
  const origOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: any, renderer: any) => {
    if (!shader.uniforms) shader.uniforms = {};
    bindWindUniformsToShader(shader, material);
    if (shader.vertexShader) {
      if (shader.vertexShader.includes("#include <common>")) {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>\n${WIND_VERTEX_DECLARATIONS}`
        );
      } else {
        shader.vertexShader = `${WIND_VERTEX_DECLARATIONS}\n${shader.vertexShader}`;
      }
      if (shader.vertexShader.includes("#include <project_vertex>")) {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <project_vertex>",
          `#include <project_vertex>\n// Natural wind displacement hook`
        );
      }
    }
    if (shader.fragmentShader) {
      if (shader.fragmentShader.includes("#include <common>")) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>\n${WIND_FRAGMENT_DECLARATIONS}`
        );
      }
      if (shader.fragmentShader.includes("#include <lights_fragment_begin>")) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <lights_fragment_begin>",
          `#include <lights_fragment_begin>\n${WIND_FRAGMENT_SHIMMER}`
        );
      }
    }
    if (origOnBeforeCompile) {
      origOnBeforeCompile(shader, renderer);
    }
  };
  return material;
}
