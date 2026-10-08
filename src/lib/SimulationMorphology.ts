import * as THREE from "three";
import { Archetype, Genome, MorphMode } from "./SimulationTypes";

export type TreeHabit =
  | "oak"
  | "elm"
  | "pine"
  | "rhizome"
  | "monolith"
  | "big_branching"
  | "candelabra"
  | "filigree"
  | "rhizome_tuber"
  | "rhizome_lace";

export interface TreeProfile {
  trunkLength: number;
  crownDivision: number;
  divisionSpreadDeg: number;
  trunkLateralsFrom: number;
  limbLength: number;
  lengthRatio: number;
  lateralSpacing: number;
  lateralAngleDeg: number;
  lateralAlpha: number;
  forkAngleDeg: number;
  endTaper: number;
  stepMin: number;
  stepMax: number;
  maxDepth: number;
  whorlSpacing?: number;
  noMidBranchLaterals?: boolean;
  flareBoost?: number;
}

export const PROFILES: Record<TreeHabit, TreeProfile> = {
  monolith: { trunkLength: 6.8, crownDivision: 3, divisionSpreadDeg: 46, trunkLateralsFrom: 0.78, limbLength: 6.4, lengthRatio: 0.70, lateralSpacing: 0.30, lateralAngleDeg: 50, lateralAlpha: 0.42, forkAngleDeg: 46, endTaper: 0.84, stepMin: 0.62, stepMax: 1.15, maxDepth: 5, flareBoost: 0.20 },
  big_branching: { trunkLength: 6.5, crownDivision: 4, divisionSpreadDeg: 48, trunkLateralsFrom: 0.78, limbLength: 6.6, lengthRatio: 0.70, lateralSpacing: 0.28, lateralAngleDeg: 50, lateralAlpha: 0.42, forkAngleDeg: 46, endTaper: 0.82, stepMin: 0.60, stepMax: 1.12, maxDepth: 5, flareBoost: 0.18 },
  candelabra: { trunkLength: 6.2, crownDivision: 4, divisionSpreadDeg: 48, trunkLateralsFrom: 0.78, limbLength: 6.4, lengthRatio: 0.70, lateralSpacing: 0.30, lateralAngleDeg: 48, lateralAlpha: 0.40, forkAngleDeg: 44, endTaper: 0.82, stepMin: 0.60, stepMax: 1.12, maxDepth: 5, noMidBranchLaterals: false, flareBoost: 0.18 },
  oak: { trunkLength: 6.4, crownDivision: 3, divisionSpreadDeg: 48, trunkLateralsFrom: 0.78, limbLength: 6.4, lengthRatio: 0.70, lateralSpacing: 0.28, lateralAngleDeg: 52, lateralAlpha: 0.40, forkAngleDeg: 46, endTaper: 0.82, stepMin: 0.58, stepMax: 1.10, maxDepth: 5, flareBoost: 0.18 },
  elm: { trunkLength: 6.8, crownDivision: 4, divisionSpreadDeg: 46, trunkLateralsFrom: 0.78, limbLength: 6.6, lengthRatio: 0.70, lateralSpacing: 0.28, lateralAngleDeg: 48, lateralAlpha: 0.38, forkAngleDeg: 44, endTaper: 0.80, stepMin: 0.58, stepMax: 1.10, maxDepth: 5, flareBoost: 0.16 },
  pine: { trunkLength: 7.6, crownDivision: 3, divisionSpreadDeg: 44, trunkLateralsFrom: 0.48, limbLength: 5.8, lengthRatio: 0.68, lateralSpacing: 0.28, lateralAngleDeg: 54, lateralAlpha: 0.38, forkAngleDeg: 44, endTaper: 0.78, stepMin: 0.58, stepMax: 1.10, maxDepth: 5, whorlSpacing: 3.4, flareBoost: 0.16 },
  filigree: { trunkLength: 6.0, crownDivision: 4, divisionSpreadDeg: 48, trunkLateralsFrom: 0.78, limbLength: 5.8, lengthRatio: 0.68, lateralSpacing: 0.26, lateralAngleDeg: 50, lateralAlpha: 0.38, forkAngleDeg: 46, endTaper: 0.80, stepMin: 0.54, stepMax: 1.05, maxDepth: 6, flareBoost: 0.16 },
  rhizome: { trunkLength: 3.5, crownDivision: 4, divisionSpreadDeg: 68, trunkLateralsFrom: 0.80, limbLength: 12.5, lengthRatio: 0.72, lateralSpacing: 0.38, lateralAngleDeg: 50, lateralAlpha: 0.36, forkAngleDeg: 42, endTaper: 0.62, stepMin: 0.76, stepMax: 1.50, maxDepth: 3 },
  rhizome_tuber: { trunkLength: 4.5, crownDivision: 4, divisionSpreadDeg: 58, trunkLateralsFrom: 0.75, limbLength: 13.0, lengthRatio: 0.72, lateralSpacing: 0.42, lateralAngleDeg: 50, lateralAlpha: 0.38, forkAngleDeg: 42, endTaper: 0.62, stepMin: 0.82, stepMax: 1.60, maxDepth: 3, flareBoost: 0.16 },
  rhizome_lace: { trunkLength: 2.8, crownDivision: 4, divisionSpreadDeg: 74, trunkLateralsFrom: 0.82, limbLength: 12.0, lengthRatio: 0.72, lateralSpacing: 0.34, lateralAngleDeg: 46, lateralAlpha: 0.34, forkAngleDeg: 40, endTaper: 0.74, stepMin: 0.70, stepMax: 1.35, maxDepth: 4 },
};

