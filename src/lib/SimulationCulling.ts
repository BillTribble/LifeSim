import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import {
  FERTILITY_MIN_GROWTH_STEPS,
  getOrganismGrowthSteps,
  POST_MATING_COOLDOWN_STEPS,
} from "./SimulationSeekRamp";
import { getStrainTissueCount } from "./SimulationPartnerSearch";

/** Unbred organisms get this many growth steps after reaching fertility before they may be culled. */
export const MATURITY_GRACE_STEPS = 90;
/** Max lifespan of an organism in growth steps before age-based senescence. */
export const MAX_ORGANISM_LIFESPAN_STEPS = 320;
/** Minimum growth-step spacing between routine senescence die-offs so the colony cycles one oldest creature at a time. */
export const SENESCENCE_INTERVAL_STEPS = 70;

/** True when an organism may be deleted without dropping below the minCreatures floor. */
export function canEnterDeleting(
  engine: SimulationEngine,
  activeAgents: Agent[],
  countAsRemoved: number = 1,
): boolean {
  if (!engine.hasAnyOrganismBred) return false;
  const livingOrganisms =
    typeof engine.getLivingOrganismCount === "function"
      ? engine.getLivingOrganismCount()
      : (() => {
          const living = new Set<string>();
          for (let i = 0; i < activeAgents.length; i++) {
            const a = activeAgents[i];
            if (a.active && !a.tapering && !a.isFeeler) {
              living.add(a.genome.name);
            }
          }
          return living.size;
        })();
  const minCreatures = engine.minCreatures ?? 4;
  if (livingOrganisms < minCreatures) return false;
  if (livingOrganisms - countAsRemoved < minCreatures) return false;
  return true;
}

/** True if `strainName` is the oldest non-tapering living organism in the simulation. */
function isOldestLivingOrganism(
  engine: SimulationEngine,
  activeAgents: Agent[],
  strainName: string,
): boolean {
  const myGenome = engine.genomeMap?.get(strainName);
  const myCreatedAt = myGenome?.createdAt ?? 0;
  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (!a.active || a.tapering || a.isFeeler) continue;
    const otherName = a.genome.name;
    if (otherName === strainName) continue;
    if (engine.dyingStrains && engine.dyingStrains.has(otherName)) continue;
    const otherCreatedAt = a.genome.createdAt ?? 0;
    if (otherCreatedAt < myCreatedAt) return false;
  }
  return true;
}

/** Kills the agent's species once it has bred out or exceeded its max lifespan, pacing turnover near maxCreatures. */
export function checkLifespanDeath(
  engine: SimulationEngine,
  agent: Agent,
  activeAgents: Agent[],
  livingOrganismCount: number,
  maxM: number,
) {
  if (agent.tapering || agent.isFeeler) return;
  const organismAgeSteps = getOrganismGrowthSteps(engine, agent.genome);
  const minMatingLifespan = FERTILITY_MIN_GROWTH_STEPS + (maxM + 1) * POST_MATING_COOLDOWN_STEPS * 1.25;
  const maxLifespan = Math.max(minMatingLifespan, MAX_ORGANISM_LIFESPAN_STEPS);
  const lifecycle = (engine as any).speciesLifecycleMap?.get(agent.genome.name);
  const speciesMCount = lifecycle?.matingCount || agent.matingCount || 0;
  const hasSpeciesBred = !!(agent.hasBred || lifecycle?.hasBred || speciesMCount > 0);
  const shouldDieFromMating =
    engine.postMatingDieoff !== false &&
    hasSpeciesBred &&
    speciesMCount >= maxM &&
    organismAgeSteps >= minMatingLifespan;
  const shouldDieFromAge = organismAgeSteps > maxLifespan;

  if (!shouldDieFromMating && !shouldDieFromAge) return;

  const minC = engine.minCreatures ?? 4;
  const maxC = Math.max(minC + 1, engine.maxCreatures || 7);
  // Allow population to climb to maxCreatures before routine turnover begins; once at maxCreatures
  // (or maxCreatures - 1 when well past maxLifespan), retire the oldest organism on a paced interval.
  const atCapacityForTurnover =
    livingOrganismCount >= maxC ||
    (shouldDieFromAge && organismAgeSteps > maxLifespan * 1.25 && livingOrganismCount >= Math.max(minC + 1, maxC - 1));
  if (!atCapacityForTurnover) return;
  if (livingOrganismCount - 1 < minC) return;

  const stepRate = Math.max(0.01, (engine.growthSpeed || 0.24) * 60);
  const lastDeathTime = (engine as any)._lastSenescenceDeathTime;
  const stepsSinceLastDeath =
    lastDeathTime !== undefined ? ((engine.time - lastDeathTime) / 60) * stepRate : Infinity;
  if (stepsSinceLastDeath < SENESCENCE_INTERVAL_STEPS) return;
  if (!isOldestLivingOrganism(engine, activeAgents, agent.genome.name)) return;

  if (canEnterDeleting(engine, activeAgents, 1)) {
    (engine as any)._lastSenescenceDeathTime = engine.time;
    const reason = shouldDieFromMating ? `bred ${speciesMCount} times` : "reached max lifespan";
    engine.killSpecies(agent.genome.name, reason);
  }
}

