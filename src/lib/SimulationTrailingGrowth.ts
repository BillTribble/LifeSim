import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";

const MAX_TRAILING_TIPS_PER_ORGANISM = 3;
const TARGET_TRAILING_TIPS = 2;
const MAX_TRAILING_AGE = 180;
const TRAILING_THICKNESS = 0.048;

/**
 * Sustains active trailing seeker twigs for all living organisms after their initial flush.
 * Each living organism maintains 1-3 delicate, continuing-to-grow trailing shoots (isSeekerTwig = true)
 * that wander through 3D space seeking mating partners.
 */
export function sustainTrailingGrowth(
  engine: SimulationEngine,
  activeAgents: Agent[],
  newAgents: Agent[],
): void {
  if (engine.designerMode) return;

  const trailingCountMap = new Map<string, number>();
  const candidatesMap = new Map<string, Agent[]>();

  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.isFeeler) continue;
    const name = a.genome.name;
    if (a.active && !a.tapering && a.isSeekerTwig) {
      trailingCountMap.set(name, (trailingCountMap.get(name) || 0) + 1);
    }
    let list = candidatesMap.get(name);
    if (!list) {
      list = [];
      candidatesMap.set(name, list);
    }
    list.push(a);
  }

  for (let i = 0; i < newAgents.length; i++) {
    const a = newAgents[i];
    if (a.isFeeler) continue;
    const name = a.genome.name;
    if (a.isSeekerTwig) {
      trailingCountMap.set(name, (trailingCountMap.get(name) || 0) + 1);
    }
  }

  for (const [name, candidates] of candidatesMap) {
    if (engine.dyingStrains?.has(name) || engine.suppressedStrains?.has(name)) continue;

    const trailingCount = trailingCountMap.get(name) || 0;
    if (trailingCount >= TARGET_TRAILING_TIPS) continue;

    let bestCandidate: Agent | null = null;
    let bestScore = -1;
    for (let c = 0; c < candidates.length; c++) {
      const cand = candidates[c];
      const depth = cand.branchDepth || 0;
      const score = depth * 100 + cand.age;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    if (!bestCandidate) continue;

    const wanderDir = bestCandidate.direction
      .clone()
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7))
      .normalize();

    const shoot: Agent = {
      id: engine.nextAgentId++,
      position: bestCandidate.position.clone(),
      lastPosition: bestCandidate.position.clone(),
      direction: wanderDir,
      genome: bestCandidate.genome,
      active: true,
      age: 0,
      thickness: Math.min(TRAILING_THICKNESS, (bestCandidate.genome.minThickness || 0.05) * 0.85),
      targetThickness: Math.min(TRAILING_THICKNESS, (bestCandidate.genome.minThickness || 0.05) * 0.85),
      cooldown: bestCandidate.cooldown || 0,
      branchDepth: Math.max(4, (bestCandidate.branchDepth || 0) + 1),
      isSeekerTwig: true,
      seekerFlushes: (bestCandidate.seekerFlushes || 0) + 1,
      isCanopy: true,
      rootOrigin: (bestCandidate.rootOrigin || bestCandidate.position).clone(),
      branchBasePos: bestCandidate.position.clone(),
    };

    newAgents.push(shoot);
    trailingCountMap.set(name, trailingCount + 1);
  }
}

/**
 * Steps the growth and branching for an active trailing seeker twig.
 * Branches at intervals while keeping total trailing tips within 1-3 to avoid runaway growth.
 */
export function stepTrailingBranching(
  engine: SimulationEngine,
  agent: Agent,
  newAgents: Agent[],
  activeAgents: Agent[],
): void {
  if (!agent.isSeekerTwig || agent.tapering || !agent.active) return;

  if (agent.thickness > 0.032) {
    agent.thickness *= 0.996;
  }

  if (agent.age > MAX_TRAILING_AGE) {
    agent.tapering = true;
    agent.taperBudget = 0;
    return;
  }

  if (agent.age > 15 && agent.age % 28 === 0 && Math.random() < 0.65) {
    const name = agent.genome.name;
    let trailingTips = 0;
    for (let i = 0; i < activeAgents.length; i++) {
      const a = activeAgents[i];
      if (a.active && !a.tapering && a.isSeekerTwig && a.genome.name === name) trailingTips++;
    }
    for (let i = 0; i < newAgents.length; i++) {
      if (newAgents[i].isSeekerTwig && newAgents[i].genome.name === name) trailingTips++;
    }

    if (trailingTips < MAX_TRAILING_TIPS_PER_ORGANISM) {
      const branchDir = agent.direction
        .clone()
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8))
        .normalize();

      const childTwig: Agent = {
        id: engine.nextAgentId++,
        position: agent.position.clone(),
        lastPosition: agent.position.clone(),
        direction: branchDir,
        genome: agent.genome,
        active: true,
        age: 0,
        thickness: Math.min(TRAILING_THICKNESS, agent.thickness * 0.92),
        targetThickness: Math.min(TRAILING_THICKNESS, agent.thickness * 0.92),
        cooldown: agent.cooldown || 0,
        branchDepth: (agent.branchDepth || 4) + 1,
        isSeekerTwig: true,
        seekerFlushes: agent.seekerFlushes,
        isCanopy: true,
        rootOrigin: agent.rootOrigin?.clone(),
        branchBasePos: agent.position.clone(),
      };

      newAgents.push(childTwig);
    }
  }
}
