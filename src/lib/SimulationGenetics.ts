import * as THREE from "three";
import {
  Genome,
  GEO_TYPES,
  APPENDAGES,
  PULSE_TARGETS,
  ARCHETYPES,
  MOVEMENT_TYPES,
} from "./SimulationTypes";

export function setupShaderMaterial(material: THREE.MeshPhysicalMaterial) {
  material.onBeforeCompile = (shader) => {
    // Expose Attributes
    shader.vertexShader = `
            attribute float instanceGlow;
            attribute float instanceDecay;
            varying float vGlow;
            varying float vDecay;
            ${shader.vertexShader}
        `.replace(
      "#include <color_vertex>",
      `#include <color_vertex>
             vGlow = instanceGlow;
             vDecay = instanceDecay;`,
    );

    // Inject Custom Discard & Glow Logic
    shader.fragmentShader = `
            varying float vGlow;
            varying float vDecay;
            ${shader.fragmentShader}
        `.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `vec4 diffuseColor = vec4( diffuse, opacity );
            
             if (vDecay > 0.0) {
                 float fresnel = 1.0 - max(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0);
                 float outlineWidth = 0.6;
                 
                 float ditherLimit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
                 
                 if (vDecay < 0.5) {
                     float fillFade = vDecay * 2.0;
                     if (fresnel < outlineWidth) {
                         if (ditherLimit < fillFade) discard;
                     }
                 } else {
                     if (fresnel < outlineWidth) {
                         discard; // Core completely invisible
                     } else {
                         float outlineFade = (vDecay - 0.5) * 2.0;
                         if (ditherLimit < outlineFade) discard;
                     }
                 }
             }
             
             // Soft additive Glow 
             if (vGlow > 0.0) {
                 diffuseColor.rgb += (diffuseColor.rgb * vGlow * 2.0); // additive glow approximation since alpha limits glow otherwise
             }
            `,
    );
  };
  return material;
}

export function getWeightedAppendage(
  traitProbs: Record<string, number>,
): (typeof APPENDAGES)[number] {
  let total = 0;
  for (const v of Object.values(traitProbs)) total += v;
  if (total <= 0) return "none";
  let r = Math.random() * total;
  for (const [k, v] of Object.entries(traitProbs)) {
    r -= v;
    if (r <= 0) return k as any;
  }
  return "none";
}

