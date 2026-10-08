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
  monolith: { trunkLength: 7.5, crownDivision: 3, divisionSpreadDeg: 44, trunkLateralsFrom: 0.45, limbLength: 14.5, lengthRatio: 0.74, lateralSpacing: 0.42, lateralAngleDeg: 46, lateralAlpha: 0.44, forkAngleDeg: 40, endTaper: 0.74, stepMin: 0.85, stepMax: 1.65, maxDepth: 3, flareBoost: 0.16 },
  big_branching: { trunkLength: 7.2, crownDivision: 3, divisionSpreadDeg: 40, trunkLateralsFrom: 0.42, limbLength: 15.0, lengthRatio: 0.74, lateralSpacing: 0.40, lateralAngleDeg: 44, lateralAlpha: 0.42, forkAngleDeg: 38, endTaper: 0.74, stepMin: 0.82, stepMax: 1.60, maxDepth: 3, flareBoost: 0.16 },
  candelabra: { trunkLength: 6.8, crownDivision: 3, divisionSpreadDeg: 40, trunkLateralsFrom: 0.45, limbLength: 15.5, lengthRatio: 0.75, lateralSpacing: 0.44, lateralAngleDeg: 42, lateralAlpha: 0.42, forkAngleDeg: 38, endTaper: 0.75, stepMin: 0.82, stepMax: 1.60, maxDepth: 3, noMidBranchLaterals: false, flareBoost: 0.15 },
  oak: { trunkLength: 6.8, crownDivision: 3, divisionSpreadDeg: 40, trunkLateralsFrom: 0.42, limbLength: 14.5, lengthRatio: 0.73, lateralSpacing: 0.38, lateralAngleDeg: 44, lateralAlpha: 0.38, forkAngleDeg: 38, endTaper: 0.70, stepMin: 0.78, stepMax: 1.50, maxDepth: 3, flareBoost: 0.15 },
  elm: { trunkLength: 7.2, crownDivision: 3, divisionSpreadDeg: 36, trunkLateralsFrom: 0.45, limbLength: 15.0, lengthRatio: 0.72, lateralSpacing: 0.38, lateralAngleDeg: 40, lateralAlpha: 0.36, forkAngleDeg: 36, endTaper: 0.68, stepMin: 0.78, stepMax: 1.50, maxDepth: 3, flareBoost: 0.14 },
  pine: { trunkLength: 8.0, crownDivision: 3, divisionSpreadDeg: 36, trunkLateralsFrom: 0.35, limbLength: 13.5, lengthRatio: 0.72, lateralSpacing: 0.38, lateralAngleDeg: 48, lateralAlpha: 0.38, forkAngleDeg: 36, endTaper: 0.70, stepMin: 0.78, stepMax: 1.50, maxDepth: 3, whorlSpacing: 4.0, flareBoost: 0.14 },
  filigree: { trunkLength: 6.2, crownDivision: 3, divisionSpreadDeg: 40, trunkLateralsFrom: 0.40, limbLength: 13.5, lengthRatio: 0.75, lateralSpacing: 0.34, lateralAngleDeg: 42, lateralAlpha: 0.36, forkAngleDeg: 38, endTaper: 0.76, stepMin: 0.70, stepMax: 1.35, maxDepth: 4, flareBoost: 0.10 },
  rhizome: { trunkLength: 3.5, crownDivision: 4, divisionSpreadDeg: 68, trunkLateralsFrom: 0.80, limbLength: 15.0, lengthRatio: 0.75, lateralSpacing: 0.38, lateralAngleDeg: 50, lateralAlpha: 0.36, forkAngleDeg: 42, endTaper: 0.62, stepMin: 0.76, stepMax: 1.50, maxDepth: 3 },
  rhizome_tuber: { trunkLength: 4.5, crownDivision: 4, divisionSpreadDeg: 58, trunkLateralsFrom: 0.75, limbLength: 15.5, lengthRatio: 0.74, lateralSpacing: 0.42, lateralAngleDeg: 50, lateralAlpha: 0.38, forkAngleDeg: 42, endTaper: 0.62, stepMin: 0.82, stepMax: 1.60, maxDepth: 3, flareBoost: 0.16 },
  rhizome_lace: { trunkLength: 2.8, crownDivision: 4, divisionSpreadDeg: 74, trunkLateralsFrom: 0.82, limbLength: 14.0, lengthRatio: 0.75, lateralSpacing: 0.34, lateralAngleDeg: 46, lateralAlpha: 0.34, forkAngleDeg: 40, endTaper: 0.74, stepMin: 0.70, stepMax: 1.35, maxDepth: 4 },
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

export function rollTrunkGirthMod(archetype?: Archetype, mode?: MorphMode): number {
  const tier = Math.random();
  const raw =
    tier < 0.30
      ? 0.34 + Math.random() * 0.24
      : tier < 0.65
        ? 0.68 + Math.random() * 0.48
        : 1.35 + Math.random() * 1.05;
  const modeMult =
    mode === "monolith" || mode === "bush_giant" || mode === "rhizome_tuber"
      ? 1.15
      : mode === "filigree" || mode === "bush_compact" || mode === "rhizome_lace"
        ? 0.78
        : 1.0;
  return THREE.MathUtils.clamp(raw * modeMult, 0.28, 2.60);
}

