import { getEvolutionStepConfig } from "./EvolutionPresets";
import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent, Archetype, Genome } from "./SimulationTypes";
import { getMaxBranchesForArchetype } from "./SimulationPruning";
import { isTreeModelAgent, applyTreeTropism } from "./SimulationTreeArchitecture";

export type BotanicalConcept =
  | "auto"
  | "oak"
  | "elm"
  | "pine"
  | "willow"
  | "rhizome_web";

export interface BotanicalConceptMeta {
  id: BotanicalConcept;
  label: string;
  shortLabel: string;
  subtitle: string;
  archetype: Archetype;
}

export const BOTANICAL_CONCEPTS: BotanicalConceptMeta[] = [
  {
    id: "auto",
    label: "Auto ecosystem",
    shortLabel: "Auto Mix",
    subtitle: "Natural forest & rhizome mix across all 5 botanical habits",
    archetype: "tree",
  },
  {
    id: "oak",
    label: "Gnarled oak",
    shortLabel: "Gnarled Oak",
    subtitle: "Sympodial zig-zag limbs, crown shyness & crooked twig filigree (Pic 3 & 4)",
    archetype: "tree",
  },
  {
    id: "elm",
    label: "Spreading elm",
    shortLabel: "Spreading Elm",
    subtitle: "Deliquescent vase trunk dividing into arching umbrella boughs (Pic 4)",
    archetype: "tree",
  },
  {
    id: "pine",
    label: "Whorled pine",
    shortLabel: "Whorled Pine",
    subtitle: "Excurrent vertical leader with tiered horizontal branch whorls (Pic 4)",
    archetype: "tree",
  },
  {
    id: "willow",
    label: "Weeping willow",
    shortLabel: "Weeping Willow",
    subtitle: "Ascending structural scaffold with gravity-draped pendulous strands (Pic 4)",
    archetype: "bush",
  },
  {
    id: "rhizome_web",
    label: "Vascular rhizome",
    shortLabel: "Vascular Web",
    subtitle: "Da Vinci pipe-model arterial network with anastomosing capillary loops",
    archetype: "rhizome",
  },
];

const CONCRETE_HABITS: Exclude<BotanicalConcept, "auto">[] = [
  "oak",
  "elm",
  "pine",
  "willow",
  "rhizome_web",
];

/**
 * Resolves the concrete botanical growth habit for a given agent/genome.
 */
