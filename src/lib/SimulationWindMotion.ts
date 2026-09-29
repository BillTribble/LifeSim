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

  // Layer 1: Fluid Hierarchical Branch Movement (pivoting from rootOrigin and branchBasePos)
  vec3 rootPos = instanceRootAnchor.xyz;
  float strainPhase = instanceRootAnchor.w;
  vec3 r0 = structPos - rootPos;
  float d0 = length(r0);
  float d0Norm = clamp(d0 / 14.0, 0.0, 2.5);
  float bend0 = (d0Norm * d0Norm) / (1.0 + 0.35 * d0Norm);
  float phase0 = uWindTime * 2.1 + strainPhase - d0 * 0.18;
  float gust0 = uWindTime * 0.95 + strainPhase * 1.7 - d0 * 0.10;
  vec3 dir0 = d0 > 0.001 ? (r0 / d0) : vec3(0.0, 1.0, 0.0);
  vec3 swayDir0 = vec3(
    sin(phase0) * 0.75 + sin(gust0) * 0.35,
    0.38 * cos(phase0 * 1.25) + 0.22 * sin(gust0 * 0.9),
    cos(phase0 * 0.85) * 0.75 + cos(gust0 * 1.1) * 0.35
  );
  swayDir0 -= dir0 * dot(swayDir0, dir0);
  float swayLen0 = length(swayDir0);
  if (swayLen0 > 0.001) swayDir0 /= swayLen0;
  vec3 sway0 = swayDir0 * (bend0 * 1.15);
  sway0 -= dir0 * (dot(sway0, sway0) / (2.0 * max(d0, 4.0)));

  // Secondary lateral branch sway pivoting from branchBasePos (instanceBranchAnchor.xyz)
  // Strictly 0 at d1=0 so child branches stay 100% welded to their parent stem at the fork!
  vec3 branchBase = instanceBranchAnchor.xyz;
  float isLateral = step(0.05, instanceBranchAnchor.w);
  vec3 r1 = structPos - branchBase;
  float d1 = length(r1);
  float d1Norm = clamp(d1 / 7.5, 0.0, 2.5);
  float bend1 = isLateral * ((d1Norm * d1Norm) / (1.0 + 0.32 * d1Norm));
  float branchSeed = dot(branchBase, vec3(0.19, 0.43, 0.31));
  float phase1 = uWindTime * 3.1 + branchSeed - d1 * 0.32;
  vec3 dir1 = d1 > 0.001 ? (r1 / d1) : vec3(0.0, 1.0, 0.0);
  vec3 swayDir1 = vec3(cos(phase1 * 1.1), 0.45 * sin(phase1 * 0.9), sin(phase1));
  swayDir1 -= dir1 * dot(swayDir1, dir1);
  float swayLen1 = length(swayDir1);
  if (swayLen1 > 0.001) swayDir1 /= swayLen1;
  vec3 sway1 = swayDir1 * (bend1 * 0.95);
  sway1 -= dir1 * (dot(sway1, sway1) / (2.0 * max(d1, 3.0)));
  vec3 branchDisp = (sway0 + sway1) * (uBranchMovement * effOverall);

  // Layer 2: Continuous Traveling Wavy Undulation (S-curve ripples along stems & foliage)
  float wavyEnv = smoothstep(0.0, 3.0, d0);
  float wPhase1 = uWindTime * 3.8 - d0 * 0.32 + dot(structPos, vec3(0.26, 0.22, 0.24)) + strainPhase;
  float wPhase2 = uWindTime * 5.6 - d0 * 0.48 + dot(structPos, vec3(-0.35, 0.31, -0.28));
  float wPhase3 = uWindTime * 7.5 + dot(structPos, vec3(0.52, -0.44, 0.46));
  vec3 wavyWave = vec3(
    sin(wPhase1) * 0.55 + sin(wPhase2) * 0.30 + cos(wPhase3) * 0.15,
    cos(wPhase1 * 0.9) * 0.42 + sin(wPhase2 * 1.1) * 0.28,
    cos(wPhase1 * 1.1) * 0.52 + cos(wPhase2 * 0.85) * 0.30
  );
  vec3 wavyDisp = wavyWave * (wavyEnv * uWavy * (1.0 + uWindVelocity * 0.3) * effOverall * 0.75);

  float tipDist = clamp(length(bladeWorldOffset), 0.0, 5.0);
  if (uIsAppendage >= 0.5) {
    float localWPhase = uWindTime * 6.0 + hashVal * 19.0 + dot(bladeWorldOffset, vec3(1.2, 1.5, 1.2));
    vec3 localBladeWave = vec3(sin(localWPhase), cos(localWPhase * 1.15) * 0.7, cos(localWPhase * 0.85)) *
      (tipDist * uWavy * (1.0 + uWindVelocity * 0.3) * effOverall * 0.22);
    wavyDisp += localBladeWave;
  }

  // Layer 3: High-Frequency Canopy Shimmer & Leaf Tremble
  float canopyReach = smoothstep(1.5, 9.0, d0);
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
  const d0Norm = Math.max(0.0, Math.min(2.5, d0 / 14.0));
  const bend0 = (d0Norm * d0Norm) / (1.0 + 0.35 * d0Norm);
  const phase0 = windTime * 2.1 + strainPhase - d0 * 0.18;
  const gust0 = windTime * 0.95 + strainPhase * 1.7 - d0 * 0.10;
  const dir0 = d0 > 0.001 ? r0.clone().divideScalar(d0) : new THREE.Vector3(0, 1, 0);
  let swayDir0 = new THREE.Vector3(
    Math.sin(phase0) * 0.75 + Math.sin(gust0) * 0.35,
    0.38 * Math.cos(phase0 * 1.25) + 0.22 * Math.sin(gust0 * 0.9),
    Math.cos(phase0 * 0.85) * 0.75 + Math.cos(gust0 * 1.1) * 0.35,
  );
  swayDir0.sub(dir0.clone().multiplyScalar(swayDir0.dot(dir0)));
  const swayLen0 = swayDir0.length();
  if (swayLen0 > 0.001) swayDir0.divideScalar(swayLen0);
  const sway0 = swayDir0.multiplyScalar(bend0 * 1.15);
  sway0.sub(dir0.clone().multiplyScalar(sway0.lengthSq() / (2.0 * Math.max(d0, 4.0))));

  const branchBase = new THREE.Vector3(branchAnchor.x, branchAnchor.y, branchAnchor.z);
  const isLateral = branchAnchor.w >= 0.05 ? 1.0 : 0.0;
  const r1 = new THREE.Vector3().subVectors(structPos, branchBase);
  const d1 = r1.length();
  const d1Norm = Math.max(0.0, Math.min(2.5, d1 / 7.5));
  const bend1 = isLateral * ((d1Norm * d1Norm) / (1.0 + 0.32 * d1Norm));
  const branchSeed = branchBase.dot(new THREE.Vector3(0.19, 0.43, 0.31));
  const phase1 = windTime * 3.1 + branchSeed - d1 * 0.32;
  const dir1 = d1 > 0.001 ? r1.clone().divideScalar(d1) : new THREE.Vector3(0, 1, 0);
  let swayDir1 = new THREE.Vector3(Math.cos(phase1 * 1.1), 0.45 * Math.sin(phase1 * 0.9), Math.sin(phase1));
  swayDir1.sub(dir1.clone().multiplyScalar(swayDir1.dot(dir1)));
  const swayLen1 = swayDir1.length();
  if (swayLen1 > 0.001) swayDir1.divideScalar(swayLen1);
  const sway1 = swayDir1.multiplyScalar(bend1 * 0.95);
  sway1.sub(dir1.clone().multiplyScalar(sway1.lengthSq() / (2.0 * Math.max(d1, 3.0))));
  const branchDisp = sway0.add(sway1).multiplyScalar(config.branchMovement * effOverall);

  const smoothWavy = (x: number) => {
    const t = Math.max(0, Math.min(1, x / 3.0));
    return t * t * (3 - 2 * t);
  };
  const wavyEnv = smoothWavy(d0);
  const wPhase1 = windTime * 3.8 - d0 * 0.32 + structPos.dot(new THREE.Vector3(0.26, 0.22, 0.24)) + strainPhase;
  const wPhase2 = windTime * 5.6 - d0 * 0.48 + structPos.dot(new THREE.Vector3(-0.35, 0.31, -0.28));
  const wPhase3 = windTime * 7.5 + structPos.dot(new THREE.Vector3(0.52, -0.44, 0.46));
  const wavyWave = new THREE.Vector3(
    Math.sin(wPhase1) * 0.55 + Math.sin(wPhase2) * 0.30 + Math.cos(wPhase3) * 0.15,
    Math.cos(wPhase1 * 0.9) * 0.42 + Math.sin(wPhase2 * 1.1) * 0.28,
    Math.cos(wPhase1 * 1.1) * 0.52 + Math.cos(wPhase2 * 0.85) * 0.30,
  );
  const windVel = config.windVelocity ?? 0.2;
  const flutterInt = config.flutterIntensity ?? 0.5;
  const wavyDisp = wavyWave.multiplyScalar(wavyEnv * config.wavy * (1.0 + windVel * 0.3) * effOverall * 0.75);

  const tipDist = Math.max(0.0, Math.min(5.0, rawLocalPos.length()));
  if (isAppendage) {
    const localWPhase = windTime * 6.0 + hashVal * 19.0 + rawLocalPos.dot(new THREE.Vector3(1.2, 1.5, 1.2));
    const localBladeWave = new THREE.Vector3(
      Math.sin(localWPhase),
      Math.cos(localWPhase * 1.15) * 0.7,
      Math.cos(localWPhase * 0.85),
    ).multiplyScalar(tipDist * config.wavy * (1.0 + windVel * 0.3) * effOverall * 0.22);
    wavyDisp.add(localBladeWave);
  }

  const smoothCanopy = (x: number) => {
    const t = Math.max(0, Math.min(1, (x - 1.5) / 7.5));
    return t * t * (3 - 2 * t);
  };
  const canopyReach = smoothCanopy(d0);
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