const TREE_MODES: MorphMode[] = ["monolith", "big_branching", "candelabra", "spire", "umbrella", "filigree"];
const BUSH_MODES: MorphMode[] = ["bush_compact", "bush_medium", "bush_giant"];
const RHIZOME_MODES: MorphMode[] = ["rhizome_tuber", "rhizome_stolon", "rhizome_lace"];

export function isMorphModeValidForArchetype(archetype: Archetype, mode?: MorphMode): boolean {
  if (!mode) return false;
  if (archetype === "tree") return TREE_MODES.includes(mode);
  if (archetype === "bush") return BUSH_MODES.includes(mode);
  if (archetype === "rhizome") return RHIZOME_MODES.includes(mode);
  return true;
}

export function pickMorphModeForArchetype(archetype: Archetype, avoidMode?: MorphMode): MorphMode {
  if (archetype === "bush") {
    const modes: MorphMode[] = avoidMode === "bush_giant" ? ["bush_compact", "bush_medium"] : avoidMode === "bush_compact" ? ["bush_giant", "bush_medium"] : BUSH_MODES;
    return modes[Math.floor(Math.random() * modes.length)];
  }
  if (archetype === "rhizome") {
    const modes: MorphMode[] = avoidMode === "rhizome_tuber" ? ["rhizome_lace", "rhizome_stolon"] : avoidMode === "rhizome_lace" ? ["rhizome_tuber", "rhizome_stolon"] : RHIZOME_MODES;
    return modes[Math.floor(Math.random() * modes.length)];
  }
  const isAvoidMacro = avoidMode === "monolith" || avoidMode === "big_branching" || avoidMode === "candelabra";
  const isAvoidMicro = avoidMode === "filigree";
  const r = Math.random();
  if (isAvoidMacro) return r < 0.45 ? "filigree" : r < 0.75 ? "spire" : "umbrella";
  if (isAvoidMicro) return r < 0.38 ? "monolith" : r < 0.72 ? "big_branching" : "candelabra";
  if (r < 0.22) return "monolith";
  if (r < 0.42) return "big_branching";
  if (r < 0.58) return "candelabra";
  if (r < 0.70) return "spire";
  if (r < 0.80) return "umbrella";
  return "filigree";
}

export function clampTrunkGirthMod(archetype?: Archetype, val: number = 1.0): number {
  if (archetype === "rhizome") return THREE.MathUtils.clamp(val, 0.22, 0.68);
  if (archetype === "bush") return THREE.MathUtils.clamp(val, 0.52, 1.18);
  return THREE.MathUtils.clamp(val, 1.15, 2.25);
}

export function clampRambleFactor(archetype?: Archetype, val: number = 1.0): number {
  if (archetype === "bush") return THREE.MathUtils.clamp(val, 0.55, 0.92);
  if (archetype === "rhizome") return THREE.MathUtils.clamp(val, 1.65, 2.60);
  return THREE.MathUtils.clamp(val, 0.85, 1.18);
}

