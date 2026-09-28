import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import {
  FERTILITY_MIN_GROWTH_STEPS,
  getOrganismGrowthSteps,
  POST_MATING_COOLDOWN_STEPS,
} from "./SimulationSeekRamp";
import { getStrainTissueCount } from "./SimulationPartnerSearch";

/** Unbred organisms get this many growth steps after reaching fertility before they may be culled. */
export const MATURITY_GRACE_STEPS = 150;
/** Max lifespan of a growth tip in growth steps (~1.5 sim-min at speed 20; was 1200 x timeScale, mixing ticks and steps). */
const MAX_TIP_LIFESPAN_STEPS = 12000;

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
  const minCreatures = engine.minCreatures ?? 3;
  if (livingOrganisms < minCreatures) return false;
  if (livingOrganisms - countAsRemoved < minCreatures) return false;
  return true;
}

/** Kills the agent's species once it has bred out or exceeded its max lifespan. */
export function checkLifespanDeath(
  engine: SimulationEngine,
  agent: Agent,
  activeAgents: Agent[],
  livingOrganismCount: number,
  maxM: number,
) {
  // agent.age counts growth steps, so the limit is in steps too (timeScale-independent)
  const minMatingLifespan = FERTILITY_MIN_GROWTH_STEPS + (maxM + 1) * POST_MATING_COOLDOWN_STEPS * 1.5;
  const maxLifespan = Math.max(minMatingLifespan, MAX_TIP_LIFESPAN_STEPS);
  const lifecycle = (engine as any).speciesLifecycleMap?.get(agent.genome.name);
  const speciesMCount = lifecycle?.matingCount || agent.matingCount || 0;
  const hasSpeciesBred = !!(agent.hasBred || lifecycle?.hasBred);
  const shouldDieFromMating = hasSpeciesBred && speciesMCount >= maxM;
  const shouldDieFromAge = agent.age > maxLifespan;
  const canSafelyDeleteSpecies = livingOrganismCount - 1 >= engine.minCreatures;

  if (!agent.tapering && (shouldDieFromMating || shouldDieFromAge)) {
    if (canSafelyDeleteSpecies && canEnterDeleting(engine, activeAgents, 1)) {
      const reason = shouldDieFromMating ? `bred ${maxM} times` : "reached max lifespan";
      engine.killSpecies(agent.genome.name, reason);
    }
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
      // Hard cap: prefer bred, then smallest; fall back to ignoring the maturity window.
      const victim =
        selectCullVictim(engine, activeAgents, new Set(), "preferBredSmallest") ||
        selectCullVictim(engine, activeAgents, new Set(), "preferBredSmallest", true);
      if (!victim) break;
      if (engine.getLivingOrganismCount() - 1 < engine.minCreatures) break;

      engine.killSpecies(victim, "maximum species capacity reached");
      nonTaperingStrains.delete(victim);
    }
  }
}

export type CullPolicy = "oldest" | "preferBredSmallest";

/**
 * Picks the organism to cull when the population is at maxCreatures. Returns "" when nobody is
 * eligible (the caller then blocks the birth instead of culling).
 * - "oldest": legacy rule (smallest genome.createdAt). Age was the only thing that made an
 *   organism large, so this always deleted the biggest one first (RC-A3).
 * - "preferBredSmallest": organisms that have already bred first, then the smallest by live
 *   tissue. Unbred organisms are protected until MATURITY_GRACE_STEPS after fertility
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
    const size = getStrainTissueCount(engine, name);
    if ((bred && !bestBred) || (bred === bestBred && size < bestSize)) {
      victim = name;
      bestBred = bred;
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
