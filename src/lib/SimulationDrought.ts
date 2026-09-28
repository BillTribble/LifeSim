import type { SimulationEngine } from "./SimulationEngine";

/**
 * Breeding-drought helpers (ecology-health follow-up). All durations are in growth steps
 * (ticks x growthSpeed), so they are timeScale-independent like the rest of the fertility model.
 *
 * Contact-based only: no spontaneous species (removed on purpose in 76716fc).
 *
 * Failure mode these address: after a few births the population can settle into a small inbred
 * family where every pair is blocked (parent/offspring, full siblings, already-mated pair) or out
 * of feeler reach, and — because living >= minCreatures — nothing ever makes anyone desperate.
 */

/** No birth anywhere for this many growth steps = global drought (organisms become desperate). */
export const DROUGHT_STEPS = 300;
/** Drought this long relaxes the parent/offspring and full-sibling mating block (contact still required). */
export const INBREEDING_RELAX_DROUGHT_STEPS = 600;
/** Ratio culling spares an organism for this many growth steps after its birth or last mating. */
export const RATIO_CULL_GRACE_STEPS = 300;
/** A pair that already mated may mate again after this many growth steps. */
export const REPEAT_PARTNER_COOLDOWN_STEPS = 450;
/** Feeler reach grows from 0.4x to 0.6x world radius over this many steps without mating. */
export const FEELER_REACH_GROWTH_STEPS = 600;

const growth = (engine: SimulationEngine) => Math.max(1e-4, engine.growthSpeed || 0.11);

/** Growth steps since the last birth anywhere (since the ecosystem started if none yet). */
export function getStepsSinceLastBirth(engine: SimulationEngine): number {
  const last = (engine as any)._lastBirthTime;
  const since = typeof last === "number" && engine.time >= last ? engine.time - last : engine.time;
  return Math.max(0, since) * growth(engine);
}

export function isBreedingDrought(engine: SimulationEngine): boolean {
  return getStepsSinceLastBirth(engine) > DROUGHT_STEPS;
}

/** Growth steps since this organism last mated (since its birth if it never has). */
export function getStepsSinceLastMating(engine: SimulationEngine, genome: any): number {
  const lc = (engine.speciesLifecycleMap as any)?.get(genome?.name);
  const last = lc?.lastMatingTime ?? genome?.lastMatingTime ?? genome?.createdAt ?? 0;
  return Math.max(0, engine.time - last) * growth(engine);
}

/** True when the pair mated with each other within REPEAT_PARTNER_COOLDOWN_STEPS. */
export function isRecentPartner(engine: SimulationEngine, holder: any, partnerName: string): boolean {
  const t = holder?.matedPartnerTimes?.get?.(partnerName);
  if (typeof t !== "number") return true; // legacy entry without a timestamp: keep blocking
  return (engine.time - t) * growth(engine) < REPEAT_PARTNER_COOLDOWN_STEPS;
}

/** True when the drought is long enough that related organisms may mate (no spontaneous species). */
export function isInbreedingRelaxed(engine: SimulationEngine): boolean {
  return getStepsSinceLastBirth(engine) > INBREEDING_RELAX_DROUGHT_STEPS;
}

/** Ratio-cull protection: born or mated within RATIO_CULL_GRACE_STEPS. */
export function isRatioCullProtected(engine: SimulationEngine, strainName: string): boolean {
  const genome = engine.genomeMap?.get(strainName);
  return getStepsSinceLastMating(engine, genome ?? { name: strainName }) < RATIO_CULL_GRACE_STEPS;
}
