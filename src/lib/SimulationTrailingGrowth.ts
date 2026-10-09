import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";

const MAX_TRAILING_TIPS_PER_ORGANISM = 6;
const TARGET_TRAILING_TIPS = 3;
const MAX_TRAILING_AGE = 120;
const TRAILING_THICKNESS = 0.068;

/**
 * Sustains active trailing seeker twigs for all living organisms after their initial flush.
 * Each living organism maintains 1-2 delicate, continuing-to-grow trailing shoots (isSeekerTwig = true)
 * that wander through 3D space seeking mating partners.
 */
export function sustainTrailingGrowth(
  engine: SimulationEngine,
  activeAgents: Agent[],
  newAgents: Agent[],
): void {
  if (engine.designerMode) return;

  const livingOrganisms = engine.getLivingOrganisms();
  if (livingOrganisms.size === 0) return;

  const trailingCountMap = new Map<string, number>();
  const candidatesMap = new Map<string, Agent[]>();
  const nonSeekerCountMap = new Map<string, number>();

  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.isFeeler) continue;
    const name = a.genome.name;
    if (a.active && !a.tapering && a.isSeekerTwig) {
      trailingCountMap.set(name, (trailingCountMap.get(name) || 0) + 1);
    }
    if (a.active && !a.tapering && !a.isSeekerTwig) {
      nonSeekerCountMap.set(name, (nonSeekerCountMap.get(name) || 0) + 1);
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
    if (!a.isSeekerTwig) {
      nonSeekerCountMap.set(name, (nonSeekerCountMap.get(name) || 0) + 1);
    }
  }

  for (const name of livingOrganisms) {
    if (engine.dyingStrains?.has(name) || engine.suppressedStrains?.has(name)) continue;

    const trailingCount = trailingCountMap.get(name) || 0;
    if (trailingCount >= TARGET_TRAILING_TIPS) continue;

    const candidates = candidatesMap.get(name) || [];

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

    if (bestCandidate) {
      const hasMature = candidates.some((c) => c.age >= 45);
      const hasActiveTrunk = candidates.some(
        (c) => c.active && !c.tapering && (c.branchDepth || 0) <= 1 && !(c as any).treeDormant,
      );
      if (!hasMature || hasActiveTrunk) continue;

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
        branchDepth: Math.max(3, (bestCandidate.branchDepth || 0) + 1),
        isSeekerTwig: true,
        seekerFlushes: (bestCandidate.seekerFlushes || 0) + 1,
        isCanopy: true,
        rootOrigin: (bestCandidate.rootOrigin || bestCandidate.position).clone(),
        branchBasePos: bestCandidate.position.clone(),
      };

      newAgents.push(shoot);
      trailingCountMap.set(name, trailingCount + 1);

      if ((nonSeekerCountMap.get(name) || 0) === 0 && (engine.frameCount || 0) % 25 === 0) {
        const g = bestCandidate.genome;
        const secThick = Math.max(0.14, Math.min(0.42, (g.minThickness || 0.22) * 1.15));
        const secDir = bestCandidate.direction
          .clone()
          .add(new THREE.Vector3((Math.random() - 0.5) * 0.65, (Math.random() - 0.5) * 0.65, (Math.random() - 0.5) * 0.65))
          .normalize();
        newAgents.push({
          id: engine.nextAgentId++,
          position: bestCandidate.position.clone(),
          lastPosition: bestCandidate.position.clone(),
          direction: secDir,
          genome: g,
          active: true,
          age: 0,
          thickness: secThick,
          targetThickness: secThick,
          cooldown: bestCandidate.cooldown || 0,
          branchDepth: 2,
          isSeekerTwig: false,
          isCanopy: true,
          rootOrigin: (bestCandidate.rootOrigin || bestCandidate.position).clone(),
          branchBasePos: bestCandidate.position.clone(),
        });
        nonSeekerCountMap.set(name, 1);
      }
    } else {
      // Throttle distal stem search to every 20 frames to keep simulation blazing fast
      if ((engine.frameCount || 0) % 20 !== 0) continue;
      const genome = engine.genomeMap.get(name);
      if (!genome) continue;

      let distalSegment: any = null;
      let maxDist = -1;
      const rootOrigin = new THREE.Vector3();
      const limit = Math.min(engine.pointCount, engine.maxDOMs);
      const stride = Math.max(1, Math.floor(limit / 200));

      for (let i = 0; i < limit; i += stride) {
        const seg = engine.segments[i];
        if (seg && seg.strainName === name && !seg.dyingStart && seg.startPos) {
          rootOrigin.copy(seg.startPos);
          break;
        }
      }

      for (let i = limit - 1; i >= 0; i -= stride) {
        const seg = engine.segments[i];
        if (seg && seg.strainName === name && !seg.dyingStart && !engine.dyingStems.has(i) && seg.endPos) {
          const d = seg.endPos.distanceToSquared(rootOrigin);
          if (d > maxDist) {
            maxDist = d;
            distalSegment = seg;
          }
        }
      }

      if (distalSegment && distalSegment.startPos && distalSegment.endPos) {
        const segDir = new THREE.Vector3().subVectors(distalSegment.endPos, distalSegment.startPos).normalize();
        if (segDir.lengthSq() < 0.1) segDir.set(0, 1, 0);
        const wanderDir = segDir
          .clone()
          .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8))
          .normalize();

        const shoot: Agent = {
          id: engine.nextAgentId++,
          position: distalSegment.endPos.clone(),
          lastPosition: distalSegment.endPos.clone(),
          direction: wanderDir,
          genome: genome,
          active: true,
          age: 0,
          thickness: Math.min(TRAILING_THICKNESS, (genome.minThickness || 0.05) * 0.85),
          targetThickness: Math.min(TRAILING_THICKNESS, (genome.minThickness || 0.05) * 0.85),
          cooldown: 0,
          branchDepth: 3,
          isSeekerTwig: true,
          seekerFlushes: 1,
          isCanopy: true,
          rootOrigin: rootOrigin.clone(),
          branchBasePos: distalSegment.endPos.clone(),
        };

        newAgents.push(shoot);
        trailingCountMap.set(name, trailingCount + 1);

        if ((nonSeekerCountMap.get(name) || 0) === 0) {
          const secThick = Math.max(0.14, Math.min(0.42, (genome.minThickness || 0.22) * 1.15));
          const secDir = segDir
            .clone()
            .add(new THREE.Vector3((Math.random() - 0.5) * 0.65, (Math.random() - 0.5) * 0.65, (Math.random() - 0.5) * 0.65))
            .normalize();
          newAgents.push({
            id: engine.nextAgentId++,
            position: distalSegment.endPos.clone(),
            lastPosition: distalSegment.endPos.clone(),
            direction: secDir,
            genome: genome,
            active: true,
            age: 0,
            thickness: secThick,
            targetThickness: secThick,
            cooldown: 0,
            branchDepth: 2,
            isSeekerTwig: false,
            isCanopy: true,
            rootOrigin: rootOrigin.clone(),
            branchBasePos: distalSegment.endPos.clone(),
          });
          nonSeekerCountMap.set(name, 1);
        }
      }
    }
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

  const ref = Math.abs(agent.direction.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const p = new THREE.Vector3().crossVectors(agent.direction, ref).normalize();
  agent.direction.applyAxisAngle(p, 0.14 * Math.sin(agent.age * 0.25 + (agent.id || 0))).normalize();

  if (agent.age > MAX_TRAILING_AGE * 0.6) {
    const frac = (agent.age - MAX_TRAILING_AGE * 0.6) / (MAX_TRAILING_AGE * 0.4);
    agent.thickness = THREE.MathUtils.lerp(TRAILING_THICKNESS, 0.02, frac);
  }

  if (agent.age > MAX_TRAILING_AGE) {
    agent.tapering = true;
    agent.taperBudget = 0;
    return;
  }

  if (agent.age >= 14 && agent.age % 16 === 0 && Math.random() < 0.82) {
    const name = agent.genome.name;
    let trailingTips = 0;
    let oldest: Agent | null = null;
    let maxAge = -1;
    for (let i = 0; i < activeAgents.length; i++) {
      const a = activeAgents[i];
      if (a.active && !a.tapering && a.isSeekerTwig && a.genome.name === name) {
        trailingTips++;
        if (a !== agent && a.age > 20 && a.age > maxAge) {
          maxAge = a.age;
          oldest = a;
        }
      }
    }
    for (let i = 0; i < newAgents.length; i++) {
      if (newAgents[i].isSeekerTwig && newAgents[i].genome.name === name) trailingTips++;
    }

    if (trailingTips >= MAX_TRAILING_TIPS_PER_ORGANISM) {
      if (oldest) {
        oldest.tapering = true;
        oldest.taperBudget = 0;
      } else {
        return;
      }
    }

    const transverse = new THREE.Vector3().crossVectors(agent.direction, ref).normalize();
    const branchDir = agent.direction.clone().applyAxisAngle(transverse, THREE.MathUtils.degToRad(26)).normalize();
    agent.direction.applyAxisAngle(transverse, THREE.MathUtils.degToRad(-18)).normalize();

    const childThickness = Math.max(0.038, agent.thickness * 0.88);
    agent.thickness = Math.max(0.038, agent.thickness * 0.92);

    const childTwig: Agent = {
      id: engine.nextAgentId++,
      position: agent.position.clone(),
      lastPosition: agent.position.clone(),
      direction: branchDir,
      genome: agent.genome,
      active: true,
      age: 0,
      thickness: childThickness,
      targetThickness: childThickness,
      cooldown: agent.cooldown || 0,
      branchDepth: (agent.branchDepth || 3) + 1,
      isSeekerTwig: true,
      seekerFlushes: agent.seekerFlushes,
      isCanopy: true,
      rootOrigin: agent.rootOrigin?.clone(),
      branchBasePos: agent.position.clone(),
    };

    newAgents.push(childTwig);
  }
}
