import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import {
  areStrainsCompatibleForMating,
  isSpeciesOnCooldown,
  MIN_NEXUS_DISPERSAL_DIST_SQ,
} from "./SimulationSeekRamp";
import { isStrainDying } from "./SimulationEngineHelpers";
import { FEELER_REACH_GROWTH_STEPS, getStepsSinceLastMating } from "./SimulationDrought";
import { getEffectiveMaxMatings } from "./SimulationPartnerSearch";

/**
 * Feelers: temporary sensory extensions of an organism. They inherit the root organism's genome
 * and archetype, never spawn feelers, and dissolve when they fail to mate or the parent dies.
 */

export type FeelerEndReason = "mated" | "parentDying" | "targetLost" | "lifetime" | "reach" | "boundary";

/**
 * Ends a feeler exactly once: deactivates it and logs `[FEELER_END] len=… reason=…`.
 * When `dissolve` is set its trail segments fade out (FEELER_FADE dial controls the speed).
 */
export function endFeeler(
  engine: SimulationEngine,
  agent: Agent,
  reason: FeelerEndReason,
  opts: { dissolve?: boolean; detail?: string } = {},
): void {
  agent.active = false;
  if (!agent.isFeeler || agent.feelerEnded) return;
  agent.feelerEnded = true;
  if (opts.dissolve) engine.markAgentSegmentsDying(agent.id);
  const root = agent.realGenome?.name ?? agent.genome.name;
  engine.onLog(
    `[FEELER_END] len=${(agent.feelerTravel ?? 0).toFixed(1)} reason=${reason} owner=${root} target=${agent.feelerTargetStrain ?? "?"} age=${agent.age}${opts.detail ? ` detail=${opts.detail}` : ""}`,
  );
}

export function resolveRootOrganismGenome(
  agent: Agent,
  engine?: SimulationEngine,
): any {
  if (agent.isFeeler) {
    if (agent.realGenome && !agent.realGenome.name.startsWith("Feeler-")) {
      return agent.realGenome;
    }
    if (agent.parentAgent) {
      return resolveRootOrganismGenome(agent.parentAgent, engine);
    }
    if (engine && engine.genomeMap) {
      for (const [name, g] of engine.genomeMap.entries()) {
        if (
          !name.startsWith("Feeler-") &&
          (name === agent.genome.name || name === agent.realGenome?.name)
        ) {
          return g;
        }
      }
    }
  }
  return agent.genome;
}

/**
 * Builds (and caches per simulation tick) a map of feeler strain names to the name of the
 * root organism that owns them.
 *
 * Feeler segments are written into `engine.segments` using the feeler's own synthetic genome
 * name (`Feeler-1234`), which makes them look like an independent strain. Proximity checks must
 * resolve those back to the owning organism, otherwise an organism can "touch" its own feeler
 * (or a completely unrelated third party's feeler) and register that as contact with a partner
 * that is actually on the other side of the world.
 */
export function buildFeelerOwnerMap(
  engine: SimulationEngine,
  activeAgents?: Agent[],
): Map<string, string> {
  const agentCount = (engine.agents || []).length;
  const cache = (engine as any)._feelerOwnerCache;
  if (cache && cache.time === engine.time && cache.agentCount === agentCount) {
    return cache.map as Map<string, string>;
  }
  const map = new Map<string, string>();
  const pools: Agent[][] = [engine.agents || []];
  if (activeAgents && activeAgents !== engine.agents) pools.push(activeAgents);
  for (const pool of pools) {
    for (let i = 0; i < pool.length; i++) {
      const a = pool[i];
      if (!a || !a.isFeeler) continue;
      const root = resolveRootOrganismGenome(a, engine);
      if (root?.name && root.name !== a.genome.name) {
        map.set(a.genome.name, root.name);
      }
    }
  }
  (engine as any)._feelerOwnerCache = { time: engine.time, agentCount, map };
  return map;
}