export function computeLfoModulatedOverall(engine: {
  overallMovement?: number;
  movementLfoSpeed?: number;
  movementLfoDepth?: number;
  movementLfoPhase?: number;
}): { effectiveOverall: number; lfoMult: number } {
  const overall = engine.overallMovement ?? 0.25;
  if (overall <= 0.0001) return { effectiveOverall: 0.0, lfoMult: 1.0 };
  const lfoSpeed = engine.movementLfoSpeed ?? 0.30;
  const lfoDepth = engine.movementLfoDepth ?? 0.40;
  if (lfoSpeed <= 0.0001 || lfoDepth <= 0.0001) {
    return { effectiveOverall: overall, lfoMult: 1.0 };
  }
  const phase = engine.movementLfoPhase ?? 0.0;
  // Organic dual-sine breathing wave in [0, 1]
  const rawWave = 0.78 * Math.sin(phase) + 0.22 * Math.sin(phase * 1.618 + 0.9);
  const normWave = Math.max(0.0, Math.min(1.0, 0.5 + 0.5 * rawWave));
  // At depth=1.0, swings from 8% of overallMovement (calm lull) up to 140% of overallMovement (gust swell)
  const minMult = 1.0 - lfoDepth * 0.92;
  const maxMult = 1.0 + lfoDepth * 0.40;
  const lfoMult = minMult + (maxMult - minMult) * normWave;
  return { effectiveOverall: overall * lfoMult, lfoMult };
}

