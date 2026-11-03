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
import { getEffectiveMaxMatings, getStrainTissueIndex } from "./SimulationPartnerSearch";

/**
 * Feelers: temporary sensory extensions of an organism. They inherit the root organism's genome
 * and archetype, never spawn feelers, and persist on screen until their parent organism dies.
 */

export type FeelerEndReason = "mated" | "parentDying" | "targetLost" | "lifetime" | "reach" | "boundary";

/**
 * Ends a feeler exactly once: deactivates it and logs `[FEELER_END] len=… reason=…`.
 * By default, feelers freeze in place and persist until their parent organism dies.
 * When `opts.dissolve === true` is explicitly passed, its trail segments fade out immediately.
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
  if (opts.dissolve === true) engine.markAgentSegmentsDying(agent.id);
  const root = agent.realGenome?.name ?? agent.genome.name;
  engine.onLog(
    `[FEELER_END] len=${(agent.feelerTravel ?? 0).toFixed(1)} reason=${reason} owner=${root} target=${agent.feelerTargetStrain ?? "?"} age=${agent.age}${opts.detail ? ` detail=${opts.detail}` : ""}`,
  );
}

/** Returns the small list (typically 0–2) of active in-flight feelers for the current frame. */
export function getInFlightFeelers(
  engine: SimulationEngine,
  activeAgents: Agent[],
  newAgents?: Agent[],
): Agent[] {
  const cache = (engine as any)._inFlightFeelersCache;
  if (
    engine.frameCount !== undefined &&
    cache &&
    cache.frame === engine.frameCount &&
    cache.activeRef === activeAgents
  ) {
    return cache.list as Agent[];
  }
  const list: Agent[] = [];
  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.active && a.isFeeler && !a.tapering && !a.feelerEnded) list.push(a);
  }
  if (newAgents) {
    for (let i = 0; i < newAgents.length; i++) {
      const a = newAgents[i];
      if (a.active && a.isFeeler && !a.tapering && !a.feelerEnded) list.push(a);
    }
  }
  if (engine.frameCount !== undefined) {
    (engine as any)._inFlightFeelersCache = {
      frame: engine.frameCount,
      activeRef: activeAgents,
      list,
    };
  }
  return list;
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
    thicknessBase: Math.max(0.045, Math.min(0.08, agent.thickness * 0.25)),
    minThickness: 0.04,
    stepSize: 0.85,
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
export const FEELER_MAX_LIFETIME_STEPS = 140;
/** Feeler step relative to the parent tip's botanical step. */
const FEELER_STEP_SCALE = 1.05;
/** Per-step turn toward the target: strong homing so feelers unerringly reach their mate. */
const FEELER_HOMING_LERP = 0.55;
/** Stronger homing inside several steps of the target so feelers land directly without orbiting. */
const FEELER_CLOSE_HOMING_LERP = 0.88;

