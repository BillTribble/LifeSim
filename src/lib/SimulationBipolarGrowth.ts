import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";

export const BASAL_SCALE = 0.15;

/**
 * Creates a basal twin agent growing in the opposite direction from the origin/seed point.
 * Tree and bush archetypes are bipolar: primary top end grows upward / forward (scale = 1.0),
 * basal bottom end grows in the opposite direction (scale = 0.15).
 * Both ends share the same initial thickness at the seed point so they join seamlessly.
 */
export function createBasalTwinAgent(engine: SimulationEngine, primary: Agent): Agent | null {
  const arch = primary.genome.archetype;
  if (arch !== "tree" && arch !== "bush") return null;
  if (primary.isBasalEnd) return null;

  // In designer mode: top end grows (0, 1, 0), basal end grows (0, -1, 0).
  // In 3D simulation mode: top end grows in spawn direction, basal end grows in negated direction.
  let basalDir: THREE.Vector3;
  if (engine.designerMode) {
    basalDir = new THREE.Vector3(0, -1, 0);
  } else {
    basalDir = primary.direction.lengthSq() > 1e-4
      ? primary.direction.clone().negate().normalize()
      : new THREE.Vector3(0, -1, 0);
  }

  const twinId = engine.nextAgentId++;
  if (primary.id === undefined) {
    primary.id = engine.nextAgentId++;
  }

  const twin: Agent = {
    id: twinId,
    position: primary.position.clone(),
    lastPosition: primary.position.clone(),
    direction: basalDir,
    genome: primary.genome,
    active: true,
    age: 0,
    thickness: primary.thickness,
    targetThickness: primary.thickness,
    cooldown: primary.cooldown,
    rootOrigin: (primary.rootOrigin || primary.position).clone(),
    branchBasePos: (primary.branchBasePos || primary.position).clone(),
    branchDepth: 0,
    isBasalEnd: true,
    growthScale: BASAL_SCALE,
    treeBudgetScale: BASAL_SCALE,
  };

  if (arch === "tree") {
    twin.treeAxis = engine.designerMode
      ? new THREE.Vector3(0, -1, 0)
      : primary.treeAxis
        ? primary.treeAxis.clone().negate().normalize()
        : basalDir.clone();
    twin.treeRoot = primary.position.clone();
    if (primary.treeBudget !== undefined) {
      twin.treeBudget = primary.treeBudget * BASAL_SCALE;
    }
  }

  return twin;
}