/** Resolves a segment strain name to the organism that owns it (feelers map to their parent). */
export function ownerOfStrain(
  strainName: string,
  ownerMap: Map<string, string>,
): string {
  return ownerMap.get(strainName) ?? strainName;
}

export function createFeelerGenome(agent: Agent, engine?: SimulationEngine): any {
  const rootGenome = resolveRootOrganismGenome(agent, engine);
  return {
    ...rootGenome,
    name: `Feeler-${Math.floor(Math.random() * 10000)}`,
    parentStrainName: rootGenome.name,
    _isFeeler: true,
    archetype: rootGenome.archetype, // Preserve parent organism archetype (Bush, Tree, Rhizome). Never snake!
    thicknessBase: Math.max(0.2, Math.min(0.35, agent.thickness * 0.4)),
    minThickness: 0.5,
    stepSize: 1.3,
    wanderIntensity: 0.15,
    bifurcationRate: 0.0001,
    branchTendency: 0,
    wavingAmplitude: 0.15,
    wavingSpeed: 0.05,
    isGlowing: true,
    thicknessDecay: 0.9999,
    movementType: "default",
    geometryType: "cylinder",
    appendage: "none" as any,
    sameColorAppendage: true,
    multicolorAppendage: false,
    gradientGrowth: false,
  };
}

/** Feeler lifetime cap in growth steps. */
export const FEELER_MAX_LIFETIME_STEPS = 450;
/** Feeler step relative to the parent tip's botanical step. */
const FEELER_STEP_SCALE = 1.25;
/** Per-step turn toward the target (was a hard copy, which drew ruler-straight rays). */
const FEELER_HOMING_LERP = 0.25;
/** Stronger homing inside a few steps of the target so feelers land instead of orbiting. */
const FEELER_CLOSE_HOMING_LERP = 0.6;

/**
 * Maximum feeler reach (spawn distance gate and travel cap): starts at 0.85 x boundarySize,
 * ramping up to 1.65 x, and up to 1.85 x when population is at or below minCreatures.
 */
export function getFeelerMaxReach(engine: SimulationEngine, genome?: any): number {
  const b = Math.max(10, engine.boundarySize || 60);
  const living = typeof engine.getLivingOrganismCount === "function"
    ? engine.getLivingOrganismCount()
    : typeof engine.getLivingOrganisms === "function"
      ? engine.getLivingOrganisms().size
      : 2;
  const underMin = living <= (engine.minCreatures ?? 4);
  const t = genome ? Math.min(1, getStepsSinceLastMating(engine, genome) / FEELER_REACH_GROWTH_STEPS) : 0;
  const mult = underMin ? 1.85 : 1.25 + 0.65 * t;
  return mult * b;
}

/** Per-step feeler length, scaled from the parent tip's last botanical step. */
export function getFeelerStepSize(agent: Agent): number {
  return agent.feelerStep ?? Math.min(1.6, Math.max(1.0, agent.genome.stepSize || 1.0));
}

/**
 * Emits a feeler from `agent` toward the locked target organism `targetStrain`.
 * The feeler inherits the root genome (realGenome) and archetype and never spawns feelers.
 */