export function rollTrunkGirthMod(archetype?: Archetype, mode?: MorphMode): number {
  const u = Math.random();
  if (archetype === "rhizome") {
    const raw =
      mode === "rhizome_lace"
        ? 0.22 + u * 0.16
        : mode === "rhizome_tuber"
          ? 0.46 + u * 0.22
          : 0.30 + u * 0.22;
    return clampTrunkGirthMod("rhizome", raw);
  }
  if (archetype === "bush") {
    const raw =
      mode === "bush_compact"
        ? 0.52 + u * 0.24
        : mode === "bush_giant"
          ? 0.90 + u * 0.28
          : 0.70 + u * 0.26;
    return clampTrunkGirthMod("bush", raw);
  }
  // tree: stout-to-monumental structural trunks
  const raw =
    mode === "filigree"
      ? 1.15 + u * 0.35
      : mode === "spire" || mode === "umbrella"
        ? 1.30 + u * 0.45
        : mode === "monolith"
          ? 1.60 + u * 0.65
          : 1.40 + u * 0.55;
  return clampTrunkGirthMod("tree", raw);
}

export function rollRambleFactor(archetype?: Archetype, mode?: MorphMode): number {
  const u = Math.random();
  if (archetype === "bush") {
    const raw =
      mode === "bush_compact"
        ? 0.55 + u * 0.15
        : mode === "bush_giant"
          ? 0.78 + u * 0.14
          : 0.66 + u * 0.16;
    return clampRambleFactor("bush", raw);
  }
  if (archetype === "rhizome") {
    const raw =
      mode === "rhizome_tuber"
        ? 1.65 + u * 0.40
        : mode === "rhizome_lace"
          ? 1.85 + u * 0.50
          : 2.05 + u * 0.55;
    return clampRambleFactor("rhizome", raw);
  }
  // tree: cohesive architectural canopy reach
  const raw =
    mode === "monolith" || mode === "spire"
      ? 0.85 + u * 0.18
      : mode === "umbrella"
        ? 0.95 + u * 0.20
        : 0.88 + u * 0.22;
  return clampRambleFactor("tree", raw);
}

export function computeInitialTrunkThickness(genome: Genome, zeroG: boolean = true): number {
  const girthMod = clampTrunkGirthMod(genome.archetype, genome.trunkGirthMod ?? 1.0);
  if (genome.archetype === "rhizome" || genome.growthHabit === "rhizome_web") {
    const base = THREE.MathUtils.clamp(genome.thicknessBase || 1.1, 0.55, 1.65);
    return THREE.MathUtils.clamp(base * 0.34 * girthMod, 0.10, 0.38);
  }
  if (genome.archetype === "bush") {
    const base = THREE.MathUtils.clamp(genome.thicknessBase || 1.5, 0.95, 2.20);
    return THREE.MathUtils.clamp(base * 0.42 * girthMod, 0.32, 0.86);
  }
  // tree (default): big, stout trunk column (diameter ~2.2..4.2 over trunk length ~8.5..11.5)
  const base = THREE.MathUtils.clamp(genome.thicknessBase || 2.8, 2.10, 3.80);
  return THREE.MathUtils.clamp(base * (zeroG ? 0.42 : 0.45) * girthMod, 1.10, 2.15);
}

