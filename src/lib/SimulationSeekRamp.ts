import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";

/** Simulation ticks per second at speed=1 (timeScale=1 at 60 FPS). */
export const TICKS_PER_SECOND = 60;
/** Default hybrid cooldown in seconds at speed=1. */
export const DEFAULT_HYBRID_COOLDOWN_SECONDS = 3;
/** Duration (in seconds at speed=1) over which seeking ramps from 0% to 100% after the free-growth window. */
export const SEEK_RAMP_SECONDS = 2;

/**
 * Returns `engine.hybridCooldown` normalized to seconds (at speed=1).
 * Legacy tick values (> 30, e.g. 50, 300, 481.46, 650 from old localStorage or test scripts)
 * are automatically converted via `val / 60`.
 */
export function getHybridCooldownSeconds(engine: SimulationEngine): number {
  const raw = engine.hybridCooldown;
  if (raw === undefined || raw === null || isNaN(raw) || raw <= 0) {
    return DEFAULT_HYBRID_COOLDOWN_SECONDS;
  }
  return raw > 30 ? raw / TICKS_PER_SECOND : raw;
}

/**
 * Returns `hybridCooldown` in simulation ticks (`seconds * 60`).
 * At the default 3.0s cooldown, this returns 180 ticks.
 */
export function getHybridCooldownTicks(engine: SimulationEngine): number {
  return getHybridCooldownSeconds(engine) * TICKS_PER_SECOND;
}

/**
 * Minimum strain age (in ticks) before an organism can physically mate (`max(3s, hybridCooldown)`).
 */
export function getFertilityMinTicks(engine: SimulationEngine): number {
  return Math.max(
    DEFAULT_HYBRID_COOLDOWN_SECONDS * TICKS_PER_SECOND,
    getHybridCooldownTicks(engine),
  );
}

/**
 * Computes a creature's seeking ramp factor in `[0, 1]`:
 * - During the entire `hybridCooldown` delay (`3.0s` = `180` ticks at default `3.0s`, `speed=1`,
 *   both after initial birth and after any mating cooldown):
 *   returns `0` (100% seek-free growth so all creatures share the same delay as trees).
 * - Over the next `2.0s` (`120` ticks at `speed=1`, i.e. `3.0s -> 5.0s` at default `3.0s`):
 *   linearly ramps from `0.0` to `1.0` (`0% -> 100%` seeking).
 */
export function getSeekRamp(
  engine: SimulationEngine,
  agent: Agent,
  strainAge?: number,
): number {
  if (agent.isFeeler) return 1.0;
  const evalGenome =
    agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome;
  const ageTicks =
    strainAge !== undefined
      ? strainAge
      : evalGenome?.createdAt !== undefined
        ? engine.time - evalGenome.createdAt
        : engine.time;

  const freeGrowthTicks = getHybridCooldownTicks(engine);
  const rampTicks = Math.max(1, SEEK_RAMP_SECONDS * TICKS_PER_SECOND);
  const lifecycle = (engine as any).speciesLifecycleMap?.get(evalGenome?.name);
  const cooldownUntil = Math.max(
    lifecycle?.cooldownUntil ?? -Infinity,
    evalGenome?.cooldownUntil ?? -Infinity,
  );
  const ticksPastDelay = Number.isFinite(cooldownUntil)
    ? Math.min(ageTicks - freeGrowthTicks, engine.time - cooldownUntil)
    : ageTicks - freeGrowthTicks;

  if (ticksPastDelay <= 0 || (agent.cooldown ?? 0) > 0) {
    return 0;
  }
  return THREE.MathUtils.clamp(ticksPastDelay / rampTicks, 0, 1);
}

/** Minimum distance (world units) from an organism's birth point or last mating point before it can mate again. */
export const MIN_NEXUS_DISPERSAL_DIST = 18;
export const MIN_NEXUS_DISPERSAL_DIST_SQ = MIN_NEXUS_DISPERSAL_DIST * MIN_NEXUS_DISPERSAL_DIST;

export function isSpeciesOnCooldown(
  engine: SimulationEngine,
  strainName: string,
  genome?: any,
): boolean {
  const lifecycle = (engine as any).speciesLifecycleMap?.get(strainName);
  const until = Math.max(
    lifecycle?.cooldownUntil ?? -Infinity,
    genome?.cooldownUntil ?? -Infinity,
  );
  return engine.time < until;
}

