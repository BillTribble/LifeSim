import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import { DROUGHT_STEPS, getStepsSinceLastMating, isBreedingDrought, isInbreedingRelaxed, isRecentPartner } from "./SimulationDrought";

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
 * Fertility is based on growth, not engine ticks (plan 3.2).
 */
export const FERTILITY_MIN_GROWTH_STEPS = 20;
export const FERTILITY_MIN_SEGMENTS = 22;
/** Post-mating cooldown in growth steps (converted to ticks per archetype). */
export const POST_MATING_COOLDOWN_STEPS = 32;
/** Target organism lifespan in growth steps; drives the global birth throttle. */
export const TARGET_LIFESPAN_STEPS = 420;

/** Archetype growth-speed multiplier, as applied per frame in processAgents. */
export function getArchetypeSpeed(engine: SimulationEngine, archetype?: string): number {
  if (archetype === "bush") return engine.bushSpeed ?? 1;
  if (archetype === "tree" || archetype === "rhizome") return engine.treeSpeed ?? 0.8;
  return 1;
}

/** Nominal growth steps an organism has taken: ageTicks x growthSpeed x archetype speed. */
export function getOrganismGrowthSteps(engine: SimulationEngine, genome: any): number {
  const ageTicks = genome?.createdAt !== undefined ? engine.time - genome.createdAt : engine.time;
  return Math.max(0, ageTicks) * (engine.growthSpeed || 0.06) * getArchetypeSpeed(engine, genome?.archetype);
}

/** Converts growth steps to engine ticks for an organism of this archetype. */
export function growthStepsToTicks(engine: SimulationEngine, steps: number, archetype?: string): number {
  return steps / Math.max(1e-4, (engine.growthSpeed || 0.06) * getArchetypeSpeed(engine, archetype));
}

/** Post-mating cooldown in ticks: at least hybridCooldown, and at least POST_MATING_COOLDOWN_STEPS of growth. */
export function getPostMatingCooldownTicks(engine: SimulationEngine, genome: any): number {
  return Math.max(
    getHybridCooldownTicks(engine),
    growthStepsToTicks(engine, POST_MATING_COOLDOWN_STEPS, genome?.archetype),
  );
}

/** Birth interval (growth steps) at/below minCreatures and at maxCreatures; interpolated between. */
export const BIRTH_INTERVAL_MIN_STEPS = 10;
export const BIRTH_INTERVAL_MAX_STEPS = 42;

/**
 * Global birth throttle, population-dependent: a sparse world refills steadily, and a full world
 * maintains a gentle ambient cadence of new births and turnover at speed=1.
 */
export function getBirthIntervalTicks(engine: SimulationEngine): number {
  const isSoft = !!(engine as any)._isSoftwareRaster;
  const minC = isSoft ? Math.min(3, engine.minCreatures ?? 4) : (engine.minCreatures ?? 4);
  const maxC = isSoft ? Math.max(minC + 1, Math.min(4, engine.maxCreatures || 5)) : Math.max(minC + 1, engine.maxCreatures || 5);
  const living = getLivingCountCached(engine);
  const frac = Math.min(1, Math.max(0, (living - minC) / (maxC - minC)));
  const minSteps = minC > 8 && living < minC
    ? Math.max(4, Math.round(BIRTH_INTERVAL_MIN_STEPS * (6 / minC)))
    : BIRTH_INTERVAL_MIN_STEPS;
  const steps = minSteps + (BIRTH_INTERVAL_MAX_STEPS - minSteps) * Math.pow(frac, 1.2);
  return steps / Math.max(1e-4, engine.growthSpeed || 0.06);
}

export function isBirthThrottled(engine: SimulationEngine): boolean {
  const last = (engine as any)._lastBirthTime;
  return typeof last === "number" && engine.time - last < getBirthIntervalTicks(engine) && engine.time >= last;
}

export function recordBirth(engine: SimulationEngine): void {
  (engine as any)._lastBirthTime = engine.time;
}

/** Growth steps past fertility after which an unmated organism becomes desperate. */
export const DESPERATION_EXTRA_STEPS = 75;

