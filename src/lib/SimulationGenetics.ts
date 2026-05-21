import * as THREE from "three";
import {
  Genome,
  GEO_TYPES,
  APPENDAGES,
  PULSE_TARGETS,
  ARCHETYPES,
  MOVEMENT_TYPES,
} from "./SimulationTypes";

export function setupShaderMaterial(material: THREE.MeshPhysicalMaterial, isLeaf = false) {
  material.userData.theme1 = { value: 0 };
  material.userData.theme2 = { value: 0 };
  material.userData.themeMix = { value: 0.0 };
  material.userData.themeColor1_A = { value: new THREE.Color() };
  material.userData.themeColor2_A = { value: new THREE.Color() };
  material.userData.themeColor1_B = { value: new THREE.Color() };
  material.userData.themeColor2_B = { value: new THREE.Color() };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.theme1 = material.userData.theme1;
    shader.uniforms.theme2 = material.userData.theme2;
    shader.uniforms.themeMix = material.userData.themeMix;
    shader.uniforms.themeColor1_A = material.userData.themeColor1_A;
    shader.uniforms.themeColor2_A = material.userData.themeColor2_A;
    shader.uniforms.themeColor1_B = material.userData.themeColor1_B;
    shader.uniforms.themeColor2_B = material.userData.themeColor2_B;

    const leafUVDecl = isLeaf ? 'varying vec3 vLeafUV;' : '';
    const leafFragDecl = isLeaf ? 'varying vec3 vLeafUV;\nuniform float veinStrength;\nuniform float veinGlow;' : '';
    const leafUVInit = isLeaf ? `
             float leafHash = instancePackA.w;
             float leafHash2 = fract(leafHash * 13.7);
             float leafStemLen = clamp(0.15 + leafHash * 0.20 + (leafHash2 - 0.5) * 0.06, 0.10, 0.42);
             float leafBladeT = clamp((position.y - leafStemLen) / max(1.0 - leafStemLen, 0.001), 0.0, 1.0);
             vLeafUV = vec3(position.x * 2.0, leafBladeT, position.y);
    ` : '';

    // Expose Attributes
    shader.vertexShader = `
            attribute vec4 instancePackA;
            attribute vec4 instancePackB;
            attribute vec3 instanceAmbientReflect;
            attribute vec3 instanceLightDir;
            varying float vGlow;
            varying float vGlowTrait;
            varying float vDecay;
            varying float vHash;
            varying float vGrowth;
            varying vec3 vAmbientReflect;
            varying vec3 vLightDir;
            varying vec3 vInstanceColor;
            ${leafUVDecl}
            ${shader.vertexShader}
        `.replace(
      "#include <color_vertex>",
      `#include <color_vertex>
             vGlow = instancePackA.x;
             vGlowTrait = instancePackA.y;
             vDecay = instancePackA.z;
             vHash = instancePackA.w;
             vGrowth = instancePackB.x;
             vAmbientReflect = instanceAmbientReflect;
             vLightDir = instanceLightDir;
             #ifdef USE_INSTANCING_COLOR
               vInstanceColor = instanceColor;
             #else
               vInstanceColor = diffuse;
             #endif
             ${leafUVInit}`
    );

    // Inject Custom Discard & Glow Logic
    shader.fragmentShader = `
            uniform int theme1;
            uniform int theme2;
            uniform float themeMix;
            uniform vec3 themeColor1_A;
            uniform vec3 themeColor2_A;
            uniform vec3 themeColor1_B;
            uniform vec3 themeColor2_B;
            varying float vGlow;
            varying float vGlowTrait;
            varying float vDecay;
            varying float vHash;
            varying float vGrowth;
            varying vec3 vAmbientReflect;
            varying vec3 vLightDir;
            varying vec3 vInstanceColor;
            ${leafFragDecl}
            ${shader.fragmentShader}
        `.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
             vec3 perturbedNormal = vec3(0.0, 1.0, 0.0);
             vec3 colorA = diffuseColor.rgb;
             if (theme1 == 1) { // Albino
                 float luminance = dot(colorA, vec3(0.299, 0.587, 0.114));
                 vec3 silverShadow = vec3(0.75, 0.78, 0.82);
                 vec3 platinumHighlight = vec3(0.98, 0.99, 1.0);
                 colorA = mix(silverShadow, platinumHighlight, luminance);
             } else if (theme1 == 2) { // Complementary
                 vec3 baseColor = mix(themeColor1_A, themeColor2_A, step(0.5, vHash));
                 colorA = baseColor * (length(vInstanceColor) * 1.2);
             } else if (theme1 == 3) { // Duotone
                 colorA = themeColor1_A * (length(vInstanceColor) * 1.2);
             }

             vec3 colorB = diffuseColor.rgb;
             if (theme2 == 1) { // Albino
                 float luminance = dot(colorB, vec3(0.299, 0.587, 0.114));
                 vec3 silverShadow = vec3(0.75, 0.78, 0.82);
                 vec3 platinumHighlight = vec3(0.98, 0.99, 1.0);
                 colorB = mix(silverShadow, platinumHighlight, luminance);
             } else if (theme2 == 2) { // Complementary
                 vec3 baseColor = mix(themeColor1_B, themeColor2_B, step(0.5, vHash));
                 colorB = baseColor * (length(vInstanceColor) * 1.2);
             } else if (theme2 == 3) { // Duotone
                 colorB = themeColor1_B * (length(vInstanceColor) * 1.2);
             }

             diffuseColor.rgb = mix(colorA, colorB, themeMix);

             ${isLeaf ? `
             // === VEINS & CENTRAL SPINE (MIDRIB) ===
             // Blend midrib between soft (veinGlow = 0.0) and crisp/bold (veinGlow = 1.0)
             float midribWidthSoft = mix(0.12, 0.04, vLeafUV.z);
             float midribWidthCrisp = mix(0.042, 0.015, vLeafUV.z) * (1.0 + veinStrength * 0.06);
             float midribValSoft = smoothstep(midribWidthSoft, midribWidthSoft * 0.15, abs(vLeafUV.x));
             float midribValCrisp = step(abs(vLeafUV.x), midribWidthCrisp);
             float midribVal = mix(midribValSoft, midribValCrisp, veinGlow);

             // Blend midrib shadow
             float midribShadowSoft = smoothstep(midribWidthSoft * 2.2, 0.0, abs(vLeafUV.x)) * (1.0 - midribValSoft);
             float midribShadowCrisp = smoothstep(midribWidthCrisp * 3.2, midribWidthCrisp, abs(vLeafUV.x)) * (1.0 - midribValCrisp);
             float midribShadow = mix(midribShadowSoft, midribShadowCrisp, veinGlow);

             float lateralVal = 0.0;
             float shadowMask = 0.0;

             if (vLeafUV.y > 0.0) {
                 // Genetic variations per species/leaf instance
                 float veinDensity = 4.0 + floor(fract(vHash * 17.3) * 5.0); // 4 to 9 veins
                 float veinAngle = 0.2 + fract(vHash * 29.7) * 0.4;        // 0.2 to 0.6 slope

                 float vCoord = vLeafUV.y - veinAngle * abs(vLeafUV.x);
                 float cellCoord = fract(vCoord * veinDensity);

                 // Distance to the vein line
                 float distToVeinLine = abs(cellCoord - 0.5) / veinDensity;

                 // Blend lateral veins between soft and crisp
                 float latThickSoft = mix(0.012, 0.005, vLeafUV.y) * (1.0 - 0.3 * abs(vLeafUV.x));
                 float latThickCrisp = mix(0.014, 0.006, vLeafUV.y) * (1.0 - 0.2 * abs(vLeafUV.x)) * (1.0 + veinStrength * 0.05);
                 float lateralValSoft = smoothstep(latThickSoft, latThickSoft * 0.1, distToVeinLine);
                 float lateralValCrisp = step(distToVeinLine, latThickCrisp);
                 lateralVal = mix(lateralValSoft, lateralValCrisp, veinGlow);

                 // Blend lateral shadows
                 float shadowThickSoft = mix(0.022, 0.009, vLeafUV.y);
                 float shadowMaskSoft = smoothstep(shadowThickSoft, 0.0, distToVeinLine) * (1.0 - lateralValSoft);
                 float shadowMaskCrisp = smoothstep(shadowThickSoft, 0.0, distToVeinLine) * (1.0 - lateralValCrisp);
                 shadowMask = mix(shadowMaskSoft, shadowMaskCrisp, veinGlow);

                 // Fade near margins so they don't run off harshly
                 float edgeFade = smoothstep(1.0, 0.8, abs(vLeafUV.x));
                 lateralVal *= edgeFade;
                 shadowMask *= edgeFade;

                 // Fade near the tip and base of the blade
                 float tipBaseFade = smoothstep(1.0, 0.85, vLeafUV.y) * smoothstep(0.0, 0.1, vLeafUV.y);
                 lateralVal *= tipBaseFade;
                 shadowMask *= tipBaseFade;
             }

             float finalVeinMask = max(midribVal, lateralVal);
             float finalShadow = max(shadowMask, midribShadow);

             perturbedNormal = normalize(vNormal);
             #ifdef DOUBLE_SIDED
                 perturbedNormal = perturbedNormal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
             #endif

             // === Screen-Space Normal Perturbation (Bump Mapping) ===
             // Scale normal perturbation intensity by veinGlow morph slider
             float bumpH = finalVeinMask * veinStrength * mix(0.18, 0.45, veinGlow); 
             vec3 dpdx = dFdx(-vViewPosition);
             vec3 dpdy = dFdy(-vViewPosition);
             float dhdx = dFdx(bumpH);
             float dhdy = dFdy(bumpH);
             vec3 r1 = cross(dpdy, perturbedNormal);
             vec3 r2 = cross(perturbedNormal, dpdx);
             float denom = dot(dpdx, r2);
             if (abs(denom) > 0.00001) {
                 vec3 surfGrad = (r1 * dhdx + r2 * dhdy) / denom;
                 perturbedNormal = normalize(perturbedNormal - surfGrad * mix(0.35, 0.6, veinGlow));
             }

             // Blend vein color from organic yellow-green to bright lime highlight
             vec3 baseLeafCol = diffuseColor.rgb;
             vec3 veinColSoft = clamp(baseLeafCol * 1.28 + vec3(0.03, 0.07, -0.02), 0.0, 1.0);
             vec3 veinColCrisp = clamp(mix(baseLeafCol * 1.8, vec3(0.96, 1.0, 0.62), 0.58), 0.0, 1.0);
             vec3 veinCol = mix(veinColSoft, veinColCrisp, veinGlow);

             // Blend shadow depth and mix strength
             float shadowDepth = mix(0.75, 0.35, veinGlow);
             float shadowMixFactor = mix(0.45, 0.70, veinGlow);
             diffuseColor.rgb = mix(diffuseColor.rgb, baseLeafCol * shadowDepth, finalShadow * shadowMixFactor * veinStrength);

             // Blend vein color mix strength
             float veinMixFactor = mix(0.75, 0.88, veinGlow);
             diffuseColor.rgb = mix(diffuseColor.rgb, veinCol, finalVeinMask * veinMixFactor * veinStrength);
             ` : ''}
            `
    ).replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>\n             ${isLeaf ? 'normal = perturbedNormal;' : ''}\n      `
    ).replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `vec4 diffuseColor = vec4( diffuse, opacity );
            
             ${isLeaf ? '' : `
             if (vGrowth < 1.0) {
                 float ditherIn = fract(sin(dot(gl_FragCoord.xy, vec2(54.321, 12.987))) * 43758.5453);
                 if (ditherIn > vGrowth) discard;
             }
             `}

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
             
             // Subtle selecting highlight outline glow across all themes
             if (vGlow > 0.0) {
                 float fresnelSelect = 1.0 - max(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0);
                 vec3 selectColor = mix(diffuseColor.rgb, vec3(1.0, 1.0, 1.0), 0.5);
                 diffuseColor.rgb += selectColor * (vGlow * 0.4 + fresnelSelect * vGlow * 0.5);
             }
             
             // Intrinsic body glow & outline aura trait
             if (vGlowTrait > 0.0) {
                 float intrinsicMult = 1.0;
                 if (vDecay > 0.0) { // Faltering flicker when reaching dying stage
                     intrinsicMult = sin(gl_FragCoord.x * 12.34 + gl_FragCoord.y * 45.67) * 0.4 + 0.6;
                 }
                 float fresnelTrait = 1.0 - max(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0);
                 diffuseColor.rgb += diffuseColor.rgb * (vGlowTrait * intrinsicMult + fresnelTrait * 1.5 * intrinsicMult);
             }
             
             // Environmental proximity directional reflection
             if (length(vAmbientReflect) > 0.0) {
                 float nDotL = max(dot(normalize(vNormal), normalize(vLightDir)), 0.0);
                 float fresnelReflect = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
                 diffuseColor.rgb += vAmbientReflect * (nDotL * 0.7 + fresnelReflect * 0.4);
             }
             `
    ).replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
             ${isLeaf ? `
             // Bypassing all lighting: Add pure emissive neon glow to the outgoing light!
             if (veinStrength > 0.0 && veinGlow > 0.0) {
                 vec3 glowingVeinColor = mix(diffuseColor.rgb * 2.2, vec3(0.98, 1.0, 0.72), 0.65);
                 gl_FragColor.rgb += glowingVeinColor * finalVeinMask * 0.85 * veinStrength * veinGlow;
             }
             ` : ''}
            `
    );
  };
  return material;
}

export function getWeightedAppendage(
  traitProbs: Record<string, number>,
): (typeof APPENDAGES)[number] {
  // If leaves is set to 1.0 (100% LEAF_WT), make it exclusive and bypass other weights
  if (traitProbs.leaves === 1.0) {
    return "leaves";
  }

  let total = 0;
  for (const [k, v] of Object.entries(traitProbs)) {
    if (k === "glow") continue;
    total += v;
  }
  if (total <= 0) return "none";
  let r = Math.random() * total;
  for (const [k, v] of Object.entries(traitProbs)) {
    if (k === "glow") continue;
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
  appendageSpawnRate: number = 0.7,
  glowProbability: number = 0.1,
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
  const resultL = isAlbino ? 0.85 + Math.random() * 0.15 : 0.6;

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
    // Appendage selected purely from the weighted trait pool, gated by appendageSpawnRate.
    // No parent-inheritance bypass — so APP_SPAWN and LEAF_WT settings are fully respected.
    appendage: Math.random() < appendageSpawnRate ? getWeightedAppendage(traitProbs) : "none",
    multicolorAppendage: Math.random() < multicolorAppProb,
    sameColorAppendage: Math.random() < sameColorAppProb,
    stability: 0.8,
    pulseTarget: pulseTarget as any,
    pulseSpeed: 0.05 + Math.random() * 0.15,
    gradientGrowth: Math.random() < (traitProbs["gradient"] || 0.1),
    singleton: newArchetype === "snake" && Math.random() < 0.5,
    isGlowing: Math.random() < glowProbability || !!(g1.isGlowing || g2.isGlowing) && Math.random() < 0.5,
    
    // Breed Procedural Leaf Genes
    leafDivision: THREE.MathUtils.clamp(
      ((g1.leafDivision ?? 0.5) + (g2.leafDivision ?? 0.5)) / 2 + (Math.random() - 0.5) * 0.1,
      0,
      1
    ),
    vernationType: (Math.random() < 0.05
      ? (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)]
      : Math.random() < 0.5
        ? (g1.vernationType ?? "circinate")
        : (g2.vernationType ?? "circinate")),
    canopyZone: (Math.random() < 0.05
      ? (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)]
      : Math.random() < 0.5
        ? (g1.canopyZone ?? "wholeBody")
        : (g2.canopyZone ?? "wholeBody")),
    phyllotaxisMode: (Math.random() < 0.05
      ? (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)]
      : Math.random() < 0.5
        ? (g1.phyllotaxisMode ?? "spiral")
        : (g2.phyllotaxisMode ?? "spiral")),
    succulence: THREE.MathUtils.clamp(
      ((g1.succulence ?? 0.5) + (g2.succulence ?? 0.5)) / 2 + (Math.random() - 0.5) * 0.1,
      0,
      1
    ),
  };
  
  if (res.archetype === "ginger") {
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
  appendageSpawnRate: number = 0.7,
  glowProbability: number = 0.1,
): Genome {
  const res = breedGenomes(
    g,
    g,
    traitProbs,
    multicolorAppProb,
    sameColorAppProb,
    appendageSpawnRate,
    glowProbability,
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
  appendageSpawnRate: number = 0.7,
  glowProbability: number = 0.1,
): Genome {
  const res = { ...g };
  res.color = g.color.clone();
  const h = res.color.getHSL({ h: 0, s: 0, l: 0 }).h;
  const isAlbino = Math.random() < 0.05;
  const resultS = isAlbino ? 0.01 + Math.random() * 0.04 : 0.9;
  const resultL = isAlbino ? 0.85 + Math.random() * 0.15 : 0.6;
  res.color.setHSL((h + (Math.random() - 0.5) * 0.15 + 1.0) % 1.0, resultS, resultL);

  res.wanderIntensity = Math.max(0, res.wanderIntensity + (Math.random() - 0.5) * 0.05);
  res.wavingSpeed = Math.max(0, res.wavingSpeed + (Math.random() - 0.5) * 0.03);
  res.wavingAmplitude = Math.max(0, res.wavingAmplitude + (Math.random() - 0.5) * 0.06);

  // Always reassign appendage from the weighted pool so APP_SPAWN + LEAF_WT settings apply immediately.
  res.appendage = Math.random() < appendageSpawnRate ? getWeightedAppendage(traitProbs) : "none";
  
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
  if (Math.random() < glowProbability)
    res.isGlowing = true;

  // Mutate Procedural Leaf Genes
  res.leafDivision = THREE.MathUtils.clamp((res.leafDivision ?? 0.5) + (Math.random() - 0.5) * 0.15, 0, 1);
  res.succulence = THREE.MathUtils.clamp((res.succulence ?? 0.5) + (Math.random() - 0.5) * 0.15, 0, 1);
  if (Math.random() < 0.08) {
    res.vernationType = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
  }
  if (Math.random() < 0.08) {
    res.canopyZone = (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)];
  }
  if (Math.random() < 0.08) {
    res.phyllotaxisMode = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
  }

  res.name = `Branch-Mutant-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
  res.stability = 0.4;
  return res;
}export function setupLeafShaderMaterial(material: THREE.MeshPhysicalMaterial) {
  setupShaderMaterial(material, true);
  material.userData.botanyRealism = { value: 1.0 };
  material.userData.stemCurviness = { value: 1.0 };
  material.userData.veinStrength = { value: 1.0 };
  material.userData.veinGlow = { value: 0.5 };

  const prevBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prevBeforeCompile(shader, renderer);
    
    shader.uniforms.botanyRealism = material.userData.botanyRealism;
    shader.uniforms.stemCurviness = material.userData.stemCurviness;
    shader.uniforms.veinStrength = material.userData.veinStrength;
    shader.uniforms.veinGlow = material.userData.veinGlow;

    shader.vertexShader = `
      uniform float botanyRealism;
      uniform float stemCurviness;
      uniform float veinStrength;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       // --- Unpack instance attributes ---
       float instanceGrowth = instancePackB.x;
       float instanceDecay = instancePackA.z;
       float instanceVernation = instancePackB.y;
       float instanceSucculence = instancePackB.z;
       float instanceLeafDiv = instancePackB.w;
       float instanceHash = instancePackA.w;

       // After .translate(0, 0.5, 0): Y runs 0 (attachment on creature) → 1 (leaf tip)
       float spineT = position.y;

       // === BOTANICAL STEM & BLADE DEFINITION ===
       // Genetic stem length: 15%-35% of total leaf length (varies per species)
       float hash2 = fract(instanceHash * 13.7);   // secondary hash for within-species variation
       float stemLength = 0.15 + instanceHash * 0.20;  // 15%-35% (genetic/species level)
       stemLength += (hash2 - 0.5) * 0.06;            // ±3% within-species per-leaf variation
       stemLength = clamp(stemLength, 0.10, 0.42);

       float isBlade = smoothstep(stemLength - 0.04, stemLength + 0.04, spineT);
       float bladeT = clamp((spineT - stemLength) / max(1.0 - stemLength, 0.001), 0.0, 1.0);

       // === PETIOLE BEND/TWIST PARAMETERS ===
       float leanDir = (hash2 > 0.5) ? 1.0 : -1.0;
       float leanAmount = hash2 * 0.3 * stemCurviness;
       float arcAmount = (0.15 + instanceHash * 0.25) * stemCurviness;
       float twistRate = (instanceHash * 2.0 - 1.0) * 0.5 * stemCurviness;  // -0.5 to +0.5 rad

       // === 1. ORGANIC SILHOUETTE CONTOURING BY GENETIC FAMILY ===
       float familySelector = fract(instanceHash * 7.3);
       float targetWidth = sin(bladeT * 3.14159) * smoothstep(0.0, 0.15, bladeT);
       
       // --- Aspect Ratio & Scale Variation ---
       float leafLengthScale = mix(0.35, 3.2, fract(instanceHash * 19.3));
       float leafWidthScale = mix(0.3, 2.2, fract(instanceHash * 3.7));
       
       if (isBlade > 0.5) {
           transformed.y = stemLength + (transformed.y - stemLength) * leafLengthScale;
       }
       
       if (familySelector < 0.16) {
           // Family 0: Lanceolate / Linear / Oval (Simple)
           float fullness = mix(1.0, 0.25, instanceLeafDiv);
           float widthFactor = pow(sin(bladeT * 3.14159), fullness);
           float aspectWidth = mix(1.0, 0.15, instanceLeafDiv);
           targetWidth = widthFactor * aspectWidth;
       }
       else if (familySelector < 0.32) {
           // Family 1: Cordate / Sagittate (Heart / Arrowhead)
           float baseWidth = sin(bladeT * 3.14159) * (1.2 - 0.6 * bladeT);
           float cleftDepth = mix(0.06, 0.28, instanceLeafDiv);
           float cleftDisplacement = cleftDepth * (1.0 - cos(position.x * 3.14159)) * (1.0 - bladeT);
           transformed.y -= cleftDisplacement * isBlade;
           
           float flare = 1.0 + mix(0.0, 0.9, instanceLeafDiv) * pow(1.0 - bladeT, 3.0);
           targetWidth = baseWidth * flare;
       }
       else if (familySelector < 0.48) {
           // Family 2: Palmate / Fan / Star (Maple / Ginkgo)
           vec2 polarVec = vec2(position.x * 2.0, bladeT);
           float theta = atan(polarVec.x, max(polarVec.y, 0.001));
           
           float lobesCount = 3.0 + floor(fract(instanceHash * 43.2) * 3.0) * 2.0;
           float lobeWave = cos(lobesCount * theta);
           float lobeDepth = mix(0.08, 0.65, instanceLeafDiv);
           float R = 1.0 - lobeDepth + lobeDepth * (0.5 + 0.5 * lobeWave);
           
           if (fract(instanceHash * 11.4) > 0.5) {
               float fanNotch = mix(0.0, 0.25, instanceLeafDiv) * smoothstep(0.0, 0.2, abs(theta));
               R = (1.0 - fanNotch) * smoothstep(1.4, 0.8, abs(theta));
           }
           
           transformed.x *= R;
           transformed.y = stemLength + (transformed.y - stemLength) * R;
           targetWidth = sin(bladeT * 3.14159);
       }
       else if (familySelector < 0.64) {
           // Family 3: Pinnate / Monstera (Deep lateral splits)
           float baseWidth = sin(bladeT * 3.14159);
           float splitsCount = 4.0 + floor(instanceLeafDiv * 6.0);
           float splitWave = sin(splitsCount * bladeT * 6.28318 - 1.5708);
           float splitDepth = mix(0.15, 0.92, instanceLeafDiv);
           float splitFactor = 1.0 - splitDepth + splitDepth * smoothstep(-0.2, 0.2, splitWave);
           targetWidth = baseWidth * splitFactor;
       }
       else if (familySelector < 0.80) {
           // Family 4: Rosette / Succulent (Spatulate / Plump)
           targetWidth = mix(0.15, 0.9, smoothstep(0.0, 0.65, bladeT)) * (1.0 - bladeT * 0.2);
           float spoonDepth = mix(0.0, 0.35, instanceLeafDiv);
           float cup = -spoonDepth * sin(bladeT * 3.14159) * (1.0 - abs(position.x) * 2.0);
           transformed.z += cup * isBlade;
       }
       else {
           // Family 5: Weird Fat Tube Leaf (Base contour placeholder)
           targetWidth = sin(bladeT * 3.14159) * smoothstep(0.0, 0.12, bladeT);
       }

       // Thin stem (0.08 of scale), opens to broad targetWidth on the blade, scaled by genetic width aspect
       float finalWidth = mix(0.08, targetWidth, isBlade) * leafWidthScale;
       transformed.x *= finalWidth;

       // === 1.5 SUCCULENCE THICKNESS ===
       float bladeThick = mix(0.15, 1.0, 1.0 - abs(position.x) * 2.0);
       float thicknessFactor = mix(1.0, bladeThick, isBlade);
       float zSpineTaper = cos(spineT * 1.5708) * smoothstep(0.0, 0.05, spineT);
       transformed.z *= (1.0 + instanceSucculence * 2.5) * thicknessFactor * zSpineTaper;

       // === 1.75 SPECIAL SHAPE OVERRIDES ===
       if (familySelector >= 0.80) {
           if (isBlade > 0.5) {
               float theta = position.x * 3.14159 * 2.0;
               float tubeRadius = (0.28 + instanceSucculence * 0.40) * leafWidthScale;
               float radius = tubeRadius * sin(bladeT * 3.14159) * smoothstep(0.0, 0.12, bladeT);
               
               transformed.x = radius * cos(theta);
               transformed.z = radius * sin(theta);
           }
           vGlowTrait = 1.0;
       }

       // === 2. VERNATION GROWTH ANIMATION ===
       float U = instanceGrowth * (1.0 - instanceDecay);

       float growScale = 1.0;
       float foldFactor = 1.0 - U;
       if (botanyRealism > 0.5) {
           foldFactor *= (1.0 - instanceSucculence * 0.45);
       }

       if (instanceVernation < 1.5) {
           // Circinate & Convolute: spiralled blobs
           // Fast pop/rise with overshoot and settle
           if (U < 0.6) {
               float t = U / 0.6;
               growScale = mix(0.05, 1.08, sin(t * 1.5708));
           } else {
               float t = (U - 0.6) / 0.4;
               growScale = mix(1.08, 1.0, smoothstep(0.0, 1.0, t));
           }
           // Make the fold factor unroll organically matching the pop
           foldFactor = smoothstep(1.0, 0.0, pow(U, 0.85));
       } else {
           // Conduplicate: butterfly wings
           // Grow steadily first, reaching full scale by U = 0.7
           growScale = smoothstep(0.0, 0.7, U);
       }

       if (foldFactor > 0.01 || instanceVernation >= 1.5) {
         if (instanceVernation < 0.5) {
           // Circinate: fiddlehead coil along spine
           float theta = spineT * 6.28318 * foldFactor * 1.5;
           float r = 0.12 + spineT * 0.04;
           transformed.y = mix(transformed.y, r * sin(theta), foldFactor);
           transformed.z += r * (1.0 - cos(theta)) * foldFactor;
         } else if (instanceVernation < 1.5) {
           // Convolute: cigar roll (blade only)
           float phi = position.x * 6.28318 * foldFactor * 2.0;
           float r_conv = 0.06 * foldFactor + 0.01;
           transformed.x = mix(transformed.x, mix(transformed.x, r_conv * sin(phi), isBlade), foldFactor);
           transformed.z += r_conv * (1.0 - cos(phi)) * foldFactor * isBlade;
         } else {
           // Conduplicate: book fold (blade only)
           // Stay folded until U = 0.4, then unfold with a gorgeous wing-flap bounce
           float alpha = 1.5708;
           float conduplicateFold = 1.0;
           if (U > 0.4) {
               float t = (U - 0.4) / 0.6;
               float baseAlpha = 1.5708 * (1.0 - smoothstep(0.0, 1.0, t));
               alpha = baseAlpha + 1.0 * sin(t * 3.14159 * 2.0) * (1.0 - t);
               conduplicateFold = abs(alpha) / 1.5708;
           }
           float sx = sign(position.x);
           float absx = abs(transformed.x);
           transformed.x = mix(transformed.x, sx * absx * cos(alpha), isBlade);
           transformed.z += absx * sin(alpha) * conduplicateFold * isBlade;
         }
       }

       // === 3. PERMANENT 3D MATURE STRUCTURE (blade only) ===
       // Deep Crease: sharp V-crease along the midrib seam
       float creaseStrength = 0.38 * (1.0 - instanceSucculence * 0.6 * botanyRealism);
       float midribFold = creaseStrength * (1.0 - abs(position.x) * 2.0);
       transformed.z += midribFold * U * isBlade;

       // Organic Edge Cupping: lateral margins curl upward or downward
       float cupSign = (instanceHash > 0.5) ? 1.0 : -1.0;
       float cupStrength = 0.32 * (1.0 - instanceSucculence * 0.7 * botanyRealism);
       float cup = cupSign * cupStrength * (1.0 - cos(position.x * 3.14159)) * U * isBlade;
       transformed.z += cup;

       // === 3.5 VEIN 3D RIDGE DISPLACEMENT ===
       if (isBlade > 0.5 && veinStrength > 0.0) {
           // --- Midrib: wide, tapered central ridge ---
           float midribWidth = mix(0.12, 0.04, bladeT);
           float midribVal = smoothstep(midribWidth, midribWidth * 0.2, abs(position.x * 2.0));
           
           // --- Lateral veins: angled branches ---
           float lateralVal = 0.0;
           float veinDensity = 4.0 + floor(fract(instanceHash * 17.3) * 5.0);
           float veinAngle = 0.2 + fract(instanceHash * 29.7) * 0.4;
           
           float vCoord = bladeT - veinAngle * abs(position.x * 2.0);
           float cellCoord = fract(vCoord * veinDensity);
           float distToVeinLine = abs(cellCoord - 0.5) / veinDensity;
           
           // Wide detection bands to reliably catch mesh vertices (32x48 grid)
           float latThick = mix(0.035, 0.015, bladeT) * (1.0 - 0.3 * abs(position.x * 2.0));
           lateralVal = smoothstep(latThick, latThick * 0.15, distToVeinLine);
           
           // Fade near edges and tip/base
           lateralVal *= smoothstep(1.0, 0.8, abs(position.x * 2.0));
           lateralVal *= smoothstep(1.0, 0.85, bladeT) * smoothstep(0.0, 0.1, bladeT);
           
           float finalVeinMask = max(midribVal, lateralVal);
           
           // Valley depressions between veins for pocketed look
           float valleyMask = (1.0 - finalVeinMask) * isBlade;
           float valleyDepth = 0.04 * valleyMask * veinStrength * U;
           
           // Strong ridge protrusion: midrib stands out boldly, laterals clearly visible
           float midribDisp = mix(0.12, 0.05, bladeT) * midribVal;
           float lateralDisp = 0.05 * lateralVal;
           float ridgeHeight = (midribDisp + lateralDisp) * veinStrength * U;
           
           // Push vein ridges outward on both faces, pull valleys inward
           float zSign = sign(position.z + 0.001);
           transformed.z += (ridgeHeight - valleyDepth) * zSign;
       }

       // Advanced Genetic Twisting & Curling (blade only)
       if (isBlade > 0.5) {
           // 1. Genetic central twist (propeller / ribbon twist around Y axis)
           float twistAmt = mix(-3.14159 * 1.8, 3.14159 * 1.8, fract(instanceHash * 53.7));
           float twistVal = (fract(instanceHash * 29.4) > 0.4) ? twistAmt : 0.0;
           
           // Dynamic twist overshoot for circinate/convolute
           float dynamicTwistU = U;
           if (instanceVernation < 1.5) {
               dynamicTwistU = U + 0.25 * sin(U * 3.14159) * (1.0 - U);
           }
           float leafTwistAngle = bladeT * twistVal * dynamicTwistU;
           
           float cosTwist = cos(leafTwistAngle);
           float sinTwist = sin(leafTwistAngle);
           float rx = transformed.x * cosTwist - transformed.z * sinTwist;
           float rz = transformed.x * sinTwist + transformed.z * cosTwist;
           transformed.x = rx;
           transformed.z = rz;
           
           // 2. Genetic spine curling / loop / scroll (X axis rotation)
           float curlAmt = mix(-3.14159 * 0.6, 3.14159 * 0.3, fract(instanceHash * 83.9));
           float curlVal = (fract(instanceHash * 61.2) > 0.4) ? curlAmt : 0.0;
           // Add a base droop so leaves bend naturally
           curlVal += -0.35 * (1.0 - instanceSucculence * 0.5 * botanyRealism);
           
           // Dynamic curl overshoot for circinate/convolute (the "curl move")
           float dynamicCurlU = U;
           if (instanceVernation < 1.5) {
               dynamicCurlU = U + 0.22 * sin(U * 3.14159) * (1.0 - U);
           }
           float curlAngle = bladeT * curlVal * dynamicCurlU;
           float cosCurl = cos(curlAngle);
           float sinCurl = sin(curlAngle);
           
           float yLocal = transformed.y - stemLength;
           float ry_curl = yLocal * cosCurl - transformed.z * sinCurl;
           float rz_curl = yLocal * sinCurl + transformed.z * cosCurl;
           transformed.y = stemLength + ry_curl;
           transformed.z = rz_curl;
       }

       // Wavy Margin Wiggles: detailed ripples along the outer edges of the blade
       float rippleFreq = 10.0 + instanceHash * 6.0;
       float rippleWave = sin(bladeT * rippleFreq + instanceHash * 6.28) * 0.07 * abs(position.x);
       transformed.z += rippleWave * U * isBlade;

       // === STEM CURVING & RIGID BLADE ROTATION/TRANSLATION ===
       // Compute stem-deformed position
       float stemT = clamp(spineT / max(stemLength, 0.001), 0.0, 1.0);
       float stemCurve = stemT * stemT;
       vec3 stemPos = transformed.xyz;
       stemPos.x += leanDir * leanAmount * stemCurve;
       stemPos.z += arcAmount * stemCurve;
       float stemTwistAngle = twistRate * stemT;
       float cosStemT = cos(stemTwistAngle);
       float sinStemT = sin(stemTwistAngle);
       float stx = stemPos.x * cosStemT - stemPos.z * sinStemT;
       float stz = stemPos.x * sinStemT + stemPos.z * cosStemT;
       stemPos.x = stx;
       stemPos.z = stz;

       // Compute blade-deformed position (rigidly rotated & translated)
       float dbx_dy = 2.0 * leanDir * leanAmount / max(stemLength, 0.001);
       float dbz_dy = 2.0 * arcAmount / max(stemLength, 0.001);
       vec3 tangent = normalize(vec3(dbx_dy, 1.0, dbz_dy));

       vec3 newY = tangent;
       vec3 newZ = normalize(cross(vec3(1.0, 0.0, 0.0), newY));
       vec3 newX = cross(newY, newZ);
       mat3 R_tilt = mat3(newX, newY, newZ);

       vec3 localBladePos = vec3(transformed.x, transformed.y - stemLength, transformed.z);
       vec3 rotatedLocal = R_tilt * localBladePos;
       vec3 bladePos = vec3(rotatedLocal.x + leanDir * leanAmount, rotatedLocal.y + stemLength, rotatedLocal.z + arcAmount);

       float cosBladeT = cos(twistRate);
       float sinBladeT = sin(twistRate);
       float btx = bladePos.x * cosBladeT - bladePos.z * sinBladeT;
       float btz = bladePos.x * sinBladeT + bladePos.z * cosBladeT;
       bladePos.x = btx;
       bladePos.z = btz;

       // Mix stem and blade smoothly
       transformed.xyz = mix(stemPos, bladePos, isBlade);

       // Apply overall growth scaling to the entire leaf geometry
       transformed.xyz *= growScale;`
    );
  };
  return material;
}