export function setSpeciesCooldown(
  engine: SimulationEngine,
  strainName: string,
  genome: any,
  cdTicks: number,
): void {
  const until = engine.time + cdTicks;
  if (genome) {
    genome.cooldownUntil = Math.max(genome.cooldownUntil ?? -Infinity, until);
  }
  const map = (engine as any).speciesLifecycleMap;
  if (map) {
    const entry = map.get(strainName);
    if (entry) {
      entry.cooldownUntil = Math.max(entry.cooldownUntil ?? -Infinity, until);
    }
  }
}

export function recordSpeciesMatingPair(
  engine: SimulationEngine,
  parent1Strain: string,
  parent1Genome: any,
  parent2Strain: string,
  parent2Genome: any,
  childStrain: string,
  childGenome: any,
  nexusPos: THREE.Vector3,
): void {
  const map = (engine as any).speciesLifecycleMap;
  const s1 = map?.get(parent1Strain);
  const s2 = map?.get(parent2Strain);
  const sc = map?.get(childStrain);

  for (const obj of [parent1Genome, s1]) {
    if (!obj) continue;
    if (!obj.matedPartners) obj.matedPartners = new Set<string>();
    obj.matedPartners.add(parent2Strain);
    obj.lastMatingPos = nexusPos.clone();
  }
  for (const obj of [parent2Genome, s2]) {
    if (!obj) continue;
    if (!obj.matedPartners) obj.matedPartners = new Set<string>();
    obj.matedPartners.add(parent1Strain);
    obj.lastMatingPos = nexusPos.clone();
  }
  for (const obj of [childGenome, sc]) {
    if (!obj) continue;
    obj.parentStrains = [parent1Strain, parent2Strain];
    obj.birthPos = nexusPos.clone();
  }
}

export function areStrainsCompatibleForMating(
  engine: SimulationEngine,
  strainA: string,
  genomeA: any,
  strainB: string,
  genomeB: any,
): boolean {
  if (!strainA || !strainB || strainA === strainB) return false;
  const map = (engine as any).speciesLifecycleMap;
  const sA = map?.get(strainA);
  const sB = map?.get(strainB);

  // Never allow the exact same pair of species to repeatedly mate with each other
  if (
    genomeA?.matedPartners?.has?.(strainB) ||
    sA?.matedPartners?.has?.(strainB) ||
    genomeB?.matedPartners?.has?.(strainA) ||
    sB?.matedPartners?.has?.(strainA)
  ) {
    return false;
  }

  const parentsA: string[] | undefined = genomeA?.parentStrains || sA?.parentStrains;
  const parentsB: string[] | undefined = genomeB?.parentStrains || sB?.parentStrains;

  const livingCount =
    typeof engine.getLivingOrganismCount === "function"
      ? engine.getLivingOrganismCount()
      : 4;

  // Once >= 4 organisms exist, prevent direct parent-offspring back-breeding and full-sibling inbreeding
  if (livingCount >= 4) {
    if (parentsA?.includes(strainB) || parentsB?.includes(strainA)) {
      return false;
    }
    if (
      parentsA &&
      parentsB &&
      parentsA.length === 2 &&
      parentsB.length === 2 &&
      ((parentsA[0] === parentsB[0] && parentsA[1] === parentsB[1]) ||
        (parentsA[0] === parentsB[1] && parentsA[1] === parentsB[0]))
    ) {
      return false;
    }
  }
  return true;
}

export function isOutsideMatingNexus(
  engine: SimulationEngine,
  strainA: string,
  genomeA: any,
  strainB: string,
  genomeB: any,
  pos: { x: number; y: number; z: number },
): boolean {
  const map = (engine as any).speciesLifecycleMap;
  const sA = map?.get(strainA);
  const sB = map?.get(strainB);
  const anchors: (THREE.Vector3 | undefined)[] = [
    genomeA?.birthPos,
    sA?.birthPos,
    genomeA?.lastMatingPos,
    sA?.lastMatingPos,
    genomeB?.birthPos,
    sB?.birthPos,
    genomeB?.lastMatingPos,
    sB?.lastMatingPos,
  ];
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    if (!a) continue;
    const dx = pos.x - a.x;
    const dy = pos.y - a.y;
    const dz = pos.z - a.z;
    if (dx * dx + dy * dy + dz * dz < MIN_NEXUS_DISPERSAL_DIST_SQ) {
      return false;
    }
  }
  return true;
}