export function spawnFeeler(
  engine: SimulationEngine,
  agent: Agent,
  towardsPartner: THREE.Vector3,
  targetStrain: string,
  targetDist: number,
  evalGenome: any,
  newAgents: Agent[],
  isDesperate: boolean,
): void {
  const rootGenome = resolveRootOrganismGenome(agent, engine);
  const feelerGenome = createFeelerGenome(agent, engine);
  const step = THREE.MathUtils.clamp((agent.lastStepSize ?? 1.1) * FEELER_STEP_SCALE, 0.85, 1.6);
  const maxLen = Math.min(1.6 * targetDist + 10 * step, getFeelerMaxReach(engine, rootGenome));
  newAgents.push({
    position: agent.position.clone(),
    lastPosition: agent.position.clone(),
    direction: towardsPartner.clone(),
    genome: feelerGenome,
    active: true,
    age: 0,
    thickness: feelerGenome.thicknessBase,
    cooldown: 0,
    isFeeler: true,
    realGenome: rootGenome,
    parentAgent: agent,
    branchDepth: Math.max(1, agent.branchDepth || 1),
    rootOrigin: (agent.rootOrigin || agent.position).clone(),
    branchBasePos: ((agent.branchDepth || 0) === 0 ? agent.position : (agent.branchBasePos || agent.position)).clone(),
    feelerTargetStrain: targetStrain,
    feelerStep: step,
    feelerTravel: 0,
    feelerMaxLen: maxLen,
  });
  (rootGenome as any).lastFeelerSpawnTime = engine.time;
  if (evalGenome && evalGenome !== rootGenome) {
    (evalGenome as any).lastFeelerSpawnTime = engine.time;
  }
  if (engine.feelerCount < 3) {
    engine.feelerCount++;
    engine.lastFeelerWorldPos = agent.position.clone();
    engine.onFeelerEvent?.({ parent: rootGenome, feeler: feelerGenome, count: engine.feelerCount });
  }
  const isSuppressed = !!(engine.suppressedStrains && engine.suppressedStrains.has(rootGenome.name));
  const suffix = ` target=${targetStrain} dist=${targetDist.toFixed(1)} step=${step.toFixed(2)} maxLen=${maxLen.toFixed(1)}`;
  if (isDesperate && !isSuppressed) {
    engine.onLog(`Aging ${rootGenome.name} seeking hybridization partner.${suffix}`);
  } else if (isSuppressed) {
    engine.onLog(`Suppressed ${rootGenome.name} extended sensory feeler.${suffix}`);
  } else {
    engine.onLog(`📡 ${rootGenome.name} extending sensory feelers toward ${targetStrain} (Age ${agent.age}).${suffix}`);
  }
}

function nexusAnchors(engine: SimulationEngine, strainA: string, genomeA: any, strainB: string, genomeB: any): THREE.Vector3[] {
  const map = engine.speciesLifecycleMap as any;
  const sA = map?.get(strainA);
  const sB = map?.get(strainB);
  const out: THREE.Vector3[] = [];
  for (const a of [genomeA?.birthPos, sA?.birthPos, genomeA?.lastMatingPos, sA?.lastMatingPos,
    genomeB?.birthPos, sB?.birthPos, genomeB?.lastMatingPos, sB?.lastMatingPos]) {
    if (a) out.push(a);
  }
  return out;
}

function insideAnyAnchor(anchors: THREE.Vector3[], x: number, y: number, z: number): boolean {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const dx = x - a.x, dy = y - a.y, dz = z - a.z;
    if (dx * dx + dy * dy + dz * dz < MIN_NEXUS_DISPERSAL_DIST_SQ) return true;
  }
  return false;
}

/**
 * Per-step feeler update: lifecycle checks, then organic homing toward the locked target.
 * Every exit path dissolves the feeler (AGENTS.md: feelers dissolve if they fail to mate or
 * their parent dies) and logs [FEELER_END].
 */