/**
 * Maximum feeler reach (spawn distance gate and travel cap): allows feelers to bridge the gap
 * between organisms (up to 1.35x boundarySize when under minCreatures) and dissolve immediately on contact.
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
  const mult = underMin ? 3.5 : 2.5 + 1.0 * t;
  return mult * b;
}

/** Per-step feeler length, scaled from the parent tip's last botanical step. */
export function getFeelerStepSize(agent: Agent): number {
  return agent.feelerStep ?? Math.min(0.75, Math.max(0.50, (agent.genome.stepSize || 1.0) * 0.65));
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
  const step = THREE.MathUtils.clamp((agent.lastStepSize ?? 0.8) * 0.70, 0.50, 0.75);
  const maxLen = Math.max(1.35 * targetDist + 8 * step, Math.min(1.45 * targetDist + 12 * step, getFeelerMaxReach(engine, rootGenome)));
  const feelerAgent: Agent = {
    id: engine.nextAgentId++,
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
  };
  newAgents.push(feelerAgent);
  const fCache = (engine as any)._inFlightFeelersCache;
  if (fCache && Array.isArray(fCache.list)) {
    fCache.list.push(feelerAgent);
  }
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
 * Exit paths freeze the feeler in place (AGENTS.md: feelers persist on screen once ended
 * and only dissolve when their parent organism dies) and log [FEELER_END].
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
  const dissolve = { dissolve: false };

  if (!engine.allowBreeding) return endFeeler(engine, agent, "parentDying", { ...dissolve, detail: "breedingOff" });
  if (isStrainDying(engine, myStrainName)) return endFeeler(engine, agent, "parentDying", { dissolve: true });

  // Keep feeler thickness healthy and never let it decay or stop mid-air before reaching a mate
  if (agent.thickness < (agent.genome.minThickness || 0.04)) {
    agent.thickness = agent.genome.thicknessBase || 0.055;
  }

  const tissueMap = getStrainTissueIndex(engine);
  const hasLiveBody = (strain: string | undefined): boolean => {
    if (!strain || strain === myStrainName || isStrainDying(engine, strain)) return false;
    if ((tissueMap.get(strain)?.count ?? 0) > 0) return true;
    for (let i = 0; i < engine.agents.length; i++) {
      const a = engine.agents[i];
      if (a.active && !a.isFeeler && a.genome.name === strain) return true;
    }
    return false;
  };

  let target = agent.feelerTargetStrain;
  let targetGenome = target ? engine.genomeMap?.get(target) : undefined;
  const targetMCount = target ? lifecycleMap?.get(target)?.matingCount || 0 : 0;
  const targetMaxM = getEffectiveMaxMatings(engine, targetMCount);
  const targetAlive = hasLiveBody(target);
  const currentDistSq =
    targetAlive && agent.feelerNearestPos
      ? agent.position.distanceToSquared(agent.feelerNearestPos)
      : Infinity;
  const shouldSeekBetterTarget =
    !targetAlive ||
    (currentDistSq > 36 &&
      (targetMCount >= targetMaxM ||
        isSpeciesOnCooldown(engine, target!, targetGenome) ||
        !areStrainsCompatibleForMating(engine, myStrainName, evalGenome, target!, targetGenome)));

  if (shouldSeekBetterTarget) {
    // Tier 1: compatible, off-cooldown, under maxMatings living organism
    let bestRetarget: string | undefined;
    let bestRetargetDistSq = Infinity;
    // Tier 2 fallback (used only when current target is dead/gone): any living organism other than parent
    let fallbackRetarget: string | undefined;
    let fallbackRetargetDistSq = Infinity;

    for (let aIdx = 0; aIdx < engine.agents.length; aIdx++) {
      const cand = engine.agents[aIdx];
      if (!cand.active || cand.isFeeler) continue;
      const candStrain = cand.genome.name;
      if (candStrain === myStrainName || isStrainDying(engine, candStrain)) continue;
      const dSq = agent.position.distanceToSquared(cand.position);
      if (dSq < fallbackRetargetDistSq) {
        fallbackRetargetDistSq = dSq;
        fallbackRetarget = candStrain;
      }
      if (cand.tapering) continue;
      const candMCount = lifecycleMap?.get(candStrain)?.matingCount || cand.matingCount || 0;
      if (candMCount >= getEffectiveMaxMatings(engine, candMCount)) continue;
      if (isSpeciesOnCooldown(engine, candStrain, cand.genome)) continue;
      if (!areStrainsCompatibleForMating(engine, myStrainName, evalGenome, candStrain, cand.genome)) continue;
      if (dSq < bestRetargetDistSq) {
        bestRetargetDistSq = dSq;
        bestRetarget = candStrain;
      }
    }

    if (!fallbackRetarget) {
      for (const [strain, t] of tissueMap.entries()) {
        if (strain === myStrainName || isStrainDying(engine, strain) || t.count <= 0) continue;
        const dx = agent.position.x - t.cx;
        const dy = agent.position.y - t.cy;
        const dz = agent.position.z - t.cz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < fallbackRetargetDistSq) {
          fallbackRetargetDistSq = dSq;
          fallbackRetarget = strain;
        }
      }
    }

    const chosen = bestRetarget ?? (!targetAlive ? fallbackRetarget : target);
    if (!chosen) {
      return endFeeler(engine, agent, "targetLost", { dissolve: true });
    }
    if (chosen !== target) {
      target = chosen;
      agent.feelerTargetStrain = chosen;
      targetGenome = engine.genomeMap?.get(chosen);
      const chosenDistSq = bestRetarget ? bestRetargetDistSq : fallbackRetargetDistSq;
      const extraReach = (Number.isFinite(chosenDistSq) ? Math.sqrt(chosenDistSq) : 60) * 1.5 + 24;
      agent.feelerMaxLen = Math.max(agent.feelerMaxLen ?? 120, (agent.feelerTravel ?? 0) + extraReach);
    }
  }

  // Fast scan of the target's stride-sampled live tissue plus its (non-feeler) growth tips.
  const anchors = nexusAnchors(engine, myStrainName, evalGenome, target!, targetGenome);
  const px = agent.position.x, py = agent.position.y, pz = agent.position.z;
  let minDSq = Infinity;
  let nx = 0, ny = 0, nz = 0;
  const targetTissue = tissueMap.get(target!);

  const scanTargetPoints = (ignoreAnchors: boolean) => {
    if (targetTissue) {
      for (let k = 0; k < targetTissue.xs.length; k++) {
        const tx = targetTissue.xs[k], ty = targetTissue.ys[k], tz = targetTissue.zs[k];
        const dx = px - tx, dy = py - ty, dz = pz - tz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < minDSq && (ignoreAnchors || !insideAnyAnchor(anchors, tx, ty, tz))) {
          minDSq = dSq;
          nx = tx; ny = ty; nz = tz;
        }
      }
    }
    for (let aIdx = 0; aIdx < engine.agents.length; aIdx++) {
      const other = engine.agents[aIdx];
      if (!other.active || other.isFeeler || (!ignoreAnchors && other.tapering) || other.genome.name !== target) continue;
      const dSq = agent.position.distanceToSquared(other.position);
      if (dSq < minDSq && (ignoreAnchors || !insideAnyAnchor(anchors, other.position.x, other.position.y, other.position.z))) {
        minDSq = dSq;
        nx = other.position.x; ny = other.position.y; nz = other.position.z;
      }
    }
  };

  scanTargetPoints(false);
  if (!Number.isFinite(minDSq)) {
    scanTargetPoints(true);
  }
  if (!Number.isFinite(minDSq)) return endFeeler(engine, agent, "targetLost", { dissolve: true });

  const nearest = agent.feelerNearestPos ?? new THREE.Vector3();
  nearest.set(nx, ny, nz);
  agent.feelerNearestPos = nearest;
  const dist = Math.sqrt(minDSq);
  const step = getFeelerStepSize(agent);
  // Dynamically keep feelerMaxLen ahead of remaining distance so nothing ever caps feeler reach
  agent.feelerMaxLen = Math.max(agent.feelerMaxLen ?? 120, (agent.feelerTravel ?? 0) + dist * 1.5 + 16);

  const homing = new THREE.Vector3(nx - px, ny - py, nz - pz);
  if (dist < 0.05 || homing.lengthSq() < 1e-6) {
    agent.feelerStepOverride = 0.02;
    return;
  }
  homing.normalize();
  if (dist <= step) {
    // Final step: land directly on the target so contact breeding triggers immediately.
    agent.direction.copy(homing);
    agent.feelerStepOverride = Math.max(0.02, dist);
    return;
  }
  if ((agent.age || 0) <= 1) {
    agent.direction.copy(homing);
    return;
  }
  const isClose = dist < step * 6.0;
  const lerp = isClose ? FEELER_CLOSE_HOMING_LERP : FEELER_HOMING_LERP;
  const wander = isClose ? 0 : (agent.genome.wanderIntensity ?? 0.15) * 0.04;
  agent.direction
    .lerp(homing, lerp)
    .add(new THREE.Vector3((Math.random() - 0.5) * wander, (Math.random() - 0.5) * wander, (Math.random() - 0.5) * wander));

  if (!isClose) {
    const up = Math.abs(agent.direction.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const waveAxis = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
    const waveAmp = 0.04 * Math.sin((agent.age || 0) * 0.22 + (agent.id || 0));
    agent.direction.addScaledVector(waveAxis, waveAmp);
  }
  agent.direction.normalize();
}