function getLivingCountCached(engine: SimulationEngine): number {
  const c = (engine as any)._livingCountCache;
  if (c && c.frame === engine.frameCount && c.time === engine.time) return c.n;
  const n =
    typeof engine.getLivingOrganisms === "function"
      ? engine.getLivingOrganisms().size
      : typeof engine.getLivingOrganismCount === "function"
        ? engine.getLivingOrganismCount()
        : 0;
  (engine as any)._livingCountCache = { frame: engine.frameCount, time: engine.time, n };
  return n;
}

/**
 * Desperate organisms seek farther: the population is below minCreatures (e.g. the two
 * founders spawned far apart), there has been no birth for DROUGHT_STEPS, the organism has grown long past fertility, or the tip is old.
 */
export function isOrganismDesperate(engine: SimulationEngine, genome: any, tipAgeSteps: number): boolean {
  if (getLivingCountCached(engine) < (engine.minCreatures ?? 0)) return true;
  if (isBreedingDrought(engine)) return true; // nobody has been born for a while
  return (
    getOrganismGrowthSteps(engine, genome) > FERTILITY_MIN_GROWTH_STEPS + DESPERATION_EXTRA_STEPS ||
    tipAgeSteps > (engine.despairAge ?? Infinity)
  );
}

/**
 * Seek (lean) radius: min(proximity, 0.4 x world radius) normally; desperate organisms get
 * proximity x desperation up to 0.9 x world radius. Feeler reach is NOT widened (see Feelers).
 */
export function getSeekRadius(engine: SimulationEngine, desperate: boolean): number {
  const b = Math.max(10, engine.boundarySize || 60);
  const prox = engine.proximity || 24;
  if (!desperate) return Math.max(prox, 1.5 * b);
  return Math.max(prox * (engine.desperation || 1.5), 2.0 * b);
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
export const MIN_NEXUS_DISPERSAL_DIST = 6;
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

  const sides: Array<[any[], string]> = [[[parent1Genome, s1], parent2Strain], [[parent2Genome, s2], parent1Strain]];
  for (const [objs, partner] of sides) {
    for (const obj of objs) {
      if (!obj) continue;
      if (!obj.matedPartners) obj.matedPartners = new Set<string>();
      obj.matedPartners.add(partner);
      // Timestamped so the pair may mate again after REPEAT_PARTNER_COOLDOWN_STEPS
      if (!obj.matedPartnerTimes) obj.matedPartnerTimes = new Map<string, number>();
      obj.matedPartnerTimes.set(partner, engine.time);
      obj.lastMatingTime = engine.time;
      obj.lastMatingPos = nexusPos.clone();
    }
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

  // The same pair may not mate again until REPEAT_PARTNER_COOLDOWN_STEPS have passed (was: never,
  // which starved small populations once every pair had mated once)
  if (
    (genomeA?.matedPartners?.has?.(strainB) && isRecentPartner(engine, genomeA, strainB)) ||
    (sA?.matedPartners?.has?.(strainB) && isRecentPartner(engine, sA, strainB)) ||
    (genomeB?.matedPartners?.has?.(strainA) && isRecentPartner(engine, genomeB, strainA)) ||
    (sB?.matedPartners?.has?.(strainA) && isRecentPartner(engine, sB, strainA))
  ) {
    return false;
  }

  const parentsA: string[] | undefined = genomeA?.parentStrains || sA?.parentStrains;
  const parentsB: string[] | undefined = genomeB?.parentStrains || sB?.parentStrains;

  const livingCount =
    typeof engine.getLivingOrganismCount === "function"
      ? engine.getLivingOrganismCount()
      : 4;

  // Only block direct parent-offspring or full-sibling mating when >= 6 organisms exist and
  // neither organism has waited past DROUGHT_STEPS since its birth/last mating (otherwise a
  // 2-founder colony deadlocks at 4-5 creatures because all F1 offspring share the same 2 parents).
  const pairRelaxed =
    isInbreedingRelaxed(engine) ||
    getStepsSinceLastMating(engine, genomeA ?? { name: strainA }) > DROUGHT_STEPS ||
    getStepsSinceLastMating(engine, genomeB ?? { name: strainB }) > DROUGHT_STEPS;
  if (livingCount >= 6 && !pairRelaxed) {
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