export function assignGenomeMorphology(genome: Genome, forceMode?: MorphMode): Genome {
  let mode = forceMode || genome.morphMode;
  if (!mode || !isMorphModeValidForArchetype(genome.archetype, mode)) {
    mode = pickMorphModeForArchetype(genome.archetype);
  }
  genome.morphMode = mode;
  genome.trunkGirthMod = rollTrunkGirthMod(genome.archetype, mode);
  genome.rambleFactor = rollRambleFactor(genome.archetype, mode);
  const rand = Math.random();

  if (mode === "monolith") {
    genome.morphScale = 1.00 + rand * 0.35; genome.branchOrderCap = 5;
    genome.thicknessBase = 2.9 + rand * 0.8; genome.minThickness = 0.035 + rand * 0.020; genome.thicknessDecay = 0.985;
    genome.stepSize = 0.72 + rand * 0.22; genome.bifurcationRate = 0.018 + rand * 0.008; genome.branchTendency = 1.8 + rand * 0.8;
    genome.wanderIntensity = 0.03 + rand * 0.04; genome.growthHabit = "oak"; genome.canopyZone = "terminal";
  } else if (mode === "big_branching") {
    genome.morphScale = 0.95 + rand * 0.35; genome.branchOrderCap = 5;
    genome.thicknessBase = 2.7 + rand * 0.8; genome.minThickness = 0.035 + rand * 0.020; genome.thicknessDecay = 0.986;
    genome.stepSize = 0.70 + rand * 0.22; genome.bifurcationRate = 0.020 + rand * 0.010; genome.branchTendency = 2.2 + rand * 1.0;
    genome.wanderIntensity = 0.03 + rand * 0.05; genome.growthHabit = "oak"; genome.canopyZone = "terminal";
  } else if (mode === "candelabra") {
    genome.morphScale = 0.95 + rand * 0.35; genome.branchOrderCap = 5;
    genome.thicknessBase = 2.6 + rand * 0.7; genome.minThickness = 0.035 + rand * 0.020; genome.thicknessDecay = 0.988;
    genome.stepSize = 0.70 + rand * 0.22; genome.bifurcationRate = 0.018 + rand * 0.008; genome.branchTendency = 2.0 + rand * 0.8;
    genome.wanderIntensity = 0.03 + rand * 0.04; genome.growthHabit = "elm"; genome.canopyZone = "terminal";
  } else if (mode === "spire") {
    genome.morphScale = 0.90 + rand * 0.45; genome.branchOrderCap = 5;
    genome.thicknessBase = 2.5 + rand * 0.7; genome.minThickness = 0.035 + rand * 0.020; genome.thicknessDecay = 0.984;
    genome.stepSize = 0.68 + rand * 0.20; genome.bifurcationRate = 0.022 + rand * 0.010; genome.branchTendency = 2.4 + rand * 1.2;
    genome.wanderIntensity = 0.02 + rand * 0.04; genome.growthHabit = "pine";
  } else if (mode === "umbrella") {
    genome.morphScale = 0.90 + rand * 0.45; genome.branchOrderCap = 5;
    genome.thicknessBase = 2.6 + rand * 0.7; genome.minThickness = 0.035 + rand * 0.020; genome.thicknessDecay = 0.984;
    genome.stepSize = 0.68 + rand * 0.20; genome.bifurcationRate = 0.024 + rand * 0.012; genome.branchTendency = 2.8 + rand * 1.4;
    genome.wanderIntensity = 0.04 + rand * 0.05; genome.growthHabit = "elm";
  } else if (mode === "filigree") {
    genome.morphScale = 0.70 + rand * 0.40; genome.branchOrderCap = 6;
    genome.thicknessBase = 2.3 + rand * 0.6; genome.minThickness = 0.030 + rand * 0.018; genome.thicknessDecay = 0.978;
    genome.stepSize = 0.58 + rand * 0.18; genome.bifurcationRate = 0.032 + rand * 0.016; genome.branchTendency = 3.8 + rand * 1.8;
    genome.wanderIntensity = 0.04 + rand * 0.05; genome.growthHabit = "oak";
  } else if (mode === "bush_compact") {
    genome.morphScale = 0.55 + rand * 0.22; genome.branchOrderCap = 3;
    genome.thicknessBase = 1.15 + rand * 0.30; genome.minThickness = 0.07 + rand * 0.03; genome.thicknessDecay = 0.988;
    genome.stepSize = 0.52 + rand * 0.16; genome.bifurcationRate = 0.24 + rand * 0.10; genome.branchTendency = 4.2 + rand * 2.5;
    genome.wanderIntensity = 0.42 + rand * 0.25;
  } else if (mode === "bush_medium") {
    genome.morphScale = 0.80 + rand * 0.28; genome.branchOrderCap = 4;
    genome.thicknessBase = 1.40 + rand * 0.35; genome.minThickness = 0.08 + rand * 0.04; genome.thicknessDecay = 0.990;
    genome.stepSize = 0.58 + rand * 0.18; genome.bifurcationRate = 0.25 + rand * 0.10; genome.branchTendency = 4.6 + rand * 3.0;
    genome.wanderIntensity = 0.45 + rand * 0.25;
  } else if (mode === "bush_giant") {
    genome.morphScale = 1.05 + rand * 0.35; genome.branchOrderCap = 4;
    genome.thicknessBase = 1.65 + rand * 0.45; genome.minThickness = 0.09 + rand * 0.04; genome.thicknessDecay = 0.991;
    genome.stepSize = 0.64 + rand * 0.18; genome.bifurcationRate = 0.23 + rand * 0.10; genome.branchTendency = 4.5 + rand * 3.0;
    genome.wanderIntensity = 0.42 + rand * 0.25;
  } else if (mode === "rhizome_tuber") {
    genome.morphScale = 0.95 + rand * 0.45; genome.branchOrderCap = 3;
    genome.thicknessBase = 1.15 + rand * 0.35; genome.minThickness = 0.06 + rand * 0.03; genome.thicknessDecay = 0.984;
    genome.stepSize = 0.78 + rand * 0.25; genome.bifurcationRate = 0.04 + rand * 0.03; genome.branchTendency = 1.8 + rand * 1.0;
    genome.wanderIntensity = 0.12 + rand * 0.12; genome.growthHabit = "rhizome_web";
  } else if (mode === "rhizome_stolon") {
    genome.morphScale = 0.85 + rand * 0.50; genome.branchOrderCap = 3;
    genome.thicknessBase = 0.90 + rand * 0.35; genome.minThickness = 0.045 + rand * 0.025; genome.thicknessDecay = 0.982;
    genome.stepSize = 0.98 + rand * 0.32; genome.bifurcationRate = 0.06 + rand * 0.04; genome.branchTendency = 2.4 + rand * 1.2;
    genome.wanderIntensity = 0.18 + rand * 0.16; genome.growthHabit = "rhizome_web";
  } else if (mode === "rhizome_lace") {
    genome.morphScale = 0.65 + rand * 0.42; genome.branchOrderCap = 4;
    genome.thicknessBase = 0.68 + rand * 0.28; genome.minThickness = 0.028 + rand * 0.016; genome.thicknessDecay = 0.978;
    genome.stepSize = 0.78 + rand * 0.26; genome.bifurcationRate = 0.08 + rand * 0.04; genome.branchTendency = 3.0 + rand * 1.5;
    genome.wanderIntensity = 0.14 + rand * 0.14; genome.growthHabit = "rhizome_web";
  }

  if (genome.morphScale) {
    genome.morphScale *= 1.0 + (genome.rambleFactor - 1.0) * 0.25;
  }

  if (genome.archetype === "tree") {
    genome.geometryType = genome.geometryType === "ribbon" ? "cylinder" : (genome.geometryType || "cylinder");
    genome.windStyle = "stiff";
  }

  if (genome.recessive) {
    genome.recessive.morphMode = pickMorphModeForArchetype(genome.recessive.archetype || genome.archetype, genome.morphMode);
    genome.recessive.trunkGirthMod = rollTrunkGirthMod(genome.recessive.archetype, genome.recessive.morphMode);
    genome.recessive.rambleFactor = rollRambleFactor(genome.recessive.archetype, genome.recessive.morphMode);
  }
  return genome;
}