export function rollRambleFactor(archetype?: Archetype, mode?: MorphMode): number {
  const r = Math.random();
  return r < 0.30 ? 0.95 + Math.random() * 0.35 : 1.45 + Math.random() * 1.05;
}

export function computeInitialTrunkThickness(genome: Genome, zeroG: boolean = true): number {
  const girthMod = genome.trunkGirthMod ?? 1.0;
  if (genome.archetype === "rhizome" || genome.growthHabit === "rhizome_web") {
    const base = Math.max(0.55, genome.thicknessBase || 1.6);
    return THREE.MathUtils.clamp(base * 0.38 * girthMod, 0.15, 1.85);
  }
  if (genome.archetype === "bush") {
    const base = Math.max(0.55, genome.thicknessBase || 1.6);
    return THREE.MathUtils.clamp(base * 0.48 * girthMod, 0.18, 2.10);
  }
  // tree (default)
  const base = Math.max(0.75, genome.thicknessBase || 3.0);
  return THREE.MathUtils.clamp(base * (zeroG ? 0.30 : 0.34) * girthMod, 0.22, 2.45);
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
    genome.morphScale = 1.05 + rand * 0.45; genome.branchOrderCap = 3;
    genome.thicknessBase = 3.2 + rand * 0.9; genome.minThickness = 0.14 + rand * 0.08; genome.thicknessDecay = 0.985;
    genome.stepSize = 0.78 + rand * 0.25; genome.bifurcationRate = 0.018 + rand * 0.008; genome.branchTendency = 1.8 + rand * 0.8;
    genome.wanderIntensity = 0.03 + rand * 0.04; genome.growthHabit = "oak"; genome.canopyZone = "terminal";
  } else if (mode === "big_branching") {
    genome.morphScale = 1.00 + rand * 0.45; genome.branchOrderCap = 3;
    genome.thicknessBase = 3.0 + rand * 0.8; genome.minThickness = 0.12 + rand * 0.06; genome.thicknessDecay = 0.986;
    genome.stepSize = 0.75 + rand * 0.25; genome.bifurcationRate = 0.020 + rand * 0.010; genome.branchTendency = 2.2 + rand * 1.0;
    genome.wanderIntensity = 0.03 + rand * 0.05; genome.growthHabit = "oak"; genome.canopyZone = "terminal";
  } else if (mode === "candelabra") {
    genome.morphScale = 0.95 + rand * 0.45; genome.branchOrderCap = 3;
    genome.thicknessBase = 2.8 + rand * 0.8; genome.minThickness = 0.12 + rand * 0.06; genome.thicknessDecay = 0.988;
    genome.stepSize = 0.75 + rand * 0.25; genome.bifurcationRate = 0.018 + rand * 0.008; genome.branchTendency = 2.0 + rand * 0.8;
    genome.wanderIntensity = 0.03 + rand * 0.04; genome.growthHabit = "elm"; genome.canopyZone = "terminal";
  } else if (mode === "spire") {
    genome.morphScale = 0.90 + rand * 0.60; genome.branchOrderCap = 3;
    genome.thicknessBase = 2.6 + rand * 0.8; genome.minThickness = 0.08 + rand * 0.06; genome.thicknessDecay = 0.984;
    genome.stepSize = 0.72 + rand * 0.24; genome.bifurcationRate = 0.022 + rand * 0.010; genome.branchTendency = 2.4 + rand * 1.2;
    genome.wanderIntensity = 0.02 + rand * 0.04; genome.growthHabit = "pine";
  } else if (mode === "umbrella") {
    genome.morphScale = 0.90 + rand * 0.60; genome.branchOrderCap = 3;
    genome.thicknessBase = 2.6 + rand * 0.8; genome.minThickness = 0.08 + rand * 0.06; genome.thicknessDecay = 0.984;
    genome.stepSize = 0.72 + rand * 0.24; genome.bifurcationRate = 0.024 + rand * 0.012; genome.branchTendency = 2.8 + rand * 1.4;
    genome.wanderIntensity = 0.04 + rand * 0.05; genome.growthHabit = "elm";
  } else if (mode === "filigree") {
    genome.morphScale = 0.55 + rand * 0.55; genome.branchOrderCap = 4;
    genome.thicknessBase = 2.0 + rand * 0.6; genome.minThickness = 0.025 + rand * 0.015; genome.thicknessDecay = 0.978;
    genome.stepSize = 0.62 + rand * 0.22; genome.bifurcationRate = 0.032 + rand * 0.016; genome.branchTendency = 3.8 + rand * 1.8;
    genome.wanderIntensity = 0.04 + rand * 0.05; genome.growthHabit = "oak";
  } else if (mode === "bush_compact") {
    genome.morphScale = 0.55 + rand * 0.25; genome.branchOrderCap = 3;
    genome.thicknessBase = 1.15 + rand * 0.35; genome.minThickness = 0.08 + rand * 0.04; genome.thicknessDecay = 0.988;
    genome.stepSize = 0.58 + rand * 0.18; genome.bifurcationRate = 0.22 + rand * 0.10; genome.branchTendency = 4.0 + rand * 2.5;
    genome.wanderIntensity = 0.40 + rand * 0.25;
  } else if (mode === "bush_medium") {
    genome.morphScale = 0.90 + rand * 0.35; genome.branchOrderCap = 4;
    genome.thicknessBase = 1.45 + rand * 0.35; genome.minThickness = 0.09 + rand * 0.04; genome.thicknessDecay = 0.990;
    genome.stepSize = 0.64 + rand * 0.18; genome.bifurcationRate = 0.24 + rand * 0.10; genome.branchTendency = 4.5 + rand * 3.0;
    genome.wanderIntensity = 0.45 + rand * 0.25;
  } else if (mode === "bush_giant") {
    genome.morphScale = 1.25 + rand * 0.45; genome.branchOrderCap = 4;
    genome.thicknessBase = 1.75 + rand * 0.55; genome.minThickness = 0.10 + rand * 0.05; genome.thicknessDecay = 0.991;
    genome.stepSize = 0.72 + rand * 0.20; genome.bifurcationRate = 0.22 + rand * 0.10; genome.branchTendency = 4.5 + rand * 3.0;
    genome.wanderIntensity = 0.42 + rand * 0.25;
  } else if (mode === "rhizome_tuber") {
    genome.morphScale = 0.95 + rand * 0.45; genome.branchOrderCap = 3;
    genome.thicknessBase = 1.7 + rand * 0.5; genome.minThickness = 0.08 + rand * 0.05; genome.thicknessDecay = 0.984;
    genome.stepSize = 0.75 + rand * 0.25; genome.bifurcationRate = 0.04 + rand * 0.03; genome.branchTendency = 1.8 + rand * 1.0;
    genome.wanderIntensity = 0.12 + rand * 0.12; genome.growthHabit = "rhizome_web";
  } else if (mode === "rhizome_stolon") {
    genome.morphScale = 0.75 + rand * 0.50; genome.branchOrderCap = 3;
    genome.thicknessBase = 1.35 + rand * 0.55; genome.minThickness = 0.055 + rand * 0.035; genome.thicknessDecay = 0.982;
    genome.stepSize = 0.96 + rand * 0.32; genome.bifurcationRate = 0.06 + rand * 0.04; genome.branchTendency = 2.4 + rand * 1.2;
    genome.wanderIntensity = 0.18 + rand * 0.16; genome.growthHabit = "rhizome_web";
  } else if (mode === "rhizome_lace") {
    genome.morphScale = 0.55 + rand * 0.42; genome.branchOrderCap = 4;
    genome.thicknessBase = 0.80 + rand * 0.40; genome.minThickness = 0.030 + rand * 0.020; genome.thicknessDecay = 0.978;
    genome.stepSize = 0.75 + rand * 0.26; genome.bifurcationRate = 0.08 + rand * 0.04; genome.branchTendency = 3.0 + rand * 1.5;
    genome.wanderIntensity = 0.14 + rand * 0.14; genome.growthHabit = "rhizome_web";
  }

  if (genome.morphScale) {
    genome.morphScale *= 1.0 + (genome.rambleFactor - 1.0) * 0.25;
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
  const parent = Math.random() < 0.5 ? g1 : g2;
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
  child.thicknessBase = priorThickBase ? (priorThickBase * 0.65 + child.thicknessBase * 0.35) : child.thicknessBase;

  if (parent.morphScale && child.morphScale) {
    child.morphScale = child.morphScale * 0.85 + parent.morphScale * 0.15 * (0.9 + Math.random() * 0.2);
  }
  if (Math.random() < 0.35) {
    child.trunkGirthMod = rollTrunkGirthMod(child.archetype, chosenMode);
  } else {
    const parentGirth = parent.trunkGirthMod ?? 1.0;
    child.trunkGirthMod = THREE.MathUtils.clamp(parentGirth * (0.78 + Math.random() * 0.48), 0.28, 2.60);
  }
  if (Math.random() < 0.35) {
    child.rambleFactor = rollRambleFactor(child.archetype, chosenMode);
  } else {
    const parentRamble = parent.rambleFactor ?? 1.2;
    child.rambleFactor = THREE.MathUtils.clamp(parentRamble * (0.85 + Math.random() * 0.35), 0.90, 2.55);
  }
  return child;
}

export function getBushMorphScale(genome?: Genome): number {
  return genome?.morphScale ?? (genome?.morphMode === "bush_compact" ? 0.5 : genome?.morphMode === "bush_giant" ? 1.5 : 1.0);
}

export function getOrganismBudgetMultiplier(genome?: Genome): number {
  if (!genome) return 1.0;
  let mult = 1.0;
  if (
    genome.morphMode === "monolith" ||
    genome.morphMode === "big_branching" ||
    genome.morphMode === "candelabra" ||
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