export function updateFeelerSeeking(
  agent: Agent,
  engine: SimulationEngine,
): void {
  agent.feelerStepOverride = undefined;
  const rootGenome = resolveRootOrganismGenome(agent, engine);
  const myStrainName = rootGenome.name;
  const evalGenome = agent.isFeeler && agent.realGenome ? agent.realGenome : rootGenome;
  const lifecycleMap = engine.speciesLifecycleMap as any;
  const myMCount = lifecycleMap?.get(myStrainName)?.matingCount || 0;
  const myMaxM = getEffectiveMaxMatings(engine, myMCount);
  const dissolve = { dissolve: true };

  if (!engine.allowBreeding) return endFeeler(engine, agent, "parentDying", { ...dissolve, detail: "breedingOff" });
  if (isStrainDying(engine, myStrainName)) return endFeeler(engine, agent, "parentDying", dissolve);
  if (myMCount >= myMaxM) {
    return endFeeler(engine, agent, "parentDying", { ...dissolve, detail: "exhausted" });
  }
  if (isSpeciesOnCooldown(engine, myStrainName, evalGenome)) {
    return endFeeler(engine, agent, "parentDying", { ...dissolve, detail: "parentOnCooldown" });
  }
  const maxLifetime = Math.max(
    FEELER_MAX_LIFETIME_STEPS,
    Math.ceil((agent.feelerMaxLen ?? 120) / Math.max(0.4, getFeelerStepSize(agent))) + 80,
  );
  if (agent.age > maxLifetime) return endFeeler(engine, agent, "lifetime", dissolve);
  if ((agent.feelerTravel ?? 0) >= (agent.feelerMaxLen ?? getFeelerMaxReach(engine))) {
    return endFeeler(engine, agent, "reach", dissolve);
  }

  const target = agent.feelerTargetStrain;
  const targetGenome = target ? engine.genomeMap.get(target) : undefined;
  const targetMCount = target ? lifecycleMap?.get(target)?.matingCount || 0 : 0;
  const targetMaxM = getEffectiveMaxMatings(engine, targetMCount);
  if (
    !target ||
    isStrainDying(engine, target) ||
    targetMCount >= targetMaxM ||
    !areStrainsCompatibleForMating(engine, myStrainName, evalGenome, target, targetGenome)
  ) {
    return endFeeler(engine, agent, "targetLost", dissolve);
  }

  // Full scan of the target's live tissue plus its (non-feeler) growth tips.
  const anchors = nexusAnchors(engine, myStrainName, evalGenome, target, targetGenome);
  const px = agent.position.x, py = agent.position.y, pz = agent.position.z;
  let minDSq = Infinity;
  let nx = 0, ny = 0, nz = 0;
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let sIdx = 0; sIdx < limit; sIdx++) {
    const seg = engine.segments[sIdx];
    if (!seg || seg.dyingStart || seg.isFeeler || seg.strainName !== target) continue;
    const m = seg.matrix.elements;
    const dx = px - m[12], dy = py - m[13], dz = pz - m[14];
    const dSq = dx * dx + dy * dy + dz * dz;
    if (dSq < minDSq && !insideAnyAnchor(anchors, m[12], m[13], m[14])) {
      minDSq = dSq;
      nx = m[12]; ny = m[13]; nz = m[14];
    }
  }
  for (let aIdx = 0; aIdx < engine.agents.length; aIdx++) {
    const other = engine.agents[aIdx];
    if (!other.active || other.isFeeler || other.tapering || other.genome.name !== target) continue;
    const dSq = agent.position.distanceToSquared(other.position);
    if (dSq < minDSq && !insideAnyAnchor(anchors, other.position.x, other.position.y, other.position.z)) {
      minDSq = dSq;
      nx = other.position.x; ny = other.position.y; nz = other.position.z;
    }
  }
  if (!Number.isFinite(minDSq)) return endFeeler(engine, agent, "targetLost", dissolve);

  const nearest = agent.feelerNearestPos ?? new THREE.Vector3();
  nearest.set(nx, ny, nz);
  agent.feelerNearestPos = nearest;
  const dist = Math.sqrt(minDSq);
  const step = getFeelerStepSize(agent);
  const homing = new THREE.Vector3(nx - px, ny - py, nz - pz);
  if (homing.lengthSq() < 1e-9) {
    agent.feelerStepOverride = 0;
    return;
  }
  homing.normalize();
  if (dist <= step) {
    // Final step: land exactly on the target instead of overshooting back and forth.
    agent.direction.copy(homing);
    agent.feelerStepOverride = dist;
    return;
  }
  const lerp = dist < step * 4 ? FEELER_CLOSE_HOMING_LERP : FEELER_HOMING_LERP;
  const wander = (agent.genome.wanderIntensity ?? 0.15) * 0.35;
  agent.direction
    .lerp(homing, lerp)
    .add(new THREE.Vector3((Math.random() - 0.5) * wander, (Math.random() - 0.5) * wander, (Math.random() - 0.5) * wander))
    .normalize();
}