export function updateWindMaterialUniforms(engine: SimulationEngine) {
  const shimmer = engine.shimmer ?? 0.40;
  const wavy = engine.wavy ?? 0.35;
  const branchMovement = engine.branchMovement ?? 0.45;
  const overallMovement = engine.overallMovement ?? 0.25;
  const anyActive = overallMovement > 0.0001 && (shimmer > 0.0001 || wavy > 0.0001 || branchMovement > 0.0001);

  const lfoSpeed = engine.movementLfoSpeed ?? 0.30;
  const lfoDepth = engine.movementLfoDepth ?? 0.40;
  if (anyActive && lfoSpeed > 0.0001 && lfoDepth > 0.0001) {
    engine.movementLfoPhase = (engine.movementLfoPhase || 0) + (0.004 + lfoSpeed * 0.045);
  }

  const { effectiveOverall } = computeLfoModulatedOverall(engine);

  if (engine.windTime === undefined) {
    engine.windTime = 0.0;
  }
  if (anyActive) {
    engine.windTime += 0.024 * (0.35 + 0.75 * Math.min(2.0, effectiveOverall));
  }

  const mats: (THREE.MeshPhysicalMaterial | undefined)[] = [
    engine.cylinderMesh?.material as THREE.MeshPhysicalMaterial,
    engine.appendageMaterial,
    engine.appendages.get("leaves")?.mesh?.material as THREE.MeshPhysicalMaterial,
  ];
  if (engine.hybridMeshes?.length > 0) {
    mats.push(engine.hybridMeshes[0]?.material as THREE.MeshPhysicalMaterial);
  }

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
