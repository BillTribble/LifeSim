import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { extrudePointedTerminalCap } from "./SimulationUpdateAgents";

export interface PruningStats {
  prunedDepth: number;
  prunedCrowding: number;
  prunedQuota: number;
  prunedBudget: number;
}

/**
 * Calculates the maximum healthy active branch count for an archetype,
 * taking into account the user's maxBranchesPerSpecies dial and pruningStrength.
 */
export function getMaxBranchesForArchetype(engine: SimulationEngine, archetype: string): number {
  const baseDial = engine.maxBranchesPerSpecies ?? 24;
  let archFactor = 1.0;
  if (archetype === "bush") archFactor = 1.0;
  else if (archetype === "tree") archFactor = 1.0;
  else if (archetype === "rhizome") archFactor = 0.90;
  else if (archetype === "snake") archFactor = 0.1;

  // Pruning strength modulates target branch density:
  // High pruning (1.5 - 2.0) -> tighter branch count for minimalist, clean sculptural patterns.
  // Low pruning (0.1 - 0.4) -> denser, more sprawling branch networks.
  const strength = engine.pruningStrength !== undefined ? engine.pruningStrength : 0.8;
  const pruneMod = 1.0 / Math.max(0.3, strength * 1.1);

  const minFloor = archetype === "bush" ? (engine.bushMinBranches ?? 2)
                 : archetype === "rhizome" ? (engine.rhizomeMinBranches ?? 6)
                 : archetype === "tree" ? (engine.treeMinBranches ?? 1)
                 : (engine.snakeMinBranches ?? 1);

  const computed = Math.round(baseDial * archFactor * pruneMod);
  return Math.max(minFloor + 1, computed);
}

/**
 * Clips an agent immediately with a sculpted terminal needle cap
 * and marks it inactive so it stops consuming CPU and spawning clutter.
 */
function pruneAgentTip(engine: SimulationEngine, agent: Agent) {
  extrudePointedTerminalCap(engine, agent, agent.genome, agent.thickness);
  agent.active = false;
  agent.tapering = false;
  agent.forceTapering = false;
}

/**
 * Returns true if an agent is a structural trunk or primary bough that
 * should NEVER be pruned (protects the organism's foundation and roots).
 */
function isStructuralStem(agent: Agent): boolean {
  const depth = agent.branchDepth || 0;
  if (depth <= 1) return true; // Trunk (0) and primary main limbs (1)
  const baseThick = agent.genome.thicknessBase || 1.0;
  if (agent.thickness >= baseThick * 0.45) return true; // Substantial load-bearing limb
  return false;
}

/**
 * Performs botanical pattern simplification on active branches:
 * 1. Structural Protection: Trunk and primary limbs (depth <= 1) are 100% immune from pruning.
 * 2. Depth Simplification: Clips outer twigs exceeding maxBranchDepth into clean tapered tips.
 * 3. Quota Simplification: If active tips exceed archetype quota, clips thinnest, highest-depth outer twigs first.
 * 4. Spatial Crowding / Canopy Thinning: Prunes overlapping subordinate twigs to create elegant negative space.
 * 5. High Load Management: Under high line count, throttles branch budgets and dissolves only thin peripheral twigs (never the trunk).
 */