/** Per-frame hard cap: while more than maxCreatures organisms are growing, cull one (never below minCreatures). */
export function enforceCreatureCap(
  engine: SimulationEngine,
  activeAgents: Agent[],
  nonTaperingStrains: Set<string>,
): void {
  if (!engine.designerMode && nonTaperingStrains.size > engine.maxCreatures) {
    let guard = 0;
    while (
      nonTaperingStrains.size > engine.maxCreatures &&
      canEnterDeleting(engine, activeAgents, 1) &&
      guard++ < 16
    ) {
      // Hard cap: prefer bred, then oldest; fall back to ignoring the maturity window.
      const victim =
        selectCullVictim(engine, activeAgents, new Set(), "preferBredSmallest") ||
        selectCullVictim(engine, activeAgents, new Set(), "preferBredSmallest", true);
      if (!victim) break;
      if (engine.getLivingOrganismCount() - 1 < engine.minCreatures) break;

      (engine as any)._lastSenescenceDeathTime = engine.time;
      engine.killSpecies(victim, "maximum species capacity reached");
      nonTaperingStrains.delete(victim);
    }
  }
}

export type CullPolicy = "oldest" | "preferBredSmallest";

/**
 * Picks the organism to cull when the population is at maxCreatures. Returns "" when nobody is
 * eligible (the caller then blocks the birth instead of culling).
 * - "oldest": smallest genome.createdAt unconditionally.
 * - "preferBredSmallest": organisms that have already bred first, then the OLDEST by createdAt
 *   (with smallest live tissue as tie-breaker) so the oldest creature dies off as new forms begin.
 *   Unbred organisms are protected until MATURITY_GRACE_STEPS after fertility
 *   (`ignoreProtection` lifts that for the per-frame hard cap).
 */
export function selectCullVictim(
  engine: SimulationEngine,
  activeAgents: Agent[],
  exclude: Set<string>,
  policy: CullPolicy = "preferBredSmallest",
  ignoreProtection = false,
): string {
  let victim = "";
  let oldestCreatedAt = Infinity;
  let bestBred = false;
  let bestSize = Infinity;
  const seen = new Set<string>();
  for (let idx = 0; idx < activeAgents.length; idx++) {
    const ca = activeAgents[idx];
    if (!ca.active || ca.tapering || ca.isFeeler || ca.genome.createdAt === undefined) continue;
    const name = ca.genome.name;
    if (seen.has(name)) continue;
    seen.add(name);
    if (engine.dyingStrains && engine.dyingStrains.has(name)) continue;
    if (exclude.has(name)) continue;
    if (policy === "oldest") {
      if (ca.genome.createdAt < oldestCreatedAt) {
        oldestCreatedAt = ca.genome.createdAt;
        victim = name;
      }
      continue;
    }
    const lc = engine.speciesLifecycleMap.get(name);
    const bred = !!(lc?.hasBred || (lc?.matingCount ?? 0) > 0 || ca.hasBred);
    if (!bred && !ignoreProtection) {
      const steps = getOrganismGrowthSteps(engine, ca.genome);
      if (steps < FERTILITY_MIN_GROWTH_STEPS + MATURITY_GRACE_STEPS) continue;
    }
    const createdAt = ca.genome.createdAt ?? 0;
    const size = getStrainTissueCount(engine, name);
    if (
      (bred && !bestBred) ||
      (bred === bestBred && (createdAt < oldestCreatedAt || (createdAt === oldestCreatedAt && size < bestSize)))
    ) {
      victim = name;
      bestBred = bred;
      oldestCreatedAt = createdAt;
      bestSize = size;
    }
  }
  return victim;
}

/** True when the population is at the cap and `strainName` would be culled by the next birth. */
export function isNextCullVictim(
  engine: SimulationEngine,
  activeAgents: Agent[],
  nonTaperingStrains: Set<string>,
  strainName: string,
): boolean {
  if (nonTaperingStrains.size < engine.maxCreatures) return false;
  const cache = (engine as any)._nextCullVictim;
  if (cache && cache.frame === engine.frameCount && cache.size === nonTaperingStrains.size) {
    return cache.victim === strainName;
  }
  const victim = selectCullVictim(engine, activeAgents, new Set(), "preferBredSmallest");
  (engine as any)._nextCullVictim = { frame: engine.frameCount, size: nonTaperingStrains.size, victim };
  return victim === strainName;
}
