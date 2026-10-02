import * as THREE from "three";
import {
  Genome,
  APPENDAGES,
  PULSE_TARGETS,
  ARCHETYPES,
  MOVEMENT_TYPES,
  Archetype,
} from "./SimulationTypes";
import { assignGenomeMorphology, inheritGenomeMorphology } from "./SimulationMorphology";

export function getRandomWeightedArchetype(): Archetype {
  const branchingPool: Archetype[] = ["bush", "tree", "rhizome", "bush", "tree", "rhizome"];
  return branchingPool[Math.floor(Math.random() * branchingPool.length)];
}

export function getWeightedAppendage(
  traitProbs: Record<string, number>,
): (typeof APPENDAGES)[number] {
  let total = 0;
  for (const k of APPENDAGES) {
    total += traitProbs[k] !== undefined ? traitProbs[k] : 0.5;
  }
  if (total <= 0) return APPENDAGES[Math.floor(Math.random() * APPENDAGES.length)];
  let r = Math.random() * total;
  for (const k of APPENDAGES) {
    const v = traitProbs[k] !== undefined ? traitProbs[k] : 0.5;
    r -= v;
    if (r <= 0) return k as any;
  }
  return APPENDAGES[Math.floor(Math.random() * APPENDAGES.length)];
}

const SCIENCY_PREFIXES = [
  "Phyto", "Chlor", "Virid", "Xylo", "Thallo", "Spiro", "Aeth", "Flor",
  "Cyan", "Phaen", "Astra", "Oryz", "Kryo", "Sol", "Zen", "Mycel",
  "Helio", "Lumin", "Dendro", "Rhizo", "Nycto", "Zephyr", "Stell", "Vesper"
];

const SCIENCY_SUFFIXES = [
  "vire", "ion", "pteryx", "dium", "thos", "llis", "rix", "onix",
  "phis", "ria", "naut", "lia", "nis", "tis", "los", "morph", "stema"
];

const SCIENCY_EPITHETS = [
  "Zenithia", "Virella", "Phaenon", "Aetheris", "Florion", "Cyanis",
  "Sylvatica", "Zylos", "Thallos", "Spirella", "Mycelon", "Kryon",
  "Verdantis", "Xylos", "Astraea", "Erythros", "Nautilus", "Oryzon",
  "Solaria", "Helianthus", "Chlorostema", "Luminaria", "Rhizophora",
  "Dendrobium", "Phytolacca", "Vesperia", "Stellaris", "Zephyria"
];

export function generateSciencyName(): string {
  if (Math.random() < 0.35) {
    return SCIENCY_EPITHETS[Math.floor(Math.random() * SCIENCY_EPITHETS.length)];
  }
  const p = SCIENCY_PREFIXES[Math.floor(Math.random() * SCIENCY_PREFIXES.length)];
  const s = SCIENCY_SUFFIXES[Math.floor(Math.random() * SCIENCY_SUFFIXES.length)];
  return `${p}${s}`;
}

export function formatGenomeName(archetype: string): string {
  const capArch = archetype.charAt(0).toUpperCase() + archetype.slice(1);
  return `${capArch} ${generateSciencyName()}`;
}