export function breedGenomes(
  g1: Genome,
  g2: Genome,
  traitProbs: Record<string, number>,
  multicolorAppProb: number = 0.5,
  sameColorAppProb: number = 0.5,
): Genome {
  const mutateGeo = (val: any, options: readonly any[]) =>
    Math.random() < 0.05
      ? options[Math.floor(Math.random() * options.length)]
      : val;
  const mutateApp = (val: any) =>
    Math.random() < 0.05 ? getWeightedAppendage(traitProbs) : val;

  const h1 = g1.color.getHSL({ h: 0, s: 0, l: 0 }).h;
  const h2 = g2.color.getHSL({ h: 0, s: 0, l: 0 }).h;
  
  let resultH: number;
  if (Math.random() < 0.1) {
    const avgH = (h1 + h2) / 2;
    resultH =
      (avgH +
        (Math.random() > 0.5 ? 0.333 : 0.666) +
        (Math.random() - 0.5) * 0.2) %
      1.0;
  } else {
    if (Math.random() < 0.3) {
      resultH = (h1 + h2) / 2 + (Math.random() - 0.5) * 0.05;
    } else {
      resultH = (Math.random() < 0.5 ? h1 : h2) + (Math.random() - 0.5) * 0.05;
    }
  }
  if (resultH < 0) resultH += 1.0;
  else resultH %= 1.0;

  // Thickness trend can now be thicker or thinner
  const inheritedDecay = (g1.thicknessDecay + g2.thicknessDecay) / 2;
  const thicknessDecay = inheritedDecay + (Math.random() - 0.5) * 0.002;

  const pulseTarget =
    Math.random() < 0.1
      ? PULSE_TARGETS[
          Math.floor(Math.random() * (PULSE_TARGETS.length - 1)) + 1
        ]
      : "none";

  const isCrossBreed = g1.archetype !== g2.archetype;
  const newArchetype = isCrossBreed ?
    (Math.random() < 0.7 ? ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)] : (Math.random() < 0.5 ? g1.archetype : g2.archetype) || ARCHETYPES[0]) :
    (Math.random() < 0.3 ? ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)] : (Math.random() < 0.5 ? g1.archetype : g2.archetype) || ARCHETYPES[0]);
  
  const newMovementType = isCrossBreed ? 
    (Math.random() < 0.5 ? MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)] : (Math.random() < 0.5 ? g1.movementType : g2.movementType) || MOVEMENT_TYPES[0]) :
    (Math.random() < 0.3 ? MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)] : (Math.random() < 0.5 ? g1.movementType : g2.movementType) || MOVEMENT_TYPES[0]);

  const isAlbino = Math.random() < 0.1;
  const resultS = isAlbino ? 0.01 + Math.random() * 0.04 : 0.9;
  const resultL = isAlbino ? 0.4 + Math.random() * 0.5 : 0.6;

  const res: any = {
    name: `Hybrid [${newArchetype.toUpperCase()}]-${g1.name.split(" ")[0]}-${g2.name.split(" ")[0]}-${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, "0")}`,
    archetype: newArchetype,
    movementType: newMovementType,
    color: new THREE.Color().setHSL(resultH, resultS, resultL),
    thicknessBase: Math.max(
      0.5,
      ((g1.thicknessBase + g2.thicknessBase) / 2) *
        (1 + (Math.random() - 0.5) * 0.2),
    ),
    minThickness: Math.max(
      0.1,
      ((g1.minThickness + g2.minThickness) / 2) *
        (1 + (Math.random() - 0.5) * 0.2),
    ),
    thicknessDecay: THREE.MathUtils.clamp(thicknessDecay, 0.998, 1.002),
    stepSize: Math.max(
      0.5,
      ((g1.stepSize + g2.stepSize) / 2) * (1 + (Math.random() - 0.5) * 0.2),
    ),
    bifurcationRate: Math.max(
      0.01,
      (g1.bifurcationRate + g2.bifurcationRate) / 2 +
        (Math.random() - 0.5) * 0.03,
    ),
    wanderIntensity: Math.max(
      0,
      (g1.wanderIntensity + g2.wanderIntensity) / 2 +
        (Math.random() - 0.5) * 0.1,
    ),
    branchTendency: Math.max(
      0.1,
      ((g1.branchTendency + g2.branchTendency) / 2) *
        (1 + (Math.random() - 0.5) * 0.6),
    ),
    wavingSpeed: Math.max(
      0,
      (g1.wavingSpeed + g2.wavingSpeed) / 2 + (Math.random() - 0.5) * 0.05,
    ),
    wavingAmplitude: Math.max(
      0,
      (g1.wavingAmplitude + g2.wavingAmplitude) / 2 +
        (Math.random() - 0.5) * 0.1,
    ),
    geometryType: mutateGeo(
      Math.random() < 0.5 ? g1.geometryType : g2.geometryType,
      GEO_TYPES,
    ),
    // High chance of completely new appendage
    appendage:
      Math.random() < 0.65
        ? getWeightedAppendage(traitProbs)
        : Math.random() < 0.5
          ? g1.appendage
          : g2.appendage,
    multicolorAppendage: Math.random() < multicolorAppProb,
    sameColorAppendage: Math.random() < sameColorAppProb,
    stability: 0.8,
    pulseTarget: pulseTarget as any,
    pulseSpeed: 0.05 + Math.random() * 0.15,
    gradientGrowth: Math.random() < (traitProbs["gradient"] || 0.1),
    singleton: newArchetype === "snake" && Math.random() < 0.5,
  };
  
  if (res.archetype === "fuzzy") {
    res.minThickness = Math.min(res.minThickness, 1.0);
    res.thicknessBase = Math.min(res.thicknessBase, 3.0);
    res.thicknessDecay = THREE.MathUtils.clamp(res.thicknessDecay, 0.98, 0.999);
  }
  
  return res;
}

export function mutateGenome(
  g: Genome,
  traitProbs: Record<string, number>,
  multicolorAppProb: number = 0.5,
  sameColorAppProb: number = 0.5,
): Genome {
  const res = breedGenomes(
    g,
    g,
    traitProbs,
    multicolorAppProb,
    sameColorAppProb,
  );
  res.name = `Mutant [${res.archetype.toUpperCase()}]-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
  return res;
}

export function mutateBranchGenome(
  g: Genome,
  traitProbs: Record<string, number>,
  multicolorAppProb: number = 0.5,
  sameColorAppProb: number = 0.5,
): Genome {
  const res = { ...g };
  res.color = g.color.clone();
  const h = res.color.getHSL({ h: 0, s: 0, l: 0 }).h;
  const isAlbino = Math.random() < 0.05;
  const resultS = isAlbino ? 0.01 + Math.random() * 0.04 : 0.9;
  const resultL = isAlbino ? 0.4 + Math.random() * 0.5 : 0.6;
  res.color.setHSL((h + (Math.random() - 0.5) * 0.15 + 1.0) % 1.0, resultS, resultL);

  res.wanderIntensity = Math.max(0, res.wanderIntensity + (Math.random() - 0.5) * 0.05);
  res.wavingSpeed = Math.max(0, res.wavingSpeed + (Math.random() - 0.5) * 0.03);
  res.wavingAmplitude = Math.max(0, res.wavingAmplitude + (Math.random() - 0.5) * 0.06);

  if (Math.random() < 0.5) res.appendage = getWeightedAppendage(traitProbs);
  
  if (Math.random() < 0.05) {
     res.archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
     if (res.archetype === "snake") res.singleton = Math.random() < 0.5;
  }
  if (Math.random() < 0.1) res.movementType = MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)];
  if (g.archetype !== res.archetype || g.movementType !== res.movementType) {
      res.name = `${g.name.split(" ")[0]} [${res.archetype.toUpperCase()}]-M`;
  }
  
  if (Math.random() < 0.2)
    res.multicolorAppendage = Math.random() < multicolorAppProb;
  if (Math.random() < 0.1)
    res.sameColorAppendage = Math.random() < sameColorAppProb;
  res.name = `Branch-Mutant-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
  res.stability = 0.4;
  return res;
}