export function inheritGenomeMorphology(child: Genome, g1: Genome, g2: Genome): Genome {
  const p1Allele = Math.random() < 0.25 && g1.recessive?.morphMode ? g1.recessive.morphMode : g1.morphMode;
  const p2Allele = Math.random() < 0.25 && g2.recessive?.morphMode ? g2.recessive.morphMode : g2.morphMode;
  const sameArchParents = [g1, g2].filter((p) => p.archetype === child.archetype);
  const parent =
    sameArchParents.length > 0
      ? sameArchParents[Math.floor(Math.random() * sameArchParents.length)]
      : Math.random() < 0.5
        ? g1
        : g2;
  const rawMode = Math.random() < 0.5 ? p1Allele : p2Allele;

  let chosenMode: MorphMode;
  if (Math.random() < 0.15) {
    chosenMode = pickMorphModeForArchetype(child.archetype);
  } else if (rawMode && isMorphModeValidForArchetype(child.archetype, rawMode)) {
    chosenMode = rawMode;
  } else {
    const isMacro = rawMode === "monolith" || rawMode === "big_branching" || rawMode === "candelabra" || rawMode === "bush_giant" || rawMode === "rhizome_tuber";
    const isMicro = rawMode === "filigree" || rawMode === "bush_compact" || rawMode === "rhizome_lace";
    if (child.archetype === "tree") chosenMode = isMacro ? (Math.random() < 0.5 ? "monolith" : "big_branching") : isMicro ? "filigree" : "umbrella";
    else if (child.archetype === "bush") chosenMode = isMacro ? "bush_giant" : isMicro ? "bush_compact" : "bush_medium";
    else chosenMode = isMacro ? "rhizome_tuber" : isMicro ? "rhizome_lace" : "rhizome_stolon";
  }

  const priorThickBase = child.thicknessBase;
  assignGenomeMorphology(child, chosenMode);
  if (priorThickBase && parent.archetype === child.archetype) {
    child.thicknessBase = priorThickBase * 0.55 + child.thicknessBase * 0.45;
  }

  if (parent.morphScale && child.morphScale && parent.archetype === child.archetype) {
    child.morphScale = child.morphScale * 0.85 + parent.morphScale * 0.15 * (0.9 + Math.random() * 0.2);
  }
  if (parent.archetype !== child.archetype || Math.random() < 0.35) {
    child.trunkGirthMod = rollTrunkGirthMod(child.archetype, chosenMode);
  } else {
    const parentGirth = parent.trunkGirthMod ?? rollTrunkGirthMod(child.archetype, chosenMode);
    child.trunkGirthMod = clampTrunkGirthMod(child.archetype, parentGirth * (0.82 + Math.random() * 0.36));
  }
  if (parent.archetype !== child.archetype || Math.random() < 0.35) {
    child.rambleFactor = rollRambleFactor(child.archetype, chosenMode);
  } else {
    const parentRamble = parent.rambleFactor ?? rollRambleFactor(child.archetype, chosenMode);
    child.rambleFactor = clampRambleFactor(child.archetype, parentRamble * (0.88 + Math.random() * 0.26));
  }
  return child;
}