const ROMAN_SUFFIXES = [
  "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

/**
 * Guarantees a strain name is not already in use by any living, dying or historically
 * registered strain.
 *
 * Names are drawn from a small fixed pool (28 epithets plus prefix/suffix combos), so
 * collisions happen regularly. The engine keys its entire organism census, culling logic and
 * segment ownership by strain NAME, so two distinct organisms sharing one name collapse into a
 * single census entry — which silently breaks the minCreatures/maxCreatures accounting and lets
 * the population drift past the cap. Appending a lineage numeral keeps names human-readable
 * while restoring the uniqueness the rest of the engine assumes.
 */
export function ensureUniqueStrainName(engine: any, baseName: string): string {
  const isTaken = (n: string): boolean => {
    if (engine.genomeMap?.has(n)) return true;
    if (engine.speciesLifecycleMap?.has(n)) return true;
    if (engine.dyingStrains?.has(n)) return true;
    if (engine.biomassMap?.has(n)) return true;
    if (engine.agents) {
      for (let i = 0; i < engine.agents.length; i++) {
        const a = engine.agents[i];
        if (a?.active && a.genome?.name === n) return true;
      }
    }
    return false;
  };

  if (!isTaken(baseName)) return baseName;

  for (let i = 0; i < ROMAN_SUFFIXES.length; i++) {
    const candidate = `${baseName} ${ROMAN_SUFFIXES[i]}`;
    if (!isTaken(candidate)) return candidate;
  }

  // Exhausted the readable numerals — fall back to a guaranteed-unique discriminator.
  let n = 1;
  let candidate = `${baseName} #${n}`;
  while (isTaken(candidate) && n < 10000) {
    n++;
    candidate = `${baseName} #${n}`;
  }
  return candidate;
}

export function selectMendelianAlleles<T>(
  p1Expressed: T,
  p1Recessive: T | undefined,
  p2Expressed: T,
  p2Recessive: T | undefined
): { expressed: T; recessive: T } {
  const allele1 = Math.random() < 0.5 ? p1Expressed : (p1Recessive ?? p1Expressed);
  const allele2 = Math.random() < 0.5 ? p2Expressed : (p2Recessive ?? p2Expressed);

  if (Math.random() < 0.5) {
    return { expressed: allele1, recessive: allele2 };
  } else {
    return { expressed: allele2, recessive: allele1 };
  }
}

export function clampArchetypeGenome(res: Genome): Genome {
  if (!res.morphMode) {
    assignGenomeMorphology(res);
  }
  res.singleton = false;
  if (res.archetype === "rhizome") {
    res.thicknessBase = THREE.MathUtils.clamp(res.thicknessBase, 0.75, 3.6);
    res.minThickness = THREE.MathUtils.clamp(res.minThickness, 0.18, 0.35);
    res.thicknessDecay = THREE.MathUtils.clamp(res.thicknessDecay, 0.982, 0.995);
    res.bifurcationRate = THREE.MathUtils.clamp(res.bifurcationRate || 0.06, 0.05, 0.16);
    res.branchTendency = THREE.MathUtils.clamp(res.branchTendency || 2.0, 2.0, 4.5);
    res.stepSize = THREE.MathUtils.clamp(res.stepSize, 0.45, 1.15);
    res.wanderIntensity = THREE.MathUtils.clamp(res.wanderIntensity || 0.4, 0.25, 0.65);
  } else if (res.archetype === "bush") {
    res.thicknessBase = THREE.MathUtils.clamp(res.thicknessBase, 0.75, 3.4);
    res.minThickness = THREE.MathUtils.clamp(res.minThickness || 0.20, 0.18, 0.32);
    res.thicknessDecay = THREE.MathUtils.clamp(res.thicknessDecay, 0.985, 0.996);
    res.bifurcationRate = Math.max(res.bifurcationRate || 0.01, 0.22 + Math.random() * 0.12);
    res.branchTendency = Math.max(res.branchTendency || 0.5, 3.8 + Math.random() * 4.0);
    res.stepSize = THREE.MathUtils.clamp(res.stepSize, 0.32, 0.85);
    res.wanderIntensity = Math.min(res.wanderIntensity || 0.5, 0.75);
  } else if (res.archetype === "tree") {
    res.thicknessBase = THREE.MathUtils.clamp(res.thicknessBase, 1.4, 6.5);
    res.minThickness = THREE.MathUtils.clamp(res.minThickness || 0.22, 0.20, 0.55);
    res.thicknessDecay = THREE.MathUtils.clamp(res.thicknessDecay, 0.982, 0.995);
    res.bifurcationRate = THREE.MathUtils.clamp(res.bifurcationRate || 0.04, 0.035, 0.085);
    res.branchTendency = THREE.MathUtils.clamp(res.branchTendency || 2.2, 2.0, 6.0);
    res.stepSize = THREE.MathUtils.clamp(res.stepSize, 0.45, 1.15);
    if (res.morphMode === "filigree") {
      res.morphScale = THREE.MathUtils.clamp(res.morphScale ?? 0.55, 0.48, 0.68);
    }
  } else if (res.archetype === "snake") {
    res.thicknessBase = THREE.MathUtils.clamp(res.thicknessBase, 1.8, 4.2);
    res.minThickness = Math.max(res.minThickness, 0.45);
    res.bifurcationRate = Math.max(res.bifurcationRate || 0.05, 0.05);
    res.branchTendency = Math.max(res.branchTendency || 2.2, 2.2);
    res.stepSize = THREE.MathUtils.clamp(res.stepSize, 0.65, 1.25);
  }
  if (!res.appendage) {
    res.appendage = getWeightedAppendage({});
  }
  if (res.recessive && !res.recessive.appendage) {
    res.recessive.appendage = getWeightedAppendage({});
  }
  return res;
}

export function breedGenomes(
  g1: Genome,
  g2: Genome,
  traitProbs: Record<string, number>,
  multicolorAppProb: number = 0.5,
  sameColorAppProb: number = 0.5,
  appendageSpawnRate: number = 0.7,
  glowProbability: number = 0.1,
  colorMutationShift: number = 0.06,
): Genome {
  const archInheritance = selectMendelianAlleles(
    g1.archetype, g1.recessive?.archetype,
    g2.archetype, g2.recessive?.archetype
  );
  let newArchetype = archInheritance.expressed;
  if (!ARCHETYPES.includes(newArchetype)) {
    newArchetype = ARCHETYPES.includes(g1.archetype)
      ? g1.archetype
      : ARCHETYPES.includes(g2.archetype)
        ? g2.archetype
        : "bush";
  }

  const moveInheritance = selectMendelianAlleles(
    g1.movementType, g1.recessive?.movementType,
    g2.movementType, g2.recessive?.movementType
  );
  const newMovementType = moveInheritance.expressed;

  const geoInheritance = selectMendelianAlleles(
    g1.geometryType, g1.recessive?.geometryType,
    g2.geometryType, g2.recessive?.geometryType
  );
  const newGeometryType = geoInheritance.expressed;

  const appInheritance = selectMendelianAlleles(
    g1.appendage, g1.recessive?.appendage,
    g2.appendage, g2.recessive?.appendage
  );

  const glowInheritance = selectMendelianAlleles(
    !!g1.isGlowing, !!g1.recessive?.isGlowing,
    !!g2.isGlowing, !!g2.recessive?.isGlowing
  );

  const vernInheritance = selectMendelianAlleles(
    g1.vernationType ?? "circinate", g1.recessive?.vernationType,
    g2.vernationType ?? "circinate", g2.recessive?.vernationType
  );

  const canopyInheritance = selectMendelianAlleles(
    g1.canopyZone ?? "wholeBody", g1.recessive?.canopyZone,
    g2.canopyZone ?? "wholeBody", g2.recessive?.canopyZone
  );

  const phylloInheritance = selectMendelianAlleles(
    g1.phyllotaxisMode ?? "spiral", g1.recessive?.phyllotaxisMode,
    g2.phyllotaxisMode ?? "spiral", g2.recessive?.phyllotaxisMode
  );

  const windInheritance = selectMendelianAlleles(
    g1.windStyle ?? "seaweed", g1.recessive?.windStyle,
    g2.windStyle ?? "stiff", g2.recessive?.windStyle
  );

  // Stable Color Blending: Direct lerp of expressed parent colors with tight variation (+/- 0.015)
  const h1 = g1.color.getHSL({ h: 0, s: 0, l: 0 });
  const h2 = g2.color.getHSL({ h: 0, s: 0, l: 0 });
  
  let hueDiff = h2.h - h1.h;
  if (hueDiff > 0.5) hueDiff -= 1.0;
  if (hueDiff < -0.5) hueDiff += 1.0;
  
  let parentBlendH: number;
  if (Math.random() < 0.90) {
    const chosenH = Math.random() < 0.5 ? h1.h : h2.h;
    const shift = (Math.random() - 0.5) * 2.0 * colorMutationShift;
    parentBlendH = (chosenH + shift + 1.0) % 1.0;
  } else {
    parentBlendH = (h1.h + hueDiff * (0.35 + Math.random() * 0.30) + (Math.random() - 0.5) * 0.015 + 1.0) % 1.0;
  }
  const resultH = parentBlendH;

  const isAlbino = Math.random() < 0.002;
  const resultS = isAlbino ? 0.02 : THREE.MathUtils.clamp((h1.s + h2.s) * 0.5 + (Math.random() - 0.5) * 0.02, 0.50, 0.75);
  const resultL = isAlbino ? 0.95 : THREE.MathUtils.clamp((h1.l + h2.l) * 0.5 + (Math.random() - 0.5) * 0.02, 0.45, 0.60);
  const baseColor = new THREE.Color().setHSL(resultH, resultS, resultL);

  const inheritedDecay = (g1.thicknessDecay + g2.thicknessDecay) / 2;
  const thicknessDecay = inheritedDecay + (Math.random() - 0.5) * 0.002;

  const pulseTarget =
    Math.random() < 0.1
      ? PULSE_TARGETS[
          Math.floor(Math.random() * (PULSE_TARGETS.length - 1)) + 1
        ]
      : "none";

  const res: any = {
    name: formatGenomeName(newArchetype),
    isHybrid: true,
    archetype: newArchetype,
    movementType: newMovementType,
    color: baseColor,
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
    thicknessDecay: THREE.MathUtils.clamp(thicknessDecay, 0.975, 0.995),
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
    geometryType: newGeometryType,
    appendage: appInheritance.expressed ? appInheritance.expressed : getWeightedAppendage(traitProbs),
    multicolorAppendage: false,
    sameColorAppendage: Math.random() < sameColorAppProb,
    stability: 0.8,
    pulseTarget: pulseTarget as any,
    pulseSpeed: 0.003 + Math.random() * 0.007,
    gradientGrowth: Math.random() < (traitProbs["gradient"] || 0.1),
    gradientType: 1 + Math.floor(Math.random() * 4),
    singleton: newArchetype === "snake" && Math.random() < 0.5,
    isGlowing: glowInheritance.expressed || Math.random() < glowProbability,
    
    // Breed Procedural Leaf Genes
    leafDivision: THREE.MathUtils.clamp(
      ((g1.leafDivision ?? 0.5) + (g2.leafDivision ?? 0.5)) / 2 + (Math.random() - 0.5) * 0.1,
      0,
      1
    ),
    vernationType: vernInheritance.expressed,
    canopyZone: canopyInheritance.expressed,
    phyllotaxisMode: phylloInheritance.expressed,
    windStyle: windInheritance.expressed,
    succulence: THREE.MathUtils.clamp(
      ((g1.succulence ?? 0.5) + (g2.succulence ?? 0.5)) / 2 + (Math.random() - 0.5) * 0.1,
      0,
      1
    ),

    // Carried Recessive Genes (passed to future generations)
    recessive: {
      archetype: ARCHETYPES.includes(archInheritance.recessive)
        ? archInheritance.recessive
        : newArchetype,
      movementType: moveInheritance.recessive,
      geometryType: geoInheritance.recessive,
      appendage: appInheritance.recessive || getWeightedAppendage(traitProbs),
      isGlowing: glowInheritance.recessive,
      vernationType: vernInheritance.recessive,
      canopyZone: canopyInheritance.recessive,
      phyllotaxisMode: phylloInheritance.recessive,
      windStyle: windInheritance.recessive,
    },
  };
  inheritGenomeMorphology(res, g1, g2);
  clampArchetypeGenome(res);
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
    glowProbability,
  );
  res.name = formatGenomeName(res.archetype);
  clampArchetypeGenome(res);
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
  if (g.recessive) {
    res.recessive = {
      ...g.recessive,
      color: g.recessive.color.clone(),
    };
  }
  const parentH = res.color.getHSL({ h: 0, s: 0, l: 0 }).h;
  const isAlbino = Math.random() < 0.04;
  const resultS = isAlbino ? 0.01 + Math.random() * 0.04 : 0.68;
  const resultL = isAlbino ? 0.92 + Math.random() * 0.08 : 0.52;
  let resultH = (parentH + (Math.random() - 0.5) * 0.03 + 1.0) % 1.0;
  if (Math.random() < 0.20) {
    // Complementary shift (+180°), avoiding random triadic jumps
    resultH = (parentH + 0.50 + (Math.random() - 0.5) * 0.03 + 1.0) % 1.0;
  }
  res.color.setHSL(resultH, resultS, resultL);

  res.wanderIntensity = Math.max(0, res.wanderIntensity + (Math.random() - 0.5) * 0.05);
  res.wavingSpeed = Math.max(0, res.wavingSpeed + (Math.random() - 0.5) * 0.03);
  res.wavingAmplitude = Math.max(0, res.wavingAmplitude + (Math.random() - 0.5) * 0.06);

  // Always assign valid appendage from weighted pool
  res.appendage = res.appendage ? res.appendage : getWeightedAppendage(traitProbs);
  
  if (Math.random() < 0.05) {
     res.archetype = getRandomWeightedArchetype();
     if (res.archetype === "snake") res.singleton = Math.random() < 0.5;
  }
  if (Math.random() < 0.1) res.movementType = MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)];
  if (g.archetype !== res.archetype || g.movementType !== res.movementType) {
      res.name = `${g.name.split(" ")[0]} [${res.archetype.toUpperCase()}]-M`;
  }
  
  if (Math.random() < 0.2)
    res.multicolorAppendage = false;
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
  clampArchetypeGenome(res);
  return res;
}
