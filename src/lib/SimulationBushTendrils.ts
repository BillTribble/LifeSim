import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import { getOrganismSegmentBudget, getStrainTissueCount, isOverSizeBudget } from "./SimulationPartnerSearch";
import { getMaxBranchesForArchetype } from "./SimulationPruning";
import { getBushMorphScale } from "./SimulationMorphology";

export const GOLDEN_ANGLE_RAD = 2.39996323; // 137.5 degrees

export function initBushBranchTracking(agent: Agent, parent?: Agent): void {
  const a = agent as any;
  a.branchSteps = a.stepsSinceLastFork = a.branchDist = a.distSinceLastFork = 0;
  const parentPhase = (parent as any)?.phyllotaxisPhase ?? (Math.random() * Math.PI * 2);
  a.phyllotaxisPhase = parentPhase + GOLDEN_ANGLE_RAD;
  if (agent.genome.movementType === "spiral") {
    a.spiralSign = ((agent.id || 0) % 2 === 0 ? 1 : -1);
    a.spiralAxis = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3, 1.0 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3,
    ).normalize();
  }
}

export function trackBushBranchStep(agent: Agent, stepSize: number = 0.65): void {
  const a = agent as any;
  a.branchSteps = (a.branchSteps ?? 0) + 1;
  a.stepsSinceLastFork = (a.stepsSinceLastFork ?? 0) + 1;
  a.branchDist = (a.branchDist ?? 0) + stepSize;
  a.distSinceLastFork = (a.distSinceLastFork ?? 0) + stepSize;
}

function getBushRambleScale(agent: Agent): number {
  const r = THREE.MathUtils.clamp((agent.genome as any)?.rambleFactor ?? 0.74, 0.55, 2.6);
  return 1.0 + (r - 1.0) * 0.65;
}