export function resolveAgentHabit(
  engine: SimulationEngine,
  genome: Genome,
): Exclude<BotanicalConcept, "auto"> {
  const activeConcept: BotanicalConcept =
    (engine as any).botanicalConcept || "auto";
  if (activeConcept !== "auto") {
    return activeConcept;
  }
  if (genome.growthHabit && genome.growthHabit !== "auto") {
    return genome.growthHabit as Exclude<BotanicalConcept, "auto">;
  }
  if (genome.archetype === "rhizome") return "rhizome_web";
  // Deterministic hash from strain name so each organism in Auto mode keeps a consistent habit
  let hash = 0;
  for (let i = 0; i < genome.name.length; i++) {
    hash = (hash * 31 + genome.name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % CONCRETE_HABITS.length;
  return CONCRETE_HABITS[idx];
}

/**
 * Applies per-tick botanical steering:
 * - Coherent 3D sympodial gnarl/tortuosity (sweeping S-boughs -> crinkly terminal twiglets)
 * - Habit-specific gravitropism (Pine leader, Elm vase arch, Willow gravity droop, Oak spread)
 * - Crown shyness (same/neighbor twig repulsion to carve organic negative-space channels)
 * - Capillary anastomosis (vascular rhizome lateral cross-linking)
 */
export function applyBotanicalConceptSteering(
  engine: SimulationEngine,
  agent: Agent,
  activeAgents: Agent[],
  effectiveWanderIntensity: number,
): void {
  if (agent.isFeeler) return;

  const habit = resolveAgentHabit(engine, agent.genome);
  const depth = agent.branchDepth || 0;
  const idSeed = (agent.id || 1) * 1.731;
  const age = agent.age || 0;
  const evo = getEvolutionStepConfig((engine as any).evolutionStep);
  const curviness = Math.max(0.1, ((engine.stemCurviness ?? 3.0) / 3.0) * evo.curvinessAmp);

  // 1. Coherent 3D Curl / Tortuosity (replaces flat noisy jitter with organic crookedness)
  if (habit === "oak" || habit === "rhizome_web" || habit === "elm" || habit === "pine") {
    const freq =
      habit === "oak"
        ? 0.09 + depth * 0.055
        : habit === "pine"
          ? 0.06 + depth * 0.04
          : habit === "rhizome_web"
            ? 0.07 + depth * 0.045
            : 0.05 + depth * 0.035;
    const amp =
      (habit === "oak"
        ? 0.065 + Math.min(0.08, depth * 0.018)
        : habit === "pine"
          ? 0.05 + Math.min(0.07, depth * 0.016)
          : habit === "rhizome_web"
            ? 0.045 + Math.min(0.06, depth * 0.014)
            : 0.028 + depth * 0.01) * curviness;

    const curlX =
      Math.sin(age * freq + idSeed) * Math.cos(age * freq * 0.61 - idSeed);
    const curlY =
      Math.cos(age * freq * 0.83 + idSeed * 1.3) * 0.6;
    const curlZ =
      Math.sin(age * freq * 1.17 - idSeed * 0.7) *
      Math.sin(age * freq * 0.53 + idSeed);

    const curlVec = new THREE.Vector3(curlX, curlY, curlZ).multiplyScalar(
      amp * (0.7 + effectiveWanderIntensity * 0.5),
    );
    agent.direction.add(curlVec).normalize();
  }

  // 2. Habit-Specific Gravitropism & Tropism Envelopes (Pic 3 & Pic 4)
  if (isTreeModelAgent(agent)) {
    applyTreeTropism(engine, agent);
  } else if (habit === "pine") {
    if (depth === 0) {
      // White Pine (Pic 4 Top-Left): Arrow-straight vertical central leader
      agent.direction.lerp(new THREE.Vector3(0, 1, 0), 0.22).normalize();
    } else {
      // Tiered horizontal whorls with slight upward tip turn at the very end
      const targetY = depth === 1 ? 0.04 : 0.08;
      agent.direction.y = THREE.MathUtils.lerp(agent.direction.y, targetY, 0.14);
      agent.direction.normalize();
    }
  } else if (habit === "elm") {
    // American Elm (Pic 4 Top-Right): Deliquescent vase trunk -> arching outward umbrella crown
    if (depth === 0 && age < 18) {
      agent.direction.lerp(new THREE.Vector3(0, 1, 0), 0.16).normalize();
    } else if (depth <= 2) {
      const archProgress = Math.min(1.0, age / 75);
      const liftY = 0.62 * (1.0 - archProgress * 0.85);
      const radial = new THREE.Vector3(agent.direction.x, 0, agent.direction.z);
      if (radial.lengthSq() < 0.001) {
        radial.set(Math.cos(idSeed), 0, Math.sin(idSeed));
      }
      radial.normalize();
      const targetDir = new THREE.Vector3(
        radial.x * (0.45 + archProgress * 0.55),
        liftY,
        radial.z * (0.45 + archProgress * 0.55),
      ).normalize();
      agent.direction.lerp(targetDir, 0.065).normalize();
    } else {
      // Fine outer umbrella twiglets gently cascade at the crown rim
      agent.direction.y -= 0.018;
      agent.direction.normalize();
    }
  } else if (habit === "willow") {
    // Weeping Willow (Pic 4 Bottom-Left): Ascending scaffold -> elastic gravity-draped curtains
    if (depth <= 1 && age < 36) {
      const radial = new THREE.Vector3(agent.direction.x, 0, agent.direction.z);
      if (radial.lengthSq() < 0.001) {
        radial.set(Math.cos(idSeed), 0, Math.sin(idSeed));
      }
      radial.normalize();
      const scaffoldDir = new THREE.Vector3(
        radial.x * 0.65,
        0.75,
        radial.z * 0.65,
      ).normalize();
      agent.direction.lerp(scaffoldDir, 0.08).normalize();
    } else {
      // Elastic bending under gravity as branchlet thins
      const baseR = Math.max(0.5, agent.genome.thicknessBase);
      const thinFactor = Math.max(
        0.2,
        1.0 - agent.thickness / (baseR * 0.85),
      );
      const droopStrength = 0.045 + thinFactor * 0.075 + depth * 0.015;
      agent.direction.lerp(new THREE.Vector3(0, -1, 0), Math.min(0.18, droopStrength)).normalize();
    }
  } else if (habit === "oak") {
    // White Oak / Gnarled Canopy (Pic 3 & Pic 4 Bottom-Right)
    if (depth === 0 && age < 14) {
      agent.direction.lerp(new THREE.Vector3(0, 1, 0), 0.12).normalize();
    } else if (depth === 1) {
      // Wide-spreading / ascending heavy boughs (55-75 deg from vertical)
      agent.direction.y = THREE.MathUtils.lerp(agent.direction.y, 0.28, 0.04);
      agent.direction.normalize();
    }
  } else if (habit === "rhizome_web") {
    // Vascular Rhizome: Creeping radial fan with gentle undulation & capillary anastomosis
    agent.direction.y *= 0.92;
    agent.direction.normalize();
  }

  // 3. Crown Shyness (for Tree/Bush habits) & Capillary Anastomosis (for Vascular Rhizome)
  const treeModel = isTreeModelAgent(agent);
  if (depth >= 1 && activeAgents.length > 1 && !(treeModel && depth === 1)) {
    const shynessVec = new THREE.Vector3();
    let shynessCount = 0;
    const anastomosisVec = new THREE.Vector3();
    let anastomosisCount = 0;

    const shyRadiusSq = habit === "oak" ? 81.0 : 49.0; // 9 or 7 units

    for (let i = 0; i < activeAgents.length; i += 2) {
      const other = activeAgents[i];
      if (other === agent || !other.active || other.isFeeler) continue;
      if (other.parentId === agent.id || agent.parentId === other.id) continue;

      const dSq = agent.position.distanceToSquared(other.position);
      if (habit === "rhizome_web" && depth >= 2) {
        // Anastomosis: fine capillary tendrils between 3.5 and 11 units gently attract to form webbed loops
        if (dSq > 12.0 && dSq < 121.0 && (other.branchDepth || 0) >= 1) {
          anastomosisVec.add(
            new THREE.Vector3().subVectors(other.position, agent.position).normalize(),
          );
          anastomosisCount++;
        } else if (dSq <= 12.0 && dSq > 0.01) {
          shynessVec.add(
            new THREE.Vector3().subVectors(agent.position, other.position).normalize(),
          );
          shynessCount++;
        }
      } else if (dSq < shyRadiusSq && dSq > 0.01) {
        // Crown Shyness: twig clouds repel each other to keep crisp sky channels between boughs (Pic 3)
        const weight = 1.0 - Math.sqrt(dSq / shyRadiusSq);
        shynessVec.addScaledVector(
          new THREE.Vector3().subVectors(agent.position, other.position).normalize(),
          weight,
        );
        shynessCount++;
      }
    }

    if (shynessCount > 0) {
      shynessVec.divideScalar(shynessCount);
      const shyStrength =
        (habit === "oak" ? 1.15 : 0.85) * evo.crownShynessStrength * (treeModel ? 0.6 : 1);
      agent.direction.addScaledVector(shynessVec, shyStrength).normalize();
    }
    if (anastomosisCount > 0) {
      anastomosisVec.divideScalar(anastomosisCount);
      agent.direction.addScaledVector(anastomosisVec, evo.anastomosisStrength).normalize();
    }
  }
}

/**
 * Computes step-size scaling per branch order so primary boughs are long and structural
 * while higher-order twigs (`depth 3-6`) condense into rich, crooked filigree.
 */
export function getBotanicalStepSize(
  engine: SimulationEngine,
  agent: Agent,
  baseStepSize: number,
): number {
  const habit = resolveAgentHabit(engine, agent.genome);
  const depth = agent.branchDepth || 0;

  const evo = getEvolutionStepConfig((engine as any).evolutionStep);
  if (habit === "oak") {
    return baseStepSize * Math.max(0.18, Math.pow(evo.depthStepDecay, depth));
  } else if (habit === "elm") {
    return baseStepSize * Math.max(0.24, Math.pow(0.73, depth));
  } else if (habit === "pine") {
    if (depth === 0) return baseStepSize * 1.15;
    // Conical taper: higher whorls along the pine trunk take shorter steps
    const heightProgress = THREE.MathUtils.clamp((agent.position.y + 10) / 55, 0, 0.75);
    return baseStepSize * (1.0 - heightProgress * 0.65) * Math.pow(0.68, depth - 1);
  } else if (habit === "willow") {
    // Weeping willow curtains stay fluid and long at higher depths
    return baseStepSize * (depth <= 1 ? 0.85 : 0.72);
  } else {
    // Vascular rhizome: arterial runners step briskly, capillary tendrils step finely
    return baseStepSize * Math.max(0.22, Math.pow(0.66, depth));
  }
}

/**
 * Executes Da Vinci Pipe-Model bifurcation ($r_0^\gamma = r_1^\gamma + r_2^\gamma$)
 * and momentum-balanced sympodial node deflection ($\theta_{\text{parent}} = -\theta_{\text{child}} \frac{\alpha}{1-\alpha}$).
 */

export function computeDaVinciFork(
  parentRadius: number,
  forkAngle: number,
  alpha: number,
  gamma: number,
  sympodialFactor: number,
) {
  const childRadius = Math.max(0.03, parentRadius * Math.pow(alpha, 1.0 / gamma));
  const leaderRadius = Math.max(0.04, parentRadius * Math.pow(1.0 - alpha, 1.0 / gamma));
  const parentDeflection = -forkAngle * (alpha / Math.max(0.25, 1.0 - alpha)) * sympodialFactor;
  return { childRadius, leaderRadius, parentDeflection };
}

export function executeBotanicalBranching(
  engine: SimulationEngine,
  agent: Agent,
  activeAgents: Agent[],
  newAgents: Agent[],
  strainCounts: Map<string, number>,
  effectiveBifurcationRate: number,
  isUnderMinCreatures: boolean,
): void {
  if (agent.isFeeler || agent.tapering) return;

  const genome = agent.genome;
  const habit = resolveAgentHabit(engine, genome);
  const currentDepth = agent.branchDepth || 0;

  const myStrainCount = strainCounts.get(genome.name) || 1;
  const maxForArchetype = Math.max(
    36,
    getMaxBranchesForArchetype(engine, genome.archetype) * 1.6,
  );
  const evo = getEvolutionStepConfig((engine as any).evolutionStep);
  const maxDepthAllowed = evo.maxDepth;

  const allowedToBranch =
    (myStrainCount < maxForArchetype || isUnderMinCreatures) &&
    (currentDepth < maxDepthAllowed || isUnderMinCreatures);

  if (agent.branchCooldown && agent.branchCooldown > 0) {
    agent.branchCooldown--;
  }

  const baseMinInterval =
    habit === "pine" && currentDepth === 0
      ? 9
      : habit === "oak"
        ? Math.max(3, 7 - currentDepth)
        : habit === "rhizome_web"
          ? Math.max(3, 6 - currentDepth)
          : Math.max(3, 6 - currentDepth);

  const branchReady =
    (agent.branchCooldown || 0) <= 0 && agent.age >= baseMinInterval;

  const liveBranchTendency =
    (genome.branchTendency || 1.0) * ((engine.branchTendencyVar || 20.0) / 20.0);
  const brMult = Math.max(0.2, engine.branchingMultiplier ?? 1.0);
  const pruneBifurcationMod = Math.max(
    0.35,
    1.0 - ((engine.pruningStrength ?? 0.8) - 0.5) * 0.25,
  );

  let branchProb =
    effectiveBifurcationRate *
    liveBranchTendency *
    brMult *
    0.012 *
    pruneBifurcationMod;

  // Ramification boost at outer depths (depth 1-4) so crowns and rhizomes burst into fine twiglets
  if (currentDepth >= 1 && currentDepth <= 5) {
    branchProb *= evo.twigRamificationBoost * (0.85 + currentDepth * 0.18);
  }
  if (habit === "pine" && currentDepth === 0 && agent.age % 10 === 0 && agent.age >= 10) {
    branchProb = 0.95; // Deterministic pine whorl tiers
  }
  if (habit === "elm" && currentDepth === 0 && agent.age >= 18) {
    branchProb = 0.95; // Deterministic deliquescent elm trunk division
  }
  if (isUnderMinCreatures) {
    branchProb = Math.max(0.08, branchProb * 1.6);
  }

  if (
    !allowedToBranch ||
    !branchReady ||
    activeAgents.length + newAgents.length >= engine.maxAgents * 3.5 ||
    Math.random() >= branchProb
  ) {
    return;
  }

  agent.branchCooldown = baseMinInterval + Math.floor(Math.random() * 3);

  // SPECIAL CASE 1: White Pine Excurrent Whorl (3-4 radial horizontal branches, leader continues straight)
  if (habit === "pine" && currentDepth === 0 && evo.round >= 8) {
    const whorlCount = 3 + (Math.random() < 0.5 ? 1 : 0);
    const baseAzimuth = Math.random() * Math.PI * 2;
    const heightFactor = THREE.MathUtils.clamp(1.0 - (agent.age / 140) * 0.55, 0.3, 1.0);

    for (let w = 0; w < whorlCount; w++) {
      const az = baseAzimuth + (w * Math.PI * 2) / whorlCount + (Math.random() - 0.5) * 0.2;
      const whorlDir = new THREE.Vector3(
        Math.cos(az) * 0.98,
        0.06 + (Math.random() - 0.5) * 0.08,
        Math.sin(az) * 0.98,
      ).normalize();
      const childThick = Math.max(0.12, agent.thickness * 0.42 * heightFactor);

      newAgents.push({
        position: agent.position.clone(),
        lastPosition: agent.position.clone(),
        direction: whorlDir,
        genome,
        active: true,
        age: 10,
        isCanopy: true,
        thickness: childThick,
        targetThickness: childThick,
        cooldown: Math.max(agent.cooldown || 0, 140),
        id: engine.nextAgentId++,
        parentAgent: agent,
        parentId: agent.id,
        branchDepth: 1,
      });
    }
    // Leader thins slightly after throwing a whorl
    agent.thickness *= 0.92;
    return;
  }

  // SPECIAL CASE 2: American Elm Deliquescent Vase Division (trunk splits into 3 co-dominant arching boughs)
  if (habit === "elm" && currentDepth === 0 && agent.age >= 16 && evo.round >= 8) {
    const vaseCount = 3;
    const baseAz = Math.random() * Math.PI * 2;
    const gamma = 2.05;
    const boughRadius = agent.thickness * Math.pow(1.0 / vaseCount, 1.0 / gamma);

    for (let v = 0; v < vaseCount; v++) {
      const az = baseAz + (v * Math.PI * 2) / vaseCount + (Math.random() - 0.5) * 0.25;
      const spread = 0.48 + Math.random() * 0.14; // ~28-36 deg from vertical
      const boughDir = new THREE.Vector3(
        Math.cos(az) * spread,
        0.86,
        Math.sin(az) * spread,
      ).normalize();

      if (v === 0) {
        agent.direction.copy(boughDir);
        agent.thickness = boughRadius;
        agent.branchDepth = 1;
        agent.isCanopy = true;
      } else {
        newAgents.push({
          position: agent.position.clone(),
          lastPosition: agent.position.clone(),
          direction: boughDir,
          genome,
          active: true,
          age: 15,
          isCanopy: true,
          thickness: boughRadius,
          targetThickness: boughRadius,
          cooldown: Math.max(agent.cooldown || 0, 140),
          id: engine.nextAgentId++,
          parentAgent: agent,
          parentId: agent.id,
          branchDepth: 1,
        });
      }
    }
    return;
  }

  // STANDARD DA VINCI PIPE-MODEL FORK + SYMPODIAL DEFLECTION (Oak, Willow, Vascular Rhizome, Sub-branches)
  const isEqualSplit = Math.random() < (engine.branchSplitSizeProb ?? 0.35);
  const gamma = evo.daVinciGamma;
  const alpha = isEqualSplit
    ? 0.44 + Math.random() * 0.06
    : habit === "oak"
      ? currentDepth === 0
        ? 0.42
        : 0.34 + Math.random() * 0.14
      : habit === "rhizome_web"
        ? 0.32 + Math.random() * 0.16
        : habit === "willow"
          ? currentDepth === 0
            ? 0.45
            : 0.28
          : 0.35 + Math.random() * 0.12;

  const { childRadius, leaderRadius, parentDeflection: dvDeflection } = computeDaVinciFork(
    agent.thickness,
    0.5,
    alpha,
    gamma,
    0.8,
  );
  const childRatio = childRadius / Math.max(0.01, agent.thickness);
  const leaderRatio = leaderRadius / Math.max(0.01, agent.thickness);

  const baseDeg = evo.forkAngleDeg;
  const forkAngle =
    habit === "oak"
      ? THREE.MathUtils.degToRad(baseDeg + (Math.random() - 0.3) * 18)
      : habit === "rhizome_web"
        ? THREE.MathUtils.degToRad(baseDeg * 0.82 + (Math.random() - 0.3) * 16)
        : THREE.MathUtils.degToRad(baseDeg * 0.88 + (Math.random() - 0.3) * 16);

  const randomUp = new THREE.Vector3(
    Math.random() - 0.5,
    (habit === "rhizome_web" ? 0.85 : 0.35) * (Math.random() - 0.5),
    Math.random() - 0.5,
  ).normalize();
  let forkAxis = new THREE.Vector3().crossVectors(agent.direction, randomUp).normalize();
  if (forkAxis.lengthSq() < 0.001) forkAxis.set(0, 1, 0);

  const newDirection = agent.direction.clone().applyAxisAngle(forkAxis, forkAngle).normalize();

  // Momentum-balanced sympodial deflection: parent kinks in the opposite direction (-forkAngle * alpha/(1-alpha))
  const sympodialFactor = evo.sympodialFactor * (habit === "oak" ? 1.0 : habit === "rhizome_web" ? 0.88 : 0.78);
  const parentDeflection =
    -forkAngle * (alpha / Math.max(0.25, 1.0 - alpha)) * sympodialFactor;
  agent.direction.applyAxisAngle(forkAxis, parentDeflection).normalize();

  const childThickness = Math.max(0.03, agent.thickness * childRatio);
  agent.thickness = Math.max(0.04, agent.thickness * leaderRatio);

  newAgents.push({
    position: agent.position.clone(),
    lastPosition: agent.position.clone(),
    direction: newDirection,
    genome,
    active: true,
    age: agent.isCanopy ? 24 : 0,
    isCanopy: agent.isCanopy || currentDepth >= 1,
    thickness: childThickness,
    targetThickness: childThickness,
    cooldown: Math.max(agent.cooldown || 0, 150),
    id: engine.nextAgentId++,
    parentAgent: agent,
    parentId: agent.id,
    branchDepth: currentDepth + 1,
  });

  if (engine.sound) {
    engine.sound.onBranchSpawn(agent, engine.camera);
  }
}

/**
 * Spawns botanical foliage/appendages along branches while keeping `depth === 0`
 * structural trunks and primary vascular arteries clean of oversized blobs (fixing Pic 2).
 */
export function spawnAgentAppendages(
  engine: SimulationEngine,
  agent: Agent,
  genome: Genome,
  renderThickness: number,
): void {
  if (agent.tapering || agent.isFeeler) return;

  const evo = getEvolutionStepConfig((engine as any).evolutionStep);
  const depth = agent.branchDepth || 0;
  if (depth < evo.appendageMinDepth && agent.age < 45) return;
  if (depth === 0 && evo.round >= 6 && renderThickness > 0.95) return;

  const cappedAppThickness = Math.min(renderThickness, evo.maxAppThickness);

  if (
    (genome.appendage === "hair" ||
      genome.appendage === "curlyHair" ||
      genome.appendage === "spirals") &&
    Math.random() < 0.45 * engine.ornamentFrequency
  ) {
    const rad = Math.random() * Math.PI * 2;
    const ax1 = new THREE.Vector3()
      .crossVectors(agent.direction, new THREE.Vector3(0, 1, 0))
      .normalize();
    const ax2 = new THREE.Vector3().crossVectors(agent.direction, ax1).normalize();
    const dir = ax1
      .multiplyScalar(Math.cos(rad))
      .add(ax2.multiplyScalar(Math.sin(rad)))
      .normalize();

    const hairStart = agent.position
      .clone()
      .add(dir.clone().multiplyScalar(renderThickness));
    const hairEnd = hairStart
      .clone()
      .add(dir.clone().multiplyScalar(3 + Math.random() * 4));
    engine.addLineSegment(
      hairStart,
      hairEnd,
      genome,
      cappedAppThickness * 0.12,
      true,
      agent.id,
    );
  } else if (
    (genome.appendage === "thorns" ||
      genome.appendage === "crystals" ||
      genome.appendage === "sparkles") &&
    Math.random() < 0.4 * engine.ornamentFrequency
  ) {
    const rad = Math.random() * Math.PI * 2;
    const ax1 = new THREE.Vector3()
      .crossVectors(agent.direction, new THREE.Vector3(1, 0, 0))
      .normalize();
    const dir = new THREE.Vector3()
      .crossVectors(agent.direction, ax1)
      .applyAxisAngle(agent.direction, rad)
      .normalize();

    const thornStart = agent.position
      .clone()
      .add(dir.clone().multiplyScalar(renderThickness));
    const thornEnd = thornStart
      .clone()
      .add(dir.clone().multiplyScalar(1.5 + Math.random() * 1.8));
    engine.addLineSegment(
      thornStart,
      thornEnd,
      genome,
      cappedAppThickness * 0.55,
      true,
      agent.id,
    );
  } else if (genome.appendage === "leaves" || genome.appendage === "ferns") {
    const baseInterval = genome.phyllotaxisMode === "whorled" ? 14 : 6;
    const nodeInterval = Math.max(
      2,
      Math.round((baseInterval * Math.max(1.0, engine.leafScale)) / Math.max(0.2, engine.leafDensity)),
    );
    if (agent.age % nodeInterval === 0 && Math.random() < engine.leafProbability) {
      const up = new THREE.Vector3(0, 1, 0);
      let normal = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
      if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);

      const nodeIdx = Math.floor(agent.age / nodeInterval);
      const spawnLeaf = (dir: THREE.Vector3) => {
        const tiltedDir = new THREE.Vector3()
          .addScaledVector(dir, 0.75)
          .addScaledVector(agent.direction, 0.25)
          .normalize();
        const leafStart = agent.position
          .clone()
          .add(tiltedDir.clone().multiplyScalar(renderThickness));
        const leafEnd = leafStart
          .clone()
          .add(tiltedDir.clone().multiplyScalar(cappedAppThickness));
        engine.addLineSegment(
          leafStart,
          leafEnd,
          genome,
          cappedAppThickness * 0.95,
          true,
          agent.id,
        );
      };

      if (genome.phyllotaxisMode === "spiral") {
        const divAngle = THREE.MathUtils.degToRad(engine.phyllotaxisAngle);
        const theta = nodeIdx * divAngle;
        const leafDir = normal.clone().applyAxisAngle(agent.direction, theta).normalize();
        spawnLeaf(leafDir);
      } else if (genome.phyllotaxisMode === "decussate") {
        const theta = nodeIdx * (Math.PI / 2);
        spawnLeaf(normal.clone().applyAxisAngle(agent.direction, theta).normalize());
        spawnLeaf(normal.clone().applyAxisAngle(agent.direction, theta + Math.PI).normalize());
      } else {
        const numLeaves = 4;
        for (let i = 0; i < numLeaves; i++) {
          const theta = (i * 2 * Math.PI) / numLeaves;
          spawnLeaf(normal.clone().applyAxisAngle(agent.direction, theta).normalize());
        }
      }
    }
  } else {
    const appInterval = Math.max(2, Math.floor(4 / (engine.ornamentFrequency || 1.0)));
    if (agent.age % appInterval === 0 && depth >= 1) {
      const up = new THREE.Vector3(0, 1, 0);
      let normal = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
      if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);

      const theta = (agent.age * 137.5 * Math.PI) / 180;
      const radDir = normal.clone().applyAxisAngle(agent.direction, theta).normalize();
      const appStart = agent.position.clone().add(radDir.clone().multiplyScalar(renderThickness));
      const appEnd = appStart.clone().add(radDir.clone().multiplyScalar(cappedAppThickness));
      engine.addLineSegment(
        appStart,
        appEnd,
        genome,
        cappedAppThickness * 0.9,
        true,
        agent.id,
      );
    }
  }
}
