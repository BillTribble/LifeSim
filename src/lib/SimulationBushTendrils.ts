import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import { isOverSizeBudget } from "./SimulationPartnerSearch";
import { getMaxBranchesForArchetype } from "./SimulationPruning";

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

export function applyBushTendrilSteering(engine: SimulationEngine, agent: Agent): void {
  if (agent.genome.archetype !== "bush") return;
  const depth = agent.branchDepth || 0, dist = (agent as any).branchDist ?? 0;
  if (agent.genome.movementType === "spiral") {
    const sign = (agent as any).spiralSign ?? 1, axis = (agent as any).spiralAxis ?? new THREE.Vector3(0, 1, 0);
    agent.direction.applyAxisAngle(axis, sign * 0.042).normalize();
  }
  // Radial fan relative to root birth position
  if (depth >= 1 && dist < 8.0) {
    const origin = agent.genome.birthPos || new THREE.Vector3(0, 0, 0);
    const radial = new THREE.Vector3(agent.position.x - origin.x, 0, agent.position.z - origin.z);
    if (radial.lengthSq() > 1e-4) radial.normalize(); else radial.set(1, 0, 0);
    agent.direction.add(radial.multiplyScalar(0.045).add(new THREE.Vector3(0, 0.065, 0))).normalize();
  }
}

export function canBushTipTaper(agent: Agent): boolean {
  if (agent.genome.archetype !== "bush" || (agent.branchDepth || 0) === 0) return true;
  return ((agent as any).branchDist ?? 0) >= 5.0;
}

export function retireOldestBushSibling(engine: SimulationEngine, activeAgents: Agent[], strainName: string): boolean {
  let oldest: Agent | null = null, maxAge = -1;
  for (let idx = 0; idx < activeAgents.length; idx++) {
    const a = activeAgents[idx];
    if (a.active && !a.tapering && !a.isFeeler && a.genome.name === strainName && (a.branchDepth || 0) > 0) {
      if (((a as any).branchDist ?? 0) >= 5.0 && a.age > maxAge) {
        maxAge = a.age; oldest = a;
      }
    }
  }
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
  const child: Agent = {
    position: parent.position.clone(), lastPosition: parent.position.clone(),
    direction: dir, genome: parent.genome, active: true, age: 0,
    thickness, targetThickness: thickness, cooldown: 0, id: engine.nextAgentId++,
    parentAgent: parent, parentId: parent.id, branchDepth: depth, isSeekerTwig: parent.isSeekerTwig,
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
  if (isOverSizeBudget(engine, agent.genome.name) && !agent.isSeekerTwig) return false;

  const currentDepth = agent.branchDepth || 0;
  const branchDist = (agent as any).branchDist ?? (agent.age * 0.6);
  const distSinceLastFork = (agent as any).distSinceLastFork ?? branchDist;

  // 1. Shrub Base Architecture: at depth 0, grow 5.5-unit trunk then burst into 3 diverging canes
  if (currentDepth === 0) {
    if (distSinceLastFork < 5.5) return false;
    const baseAzimuth = Math.random() * Math.PI * 2;
    const caneSpread = THREE.MathUtils.degToRad(36 + Math.random() * 12);
    const caneThickness = agent.thickness * 0.64;

    for (let c = 0; c < 3; c++) {
      const az = baseAzimuth + (c * Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.2;
      const caneDir = new THREE.Vector3(
        Math.cos(az) * Math.sin(caneSpread), Math.cos(caneSpread), Math.sin(az) * Math.sin(caneSpread),
      ).normalize();

      if (c === 0) {
        agent.direction.copy(caneDir); agent.thickness = caneThickness; agent.branchDepth = 1;
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
  const targetDist = (currentDepth === 1 ? 6.5 : 5.0) * scale * (0.85 + ((agent.id || 0) % 5) * 0.08);

  const styleSetting = (engine as any).bushBranchStyle ||
    (typeof window !== "undefined" ? localStorage.getItem("bushBranchStyle") : null) || "hybrid";

  const reachedInterval = distSinceLastFork >= targetDist;
  const reachedCorymbTrigger = currentDepth >= 1 && (branchDist >= 10.5 || (styleSetting === "corymb" && distSinceLastFork >= 5.0));

  if (!reachedInterval && !reachedCorymbTrigger && !isUnderMinCreatures) return false;

  const myStrainCount = strainCounts.get(agent.genome.name) || 1;
  const maxBranches = Math.max(24, getMaxBranchesForArchetype(engine, "bush"));
  const overBudget = isOverSizeBudget(engine, agent.genome.name) || myStrainCount >= maxBranches;

  if (overBudget) {
    const retired = retireOldestBushSibling(engine, activeAgents, agent.genome.name);
    if (!retired && myStrainCount >= maxBranches * 1.25) return false;
  }

  const maxDepthAllowed = engine.maxBranchDepth ?? 5;
  const childDepth = Math.min(maxDepthAllowed - 1, currentDepth + 1);
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
    if (overBudget && is3Way) retireOldestBushSibling(engine, activeAgents, agent.genome.name);
    const forkAngle = THREE.MathUtils.degToRad(38 + Math.random() * 8);
    const dThick = Math.max(0.045, agent.thickness * 0.68);
    const corymbDepth = Math.max(2, Math.min(currentDepth + 1, 4));

    if (is3Way) {
      const perpDeflect = constructTransverseAxis(agent.direction, phase + Math.PI / 2);
      agent.direction.applyAxisAngle(perpDeflect, THREE.MathUtils.degToRad(22)).normalize();
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
    if (overBudget) retireOldestBushSibling(engine, activeAgents, agent.genome.name);
    const pinAngle = THREE.MathUtils.degToRad(44 + Math.random() * 6);
    const pinThick = Math.max(0.045, agent.thickness * 0.54);
    const dirLeft = agent.direction.clone().applyAxisAngle(forkAxis, pinAngle).normalize();
    const dirRight = agent.direction.clone().applyAxisAngle(forkAxis, -pinAngle).normalize();

    agent.thickness = Math.max(0.05, agent.thickness * 0.72);
    (agent as any).distSinceLastFork = (agent as any).stepsSinceLastFork = 0;

    for (const d of [dirLeft, dirRight]) {
      spawnBushChild(engine, agent, d, pinThick, childDepth, newAgents, strainCounts);
    }
    return true;
  }

  // Motif 1: Sympodial Bramble Zig-Zag
  const forkAngle = THREE.MathUtils.degToRad(46 + Math.random() * 12);
  const parentDeflect = THREE.MathUtils.degToRad(28 + Math.random() * 10);
  const childThick = Math.max(0.045, agent.thickness * 0.62);
  const childDir = agent.direction.clone().applyAxisAngle(forkAxis, forkAngle).normalize();

  agent.direction.applyAxisAngle(forkAxis, -parentDeflect).normalize();
  agent.thickness = Math.max(0.05, agent.thickness * 0.74);
  (agent as any).distSinceLastFork = (agent as any).stepsSinceLastFork = 0;

  spawnBushChild(engine, agent, childDir, childThick, childDepth, newAgents, strainCounts);
  return true;
}