export function applyBushTendrilSteering(engine: SimulationEngine, agent: Agent): void {
  if (agent.genome.archetype !== "bush") return;
  const depth = agent.branchDepth || 0, dist = (agent as any).branchDist ?? 0;
  if (agent.genome.movementType === "spiral") {
    const sign = (agent as any).spiralSign ?? 1, axis = (agent as any).spiralAxis ?? new THREE.Vector3(0, 1, 0);
    agent.direction.applyAxisAngle(axis, sign * 0.042).normalize();
  }
  const bushScale = getBushMorphScale(agent.genome);
  const rambleScale = getBushRambleScale(agent);
  // Radial fan relative to root birth position
  if (depth >= 1 && dist < 18.0 * bushScale * rambleScale) {
    const origin = agent.rootOrigin || agent.genome.birthPos || new THREE.Vector3(0, 0, 0);
    if (engine.designerMode) {
      const radial = new THREE.Vector3(agent.position.x - origin.x, 0, agent.position.z - origin.z);
      if (radial.lengthSq() > 1e-4) radial.normalize(); else radial.set(1, 0, 0);
      agent.direction.add(radial.multiplyScalar(0.012).add(new THREE.Vector3(0, 0.012, 0))).normalize();
    } else {
      // Zero-gravity 3D spherical radial expansion so bushes fill 3D space instead of climbing to the ceiling
      const radial3D = new THREE.Vector3().subVectors(agent.position, origin);
      if (radial3D.lengthSq() > 1e-4) radial3D.normalize(); else radial3D.copy(agent.direction);
      agent.direction.addScaledVector(radial3D, 0.008).normalize();
    }
  }

  const cGene = THREE.MathUtils.clamp(agent.genome?.curvinessGene ?? 0.5, 0, 1);
  const curviness = THREE.MathUtils.lerp(0.22, 1.45, cGene);
  const up = Math.abs(agent.direction.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perpA = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
  const perpB = new THREE.Vector3().crossVectors(agent.direction, perpA).normalize();
  const phase = (agent.age || 0) * 0.20 + (agent.id || 0) * 1.37;
  const waveA = Math.sin(phase) * 0.135 * Math.max(0.4, rambleScale * 0.8) * curviness;
  const waveB = Math.cos(phase * 0.83 + 0.7) * 0.105 * Math.max(0.4, rambleScale * 0.8) * curviness;
  agent.direction.addScaledVector(perpA, waveA).addScaledVector(perpB, waveB).normalize();
}

export function canBushTipTaper(agent: Agent): boolean {
  if (agent.genome.archetype !== "bush" || (agent.branchDepth || 0) === 0) return true;
  const bushScale = getBushMorphScale(agent.genome) * (agent.growthScale ?? 1.0);
  return ((agent as any).branchDist ?? 0) >= 6.5 * Math.min(1.8, Math.max(0.60, bushScale)) * getBushRambleScale(agent) * (agent.growthScale ?? 1.0);
}

export function retireOldestBushSibling(
  engine: SimulationEngine,
  activeAgents: Agent[],
  strainName: string,
  excludeAgent?: Agent,
): boolean {
  let nonTaperingCount = 0;
  let oldest: Agent | null = null, maxAge = -1;
  for (let idx = 0; idx < activeAgents.length; idx++) {
    const a = activeAgents[idx];
    if (a.active && !a.tapering && !a.isFeeler && a.genome.name === strainName) {
      nonTaperingCount++;
      if (a !== excludeAgent && (a.branchDepth || 0) > 0) {
        if ((((a as any).branchDist ?? 0) >= 2.2 || a.age >= 6) && a.age > maxAge) {
          maxAge = a.age; oldest = a;
        }
      }
    }
  }
  if (nonTaperingCount <= 4) return false;
  if (oldest) {
    oldest.tapering = true; oldest.taperBudget = 0; return true;
  }
  return false;
}

function constructTransverseAxis(dir: THREE.Vector3, phase: number): THREE.Vector3 {
  const up = Math.abs(dir.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perpA = new THREE.Vector3().crossVectors(dir, up).normalize();
  const perpB = new THREE.Vector3().crossVectors(dir, perpA).normalize();
  return perpA.multiplyScalar(Math.cos(phase)).add(perpB.multiplyScalar(Math.sin(phase))).normalize();
}

function spawnBushChild(
  engine: SimulationEngine, parent: Agent, dir: THREE.Vector3, thickness: number,
  depth: number, newAgents: Agent[], strainCounts: Map<string, number>,
): Agent {
  if (parent.id !== undefined) engine.lastAgentStemIndex?.delete(parent.id);
  const child: Agent = {
    position: parent.position.clone(), lastPosition: parent.position.clone(),
    direction: dir, genome: parent.genome, active: true, age: 0,
    thickness, targetThickness: thickness, cooldown: 0, id: engine.nextAgentId++,
    parentAgent: parent, parentId: parent.id, branchDepth: depth, isSeekerTwig: parent.isSeekerTwig,
    isBasalEnd: parent.isBasalEnd, growthScale: parent.growthScale,
    rootOrigin: (parent.rootOrigin || parent.position).clone(),
    branchBasePos: (depth <= 1 ? parent.position : (parent.branchBasePos || parent.position)).clone(),
  };
  initBushBranchTracking(child, parent);
  newAgents.push(child);
  strainCounts.set(parent.genome.name, (strainCounts.get(parent.genome.name) || 1) + 1);
  return child;
}

export function stepBushTendrilBranching(
  engine: SimulationEngine, agent: Agent, activeAgents: Agent[],
  newAgents: Agent[], strainCounts: Map<string, number>, isUnderMinCreatures: boolean,
): boolean {
  if (agent.genome.archetype !== "bush" || agent.isFeeler || agent.tapering) return false;
  const tissueCount = getStrainTissueCount(engine, agent.genome.name);
  const segBudget = getOrganismSegmentBudget(engine, agent.genome.name);
  if (tissueCount > segBudget * 3.2 && !agent.isSeekerTwig) return false;

  const currentDepth = agent.branchDepth || 0;
  const branchDist = (agent as any).branchDist ?? (agent.age * 0.6);
  const distSinceLastFork = (agent as any).distSinceLastFork ?? branchDist;
  const bushScale = getBushMorphScale(agent.genome) * (agent.growthScale ?? 1.0);
  const rambleScale = getBushRambleScale(agent);
  const minBushThick = Math.max(
    0.058,
    Math.min(
      Math.max(0.036, (agent.genome.minThickness || 0.06) * 0.45),
      (agent.genome.thicknessBase || 1.0) * (agent.genome.trunkGirthMod ?? 1.0) * 0.14,
    ),
  );

  // 1. Shrub Base Architecture: at depth 0, grow 1.8-unit trunk then burst into 3 diverging canes
  if (currentDepth === 0) {
    const trunkSplitDist = 1.8 * bushScale * (0.85 + 0.30 * Math.min(1.8, agent.genome.trunkGirthMod ?? 1.0));
    if (distSinceLastFork < trunkSplitDist && agent.age < 6) return false;
    const baseAzimuth = Math.random() * Math.PI * 2;
    const caneSpread = THREE.MathUtils.degToRad(28 + Math.random() * 10);
    const caneThickness = Math.max(minBushThick * 2.0, agent.thickness * 0.78);
    const trunkAxis = engine.designerMode
      ? (agent.isBasalEnd ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 1, 0))
      : agent.direction.lengthSq() > 1e-4
        ? agent.direction.clone().normalize()
        : (agent.isBasalEnd ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 1, 0));

    for (let c = 0; c < 3; c++) {
      const az = baseAzimuth + (c * Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.22;
      const perp = constructTransverseAxis(trunkAxis, az);
      const caneDir = trunkAxis
        .clone()
        .multiplyScalar(Math.cos(caneSpread))
        .addScaledVector(perp, Math.sin(caneSpread))
        .normalize();

      if (c === 0) {
        agent.direction.copy(caneDir); agent.thickness = caneThickness; agent.branchDepth = 1;
        agent.branchBasePos = agent.position.clone();
        initBushBranchTracking(agent, agent);
      } else {
        spawnBushChild(engine, agent, caneDir, caneThickness, 1, newAgents, strainCounts);
      }
    }
    return true;
  }

  // 2. Lateral Stems & Tendrils: Distance-Driven Branch Intervals
  const branchingDial = Math.max(20, engine.bushBranching || 50);
  const scale = 50 / branchingDial;
  let targetDist =
    (currentDepth === 1 ? 5.2 : 4.4) * bushScale * scale * (0.85 + ((agent.id || 0) % 5) * 0.08) * rambleScale;
  if (isOverSizeBudget(engine, agent.genome.name)) {
    targetDist *= 1.15;
  }

  const styleSetting = (engine as any).bushBranchStyle ||
    (typeof window !== "undefined" ? localStorage.getItem("bushBranchStyle") : null) || "hybrid";

  const reachedInterval = distSinceLastFork >= targetDist;
  const reachedCorymbTrigger =
    currentDepth >= 1 &&
    (branchDist >= 7.5 * bushScale * rambleScale ||
      (styleSetting === "corymb" && distSinceLastFork >= 3.2 * bushScale));

  if (!reachedInterval && !reachedCorymbTrigger && !isUnderMinCreatures) return false;

  const myStrainCount = strainCounts.get(agent.genome.name) || 1;
  const isSoft = !!(engine as any)._isSoftwareRaster;
  const maxBranches = isSoft ? 6 : Math.min(12, Math.max(7, Math.round(getMaxBranchesForArchetype(engine, "bush") * 0.50)));
  const globalAgentLimit = isSoft ? 22 : Math.max(engine.maxAgents * 2.5, (engine.maxCreatures || 12) * 10);
  if (activeAgents.length + newAgents.length >= globalAgentLimit && myStrainCount >= 2) {
    retireOldestBushSibling(engine, activeAgents, agent.genome.name, agent);
    return false;
  }
  const overBudget = isOverSizeBudget(engine, agent.genome.name) || myStrainCount >= maxBranches;

  if (overBudget) {
    const retired = retireOldestBushSibling(engine, activeAgents, agent.genome.name, agent);
    if (!retired && myStrainCount >= maxBranches) return false;
  }

  const childDepth = currentDepth >= 3 ? 2 : currentDepth + 1;
  const phase = ((agent as any).phyllotaxisPhase ?? 0) + GOLDEN_ANGLE_RAD;
  (agent as any).phyllotaxisPhase = phase;
  const forkAxis = constructTransverseAxis(agent.direction, phase);

  // Motif Selection
  let motif: "corymb" | "pinnate" | "bramble" = "bramble";
  if (styleSetting === "corymb" || reachedCorymbTrigger) motif = "corymb";
  else if (styleSetting === "pinnate") motif = Math.random() < 0.7 ? "pinnate" : "bramble";
  else if (styleSetting === "bramble") motif = "bramble";
  else {
    const r = Math.random();
    motif = r < 0.35 ? "corymb" : r < 0.65 ? "pinnate" : "bramble";
  }

  if (motif === "corymb") {
    const is3Way = currentDepth <= 2 && Math.random() < 0.45;
    if (overBudget && is3Way) retireOldestBushSibling(engine, activeAgents, agent.genome.name, agent);
    const forkAngle = THREE.MathUtils.degToRad(26 + Math.random() * 8);
    const dThick = Math.max(minBushThick, agent.thickness * 0.76);
    const corymbDepth = currentDepth >= 3 ? 2 : Math.max(2, currentDepth + 1);

    if (is3Way) {
      const perpDeflect = constructTransverseAxis(agent.direction, phase + Math.PI / 2);
      agent.direction.applyAxisAngle(perpDeflect, THREE.MathUtils.degToRad(14)).normalize();
      agent.thickness = dThick;
      initBushBranchTracking(agent, agent);
      agent.branchDepth = corymbDepth;
      const dirLeft = agent.direction.clone().applyAxisAngle(forkAxis, forkAngle).normalize();
      const dirRight = agent.direction.clone().applyAxisAngle(forkAxis, -forkAngle).normalize();
      spawnBushChild(engine, agent, dirLeft, dThick, corymbDepth, newAgents, strainCounts);
      spawnBushChild(engine, agent, dirRight, dThick, corymbDepth, newAgents, strainCounts);
    } else {
      const dirA = agent.direction.clone().applyAxisAngle(forkAxis, forkAngle).normalize();
      const dirB = agent.direction.clone().applyAxisAngle(forkAxis, -forkAngle).normalize();
      agent.direction.copy(dirA); agent.thickness = dThick;
      initBushBranchTracking(agent, agent);
      agent.branchDepth = corymbDepth;
      spawnBushChild(engine, agent, dirB, dThick, corymbDepth, newAgents, strainCounts);
    }
    return true;
  }

  if (motif === "pinnate") {
    if (overBudget) retireOldestBushSibling(engine, activeAgents, agent.genome.name, agent);
    const pinAngle = THREE.MathUtils.degToRad(30 + Math.random() * 8);
    const pinThick = Math.max(minBushThick, agent.thickness * 0.70);
    const dirLeft = agent.direction.clone().applyAxisAngle(forkAxis, pinAngle).normalize();
    const dirRight = agent.direction.clone().applyAxisAngle(forkAxis, -pinAngle).normalize();

    agent.thickness = Math.max(minBushThick * 1.15, agent.thickness * 0.84);
    (agent as any).distSinceLastFork = (agent as any).stepsSinceLastFork = 0;

    for (const d of [dirLeft, dirRight]) {
      spawnBushChild(engine, agent, d, pinThick, childDepth, newAgents, strainCounts);
    }
    return true;
  }

  // Motif 1: Sympodial Bramble Zig-Zag
  const forkAngle = THREE.MathUtils.degToRad(28 + Math.random() * 10);
  const parentDeflect = THREE.MathUtils.degToRad(12 + Math.random() * 6);
  const childThick = Math.max(minBushThick, agent.thickness * 0.74);
  const childDir = agent.direction.clone().applyAxisAngle(forkAxis, forkAngle).normalize();

  agent.direction.applyAxisAngle(forkAxis, -parentDeflect).normalize();
  agent.thickness = Math.max(minBushThick * 1.15, agent.thickness * 0.85);
  (agent as any).distSinceLastFork = (agent as any).stepsSinceLastFork = 0;

  spawnBushChild(engine, agent, childDir, childThick, childDepth, newAgents, strainCounts);
  return true;
}