export function getBushMorphScale(genome?: Genome): number {
  return genome?.morphScale ?? (genome?.morphMode === "bush_compact" ? 0.5 : genome?.morphMode === "bush_giant" ? 1.5 : 1.0);
}

export function getOrganismBudgetMultiplier(genome?: Genome): number {
  if (!genome) return 1.0;
  if (genome.archetype === "tree") {
    return THREE.MathUtils.clamp((genome.morphScale ?? 1.15) * 1.15, 1.05, 1.65);
  }
  let mult = 1.0;
  if (
    genome.morphMode === "rhizome_tuber" ||
    genome.morphMode === "bush_giant"
  ) {
    const scale = genome.morphMode === "rhizome_tuber" ? 0.50 : 0.65;
    mult = THREE.MathUtils.clamp((genome.morphScale ?? 1.2) * scale, 0.50, 1.15);
  } else if (genome.morphMode === "filigree" || genome.morphMode === "rhizome_lace") {
    mult = THREE.MathUtils.clamp((genome.morphScale ?? 1.0) * 1.35, 1.1, 1.55);
  } else {
    mult = THREE.MathUtils.clamp(genome.morphScale ?? 1.0, 0.55, 1.45);
  }
  const rambleBoost = 1.0 + Math.max(0, (genome.rambleFactor ?? 1.0) - 1.0) * 0.35;
  return THREE.MathUtils.clamp(mult * rambleBoost, 0.50, 1.85);
}

export function isBigBranchingMode(genome?: Genome): boolean {
  return (
    genome?.morphMode === "monolith" ||
    genome?.morphMode === "big_branching" ||
    genome?.morphMode === "candelabra" ||
    genome?.morphMode === "rhizome_tuber"
  );
}

export function isFiligreeMode(genome?: Genome): boolean {
  return (
    genome?.morphMode === "filigree" ||
    genome?.morphMode === "rhizome_lace" ||
    genome?.morphMode === "bush_compact"
  );
}