export function performBranchPruning(
  engine: SimulationEngine,
  activeAgents: Agent[]
): PruningStats {
  const stats: PruningStats = {
    prunedDepth: 0,
    prunedCrowding: 0,
    prunedQuota: 0,
    prunedBudget: 0,
  };

  const pruningStrength = engine.pruningStrength !== undefined ? engine.pruningStrength : 0.8;
  if (pruningStrength <= 0.001) return stats;

  let totalHealthyAgents = 0;
  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.active && !a.tapering && !a.isFeeler) {
      totalHealthyAgents++;
    }
  }
  if (totalHealthyAgents <= engine.minCreatures) return stats;

  const maxBranchDepth = engine.maxBranchDepth !== undefined ? engine.maxBranchDepth : 4;

  // Group active non-feeler agents by strain
  const strainMap = new Map<string, Agent[]>();
  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.active && !a.isFeeler) {
      const sName = a.genome.name;
      let list = strainMap.get(sName);
      if (!list) {
        list = [];
        strainMap.set(sName, list);
      }
      list.push(a);
    }
  }

  // Line load factor: ratio of current segments to maxDOMs budget
  const lineLoad = engine.pointCount / Math.max(1000, engine.maxDOMs);

  for (const [strainName, agents] of strainMap.entries()) {
    const firstAgent = agents[0];
    const arch = firstAgent.genome.archetype || "bush";

    let minFloor = 1;
    if (arch === "bush") minFloor = engine.bushMinBranches ?? 2;
    else if (arch === "rhizome") minFloor = engine.rhizomeMinBranches ?? 6;
    else if (arch === "tree") minFloor = engine.treeMinBranches ?? 1;
    else if (arch === "snake") minFloor = engine.snakeMinBranches ?? 1;

    // 1. DEPTH SIMPLIFICATION:
    // Prune peripheral branches that exceed maxBranchDepth (eliminates tangled fractal fuzz)
    let remaining = agents.filter(a => a.active && !a.tapering);
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (!a.active || a.tapering) continue;
      const depth = a.branchDepth || 0;
      if (depth > maxBranchDepth && !isStructuralStem(a) && remaining.length > minFloor) {
        if (totalHealthyAgents - 1 < engine.minCreatures) break;
        pruneAgentTip(engine, a);
        totalHealthyAgents--;
        stats.prunedDepth++;
        remaining = agents.filter(x => x.active && !x.tapering);
      }
    }

    // 2. CAPACITY / QUOTA SIMPLIFICATION:
    // Keep active branch tips within a balanced botanical quota
    let targetBranchLimit = getMaxBranchesForArchetype(engine, arch);
    if (lineLoad > 0.65) {
      const loadPenalty = Math.max(0.35, 1.0 - (lineLoad - 0.65) * 2.0);
      targetBranchLimit = Math.max(minFloor + 1, Math.round(targetBranchLimit * loadPenalty));
    }

    if (remaining.length > targetBranchLimit) {
      const surplusCount = remaining.length - targetBranchLimit;

      // Candidate selection: prioritize outer twigs, never structural trunks
      const candidates = remaining.filter(a => !isStructuralStem(a)).sort((a, b) => {
        const depthA = a.branchDepth || 0;
        const depthB = b.branchDepth || 0;
        if (depthB !== depthA) return depthB - depthA; // higher depth (outer twigs) first
        if (a.thickness !== b.thickness) return a.thickness - b.thickness; // thinnest first
        return b.position.lengthSq() - a.position.lengthSq(); // outermost distance from base
      });

      const toPrune = Math.min(surplusCount, candidates.length);
      for (let k = 0; k < toPrune; k++) {
        if (totalHealthyAgents - 1 < engine.minCreatures) break;
        pruneAgentTip(engine, candidates[k]);
        totalHealthyAgents--;
        stats.prunedQuota++;
      }
    }

    // Refresh remaining active agents after quota pruning
    remaining = remaining.filter(a => a.active);

    // 3. SPATIAL CROWDING SIMPLIFICATION (Canopy Self-Thinning):
    // Prune overlapping branches growing too close together to open clean negative space
    if (pruningStrength >= 0.1 && remaining.length > minFloor) {
      const crowdingRadius = (arch === "rhizome" ? 3.5 : arch === "tree" ? 3.2 : 4.0) * (pruningStrength * 0.8);
      const crowdingRadiusSq = crowdingRadius * crowdingRadius;

      for (let i = 0; i < remaining.length; i++) {
        const a1 = remaining[i];
        if (!a1.active) continue;

        for (let j = i + 1; j < remaining.length; j++) {
          const a2 = remaining[j];
          if (!a2.active) continue;
          if (remaining.filter(a => a.active).length <= minFloor) break;
          if (totalHealthyAgents - 1 < engine.minCreatures) break;

          // Do not prune newly sprouted child branches against their parent before they have grown away
          if ((a1.parentId === a2.id && a1.age < 35) || (a2.parentId === a1.id && a2.age < 35)) continue;

          const dSq = a1.position.distanceToSquared(a2.position);
          if (dSq < crowdingRadiusSq) {
            const s1 = isStructuralStem(a1);
            const s2 = isStructuralStem(a2);
            if (s1 && s2) continue; // Both are structural stems -> preserve both!

            let victim: Agent;
            if (s1) {
              victim = a2;
            } else if (s2) {
              victim = a1;
            } else {
              const depth1 = a1.branchDepth || 0;
              const depth2 = a2.branchDepth || 0;
              if (depth1 !== depth2) {
                victim = depth1 > depth2 ? a1 : a2; // higher depth is victim
              } else if (Math.abs(a1.thickness - a2.thickness) > 0.05) {
                victim = a1.thickness < a2.thickness ? a1 : a2; // thinnest is victim
              } else {
                victim = a1.position.lengthSq() > a2.position.lengthSq() ? a1 : a2;
              }
            }

            pruneAgentTip(engine, victim);
            totalHealthyAgents--;
            stats.prunedCrowding++;
          }
        }
      }
    }
  }

  // 4. OVER-CAPACITY LINE BUDGET MANAGEMENT:
  // If lines approach maxDOMs, gently dissolve ONLY peripheral twig segments (never base/trunk!)
  if (lineLoad >= 0.95 && engine.segments.length > 0) {
    const overBudget = Math.floor((lineLoad - 0.90) * 80);
    let prunedCount = 0;
    const now = engine.unscaledTime;
    const maxScan = Math.min(engine.pointCount, engine.maxDOMs);
    const trunkReserved = Math.min(2000, Math.floor(engine.maxDOMs * 0.1));

    // Scan backwards from the newest segments, targeting ONLY fine peripheral twigs (thickness < 0.20)
    for (let i = maxScan - 1; i >= trunkReserved && prunedCount < overBudget; i--) {
      const seg = engine.segments[i];
      if (seg && !engine.dyingStems.has(i)) {
        if (seg.thickness < 0.20) {
          engine.markDying(engine.segments, engine.dyingStems, i, now);
          prunedCount++;
          stats.prunedBudget++;
        }
      }
    }
  }

  return stats;
}
