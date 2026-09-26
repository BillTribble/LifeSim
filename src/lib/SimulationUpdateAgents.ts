import { getEvolutionStepConfig } from "./EvolutionPresets";
import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { sustainTreeGrowth } from "./SimulationTreeGrowth";
import { getHybridCooldownTicks, getSeekRamp } from "./SimulationSeekRamp";
import {
  canEnterDeleting,
  updateFeelerSeeking,
  handleBreedingAndFeelers,
} from "./SimulationBreeding";
import {
  applyBotanicalConceptSteering,
  getBotanicalStepSize,
  executeBotanicalBranching,
  spawnAgentAppendages,
  resolveAgentHabit,
} from "./SimulationBotany";
import {
  isTreeModelAgent,
  ensureTreeAgentInit,
  getTreeRenderScale,
  getTreeStepSize,
  stepTreeArchitecture,
  endTreeTipAtBoundary,
  tickTreeRest,
} from "./SimulationTreeArchitecture";

export function extrudePointedTerminalCap(
  engine: SimulationEngine,
  agent: Agent,
  genome: any,
  startThickness: number,
) {
  if (agent.isFeeler) return;
  const currThickness = Math.max(0.04, startThickness);
  const dir = agent.direction.clone().normalize();
  if (dir.lengthSq() < 0.001) dir.set(0, 1, 0);

  const tipLength = Math.max(0.25, currThickness * 1.4);
  const tipPos = agent.position.clone().addScaledVector(dir, tipLength);

  engine.addLineSegment(
    agent.position,
    tipPos,
    agent.realGenome || genome,
    Math.max(0.001, currThickness),
    false,
    agent.id,
    true,
  );
}

/** Kills the agent's species once it has bred out or exceeded its max lifespan. */
function checkLifespanDeath(
  engine: SimulationEngine,
  agent: Agent,
  activeAgents: Agent[],
  livingOrganismCount: number,
  maxM: number,
) {
  const minMatingLifespan = (maxM + 1) * getHybridCooldownTicks(engine) * 1.2;
  const maxLifespan = Math.max(minMatingLifespan, 1200 * Math.max(0.5, engine.timeScale));
  const lifecycle = (engine as any).speciesLifecycleMap?.get(agent.genome.name);
  const speciesMCount = lifecycle?.matingCount || agent.matingCount || 0;
  const hasSpeciesBred = !!(agent.hasBred || lifecycle?.hasBred);
  const shouldDieFromMating = hasSpeciesBred && speciesMCount >= maxM;
  const shouldDieFromAge = agent.age > maxLifespan;
  const canSafelyDeleteSpecies = livingOrganismCount - 1 >= engine.minCreatures;

  if (!agent.tapering && (shouldDieFromMating || shouldDieFromAge)) {
    if (canSafelyDeleteSpecies && canEnterDeleting(engine, activeAgents, 1)) {
      const reason = shouldDieFromMating ? `bred ${maxM} times` : "reached max lifespan";
      engine.killSpecies(agent.genome.name, reason);
    }
  }
}

export function processAgents(
  engine: SimulationEngine,
  activeAgents: Agent[],
  newAgents: Agent[],
  bredThisFrame: Set<Agent>,
) {
  const strainCounts = new Map<string, number>();
  const nonTaperingStrains = new Set<string>();
  let currentActiveCount = 0;

  for (const a of activeAgents) {
    if (a.active) {
      strainCounts.set(a.genome.name, (strainCounts.get(a.genome.name) || 0) + 1);
      currentActiveCount++;
      if (!a.tapering && !a.isFeeler) {
        nonTaperingStrains.add(a.genome.name);
      }
    }
  }

  const livingOrganisms = engine.getLivingOrganisms();
  const livingOrganismCount = livingOrganisms.size;
  if (livingOrganismCount >= engine.minCreatures) {
    engine.hasReachedMinCreatures = true;
  }

  // Emergency extinction recovery
  if (!engine.designerMode) {
    if (
      livingOrganismCount === 0 &&
      activeAgents.filter((a) => a.active).length === 0 &&
      engine.agents.length > 0
    ) {
      engine.onLog("🌱 Ecosystem extinct — spawning emergency founder species.");
      engine.spawnNewSpecies();
      engine.spawnNewSpecies();
    }
  }

  // Cap maximum species by tapering the oldest variant when capacity exceeded
  if (!engine.designerMode && nonTaperingStrains.size > engine.maxCreatures) {
    let guard = 0;
    while (
      nonTaperingStrains.size > engine.maxCreatures &&
      canEnterDeleting(engine, activeAgents, 1) &&
      guard++ < 16
    ) {
      let bredVictim: string | null = null;
      let bredAge = -Infinity;
      let anyVictim: string | null = null;
      let anyAge = -Infinity;

      for (const a of activeAgents) {
        if (!a.active || a.tapering || a.isFeeler) continue;
        if (engine.dyingStrains && engine.dyingStrains.has(a.genome.name)) continue;
        if (!nonTaperingStrains.has(a.genome.name)) continue;
        const age = engine.time - (a.genome.createdAt || 0);
        if (a.hasBred && age > bredAge) {
          bredAge = age;
          bredVictim = a.genome.name;
        }
        if (age > anyAge) {
          anyAge = age;
          anyVictim = a.genome.name;
        }
      }

      const victim = bredVictim ?? anyVictim;
      if (!victim) break;
      if (engine.getLivingOrganismCount() - 1 < engine.minCreatures) break;

      engine.killSpecies(victim, "maximum species capacity reached");
      nonTaperingStrains.delete(victim);
    }
  }

  for (let i = 0; i < activeAgents.length; i++) {
    const agent = activeAgents[i];

    const isDying =
      agent.tapering ||
      agent.forceTapering ||
      !agent.active ||
      (engine.dyingStrains && engine.dyingStrains.has(agent.genome.name));
    agent.suppressionFade = agent.suppressionFade || 0;
    const isSuppressed =
      engine.suppressedStrains && engine.suppressedStrains.has(agent.genome.name);
    if (isSuppressed) {
      agent.suppressionFade = Math.min(1.0, agent.suppressionFade + 0.02);
    } else {
      agent.suppressionFade = Math.max(0.0, agent.suppressionFade - 0.02);
    }

    let baseSpeedMult = 1.0;
    if (agent.genome.archetype === "snake") baseSpeedMult = engine.snakeSpeed;
    else if (agent.genome.archetype === "bush") baseSpeedMult = engine.bushSpeed;
    else if (agent.genome.archetype === "tree") baseSpeedMult = engine.treeSpeed;
    else if (agent.genome.archetype === "rhizome") baseSpeedMult = engine.rhizomeSpeed;

    agent.growthBoost = agent.growthBoost || 1.0;
    if (agent.growthBoost > 1.0) {
      agent.growthBoost = Math.max(1.0, agent.growthBoost - 0.03 * engine.timeScale);
    }
    if (agent.cooldown > 0) {
      agent.cooldown = Math.max(0, agent.cooldown - engine.timeScale);
    }

    let widthSpeedMult = 1.0;
    if (engine.widthGrowthEffect) {
      const refThickness = Math.max(0.1, agent.thickness);
      widthSpeedMult = Math.pow(1.0 / refThickness, engine.widthGrowthEffect);
      widthSpeedMult = Math.max(0.1, Math.min(5.0, widthSpeedMult));
    }

    const branchCountForBoost = strainCounts.get(agent.genome.name) || 1;
    const branchGrowthMultiplier =
      1.0 +
      Math.min(
        5.0,
        Math.max(0, branchCountForBoost - 1) * 0.05 * (engine.branchGrowthBoost || 1.0),
      );

    const speedMult =
      baseSpeedMult *
      (1.0 - agent.suppressionFade * 0.8) *
      agent.growthBoost *
      widthSpeedMult *
      branchGrowthMultiplier;

    agent.growthAccumulator =
      (agent.growthAccumulator || 0) + engine.growthSpeed * speedMult * engine.timeScale;
    let iterations: number;
    if (isDying) {
      if (agent.taperBudget === undefined) {
        const arch = agent.genome.archetype || "bush";
        agent.taperBudget = 0;
        engine.onLog(
          `🌿 ${agent.genome.name} [${arch.toUpperCase()}] tapering out (thickness: ${agent.thickness.toFixed(2)})`,
        );
      }
      iterations = agent.thickness > 0.001 ? Math.floor(agent.growthAccumulator) : 0;
    } else {
      iterations = Math.floor(agent.growthAccumulator);
    }
    agent.growthAccumulator -= Math.floor(agent.growthAccumulator);

    for (let iter = 0; iter < iterations; iter++) {
      if (!agent.active) break;
      if (agent.treeDormant) {
        // Finished tree: a single non-growing keeper keeps the organism alive for breeding + lifespan
        if (agent.tapering) {
          agent.active = false;
          strainCounts.set(agent.genome.name, Math.max(0, (strainCounts.get(agent.genome.name) || 1) - 1));
          break;
        }
        agent.age++;
        if (!engine.designerMode) {
          handleBreedingAndFeelers(agent, i, activeAgents, newAgents, bredThisFrame, engine, nonTaperingStrains);
          const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
          checkLifespanDeath(engine, agent, activeAgents, livingOrganismCount, maxM);
        }
        // Resting tree: after its pause it wakes and keeps growing on the next iteration
        if (agent.active) tickTreeRest(engine, agent);
        continue;
      }
      const { genome } = agent;
      const habit = resolveAgentHabit(engine, genome);

      let effectiveBifurcationRate = genome.bifurcationRate;
      let effectiveWanderIntensity = genome.wanderIntensity;
      let effectiveStepSize = genome.stepSize;

      if (genome.archetype === "bush" || habit === "willow") {
        effectiveBifurcationRate *= 7.5 * (engine.bushBranching ?? 1.0);
        effectiveStepSize *= engine.bushStepSize ?? 0.65;
        effectiveWanderIntensity *= 0.65;
      } else if (genome.archetype === "tree" || habit === "oak" || habit === "elm" || habit === "pine") {
        const trunkDurationTicks =
          (habit === "oak" ? 12 : habit === "elm" ? 16 : (engine.treeBranchDelay ?? 15)) *
          Math.max(0.5, engine.timeScale);
        if (!agent.isCanopy && (agent.branchDepth || 0) === 0 && agent.age < trunkDurationTicks) {
          effectiveBifurcationRate *= (habit === "pine" ? 0.6 : 0.04) * (engine.treeBranching ?? 1.0);
          effectiveStepSize *= (engine.treeStepSize ?? 0.75) * 1.15;
          effectiveWanderIntensity *= habit === "oak" ? 0.18 : 0.25;
        } else {
          agent.isCanopy = true;
          const canopyAge = Math.max(10, agent.age - trunkDurationTicks);
          const canopyProgress = Math.min(1.0, canopyAge / 220);
          const branchRamp = 28.0 + canopyProgress * 42.0;
          effectiveBifurcationRate *= branchRamp * (engine.treeBranching ?? 1.0);
          effectiveStepSize *= engine.treeStepSize ?? 0.75;
          effectiveWanderIntensity *= habit === "oak" ? 0.55 : 0.45;
        }
      } else if (genome.archetype === "rhizome" || habit === "rhizome_web") {
        effectiveBifurcationRate *= 8.5 * (engine.rhizomeBranching ?? 1.0);
        effectiveStepSize *= (engine.rhizomeStepSize ?? 0.85) * 0.82;
        effectiveWanderIntensity *= 0.85;
      }

      const thickRatio = agent.thickness / Math.max(0.5, genome.thicknessBase);
      const widthBoost = 1.0 + (thickRatio - 1.0) * engine.widthVariance * 2.5;
      effectiveBifurcationRate *= Math.max(0.8, widthBoost);

      // Botanical step-size scaling per branch order
      effectiveStepSize = getBotanicalStepSize(engine, agent, effectiveStepSize);
      const treeModel = isTreeModelAgent(agent);
      if (treeModel) {
        ensureTreeAgentInit(engine, agent);
        effectiveStepSize = getTreeStepSize(engine, agent);
      }
      if (agent.isFeeler) {
        effectiveStepSize = genome.stepSize;
      }

      agent.age++;

      let nearestDistSq = Infinity;
      let nearestTarget: Agent | null = null;
      let nearestTargetPos: THREE.Vector3 | null = null;
      const avoidanceForce = new THREE.Vector3();
      let avoidanceCount = 0;

      const myStrain = agent.realGenome?.name || agent.genome.name;
      const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
      const myMCount =
        (engine as any).speciesLifecycleMap?.get(myStrain)?.matingCount ||
        agent.matingCount ||
        0;
      const evalGenome =
        agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome;
      const strainAge =
        evalGenome.createdAt !== undefined ? engine.time - evalGenome.createdAt : engine.time;
      const seekRamp = getSeekRamp(engine, agent, strainAge);
      const canSeek =
        !agent.isFeeler &&
        !treeModel && // tree form comes from its own architecture, not from leaning toward mates
        !agent.tapering &&
        seekRamp > 0 &&
        myMCount < maxM;

      for (let j = 0; j < activeAgents.length; j++) {
        const other = activeAgents[j];
        if (other === agent || other.isFeeler) continue;

        const otherStrain = other.realGenome?.name || other.genome.name;
        const isDifferentSpecies = otherStrain !== myStrain;
        const dSq = agent.position.distanceToSquared(other.position);

        if (isDifferentSpecies) {
          if (canSeek) {
            const otherEvalGenome =
              other.isFeeler && other.realGenome ? other.realGenome : other.genome;
            const otherStrainAge =
              otherEvalGenome.createdAt !== undefined
                ? engine.time - otherEvalGenome.createdAt
                : engine.time;
            const otherMCount =
              (engine as any).speciesLifecycleMap?.get(otherStrain)?.matingCount ||
              other.matingCount ||
              0;
            const otherSeekRamp = getSeekRamp(engine, other, otherStrainAge);
            const otherReceptive =
              !other.tapering &&
              otherSeekRamp > 0 &&
              otherMCount < maxM;

            if (otherReceptive && dSq < nearestDistSq) {
              nearestDistSq = dSq;
              nearestTarget = other;
              nearestTargetPos = other.position.clone();
            }
          } else if (dSq < 1600) {
            avoidanceForce.add(
              new THREE.Vector3().subVectors(agent.position, other.position).normalize(),
            );
            avoidanceCount++;
          }
        } else if (dSq < 900 && other.parentId !== agent.id && agent.parentId !== other.id) {
          avoidanceForce.add(
            new THREE.Vector3().subVectors(agent.position, other.position).normalize(),
          );
          avoidanceCount++;
        }
      }

      if (avoidanceCount > 0) {
        avoidanceForce
          .divideScalar(avoidanceCount)
          .multiplyScalar((engine.magnetism || 0.08) * 0.65 * (treeModel ? 0.35 : 1));
        agent.direction.add(avoidanceForce).normalize();
      }

      if (genome.stability > 0) genome.stability -= 0.003;

      if (agent.isFeeler) {
        updateFeelerSeeking(agent, engine);
      } else {
        // Apply authentic botanical steering (Gnarled Oak, Elm vase, Pine whorls, Willow droop, Rhizome web)
        applyBotanicalConceptSteering(
          engine,
          agent,
          activeAgents,
          effectiveWanderIntensity,
        );

        if (genome.movementType === "spiral") {
          if (!agent.spiralAxis) {
            agent.spiralAxis = agent.direction.clone().normalize();
          } else {
            agent.spiralAxis.lerp(agent.direction, 0.12).normalize();
          }
          agent.direction.applyAxisAngle(agent.spiralAxis, 0.09);
        } else if (genome.movementType === "orthogonal") {
          if (Math.random() < effectiveWanderIntensity * 0.12) {
            const up = new THREE.Vector3(
              Math.random(),
              Math.random(),
              Math.random(),
            ).normalize();
            const axis = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
            if (axis.lengthSq() > 0.001) {
              const angle = Math.PI / 3 + (Math.random() - 0.5) * 0.3;
              agent.direction.applyAxisAngle(axis, Math.random() < 0.5 ? angle : -angle);
            }
          }
        } else {
          agent.direction
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * effectiveWanderIntensity * 0.35,
                (Math.random() - 0.5) * effectiveWanderIntensity * 0.35,
                (Math.random() - 0.5) * effectiveWanderIntensity * 0.35,
              ),
            )
            .normalize();
        }

        // CRITICAL FIX (Bug A): Do NOT override structural branch vectors with 0.75 seekStrength!
        // Only outer canopy/rhizome tips (depth >= 2) apply a subtle phototropic/chemotropic lean (<= 0.022),
        // preserving 100% of the organism's true botanical silhouette in Simulation Mode!
        if (canSeek && nearestTargetPos && seekRamp > 0) {
          const evo = getEvolutionStepConfig((engine as any).evolutionStep);
          const dist = Math.sqrt(nearestDistSq);
          const toTarget = new THREE.Vector3()
            .subVectors(nearestTargetPos, agent.position)
            .normalize();
          if (evo.round <= 3) {
            // Early rounds (Step 1..3): high seekLean pulls all branches into spindly ribbons
            agent.direction.lerp(toTarget, evo.seekLean * seekRamp).normalize();
          } else if (dist < 24 && nearestTarget && !nearestTarget.isFeeler) {
            agent.direction.lerp(toTarget, 0.16 * seekRamp).normalize();
          } else if ((agent.branchDepth || 0) >= (evo.round >= 12 ? 2 : 1)) {
            agent.direction.lerp(toTarget, evo.seekLean * seekRamp).normalize();
          }
        }
      }

      agent.position.addScaledVector(agent.direction, effectiveStepSize);
      if (engine.sound) {
        engine.sound.onAgentStep(agent, engine.camera);
      }

      // Boundary reflection
      const bX = engine.boundarySize;
      const bZ = engine.boundarySize;
      const squash = engine.boundarySquash ?? 1.0;
      const bY = Math.max(5.0, engine.boundarySize * squash);
      const creatureCenterY = engine.creatureCenterY || 18.921075;
      let bounced = false;

      if (engine.boundaryShape === "sphere") {
        const dy = agent.position.y - creatureCenterY;
        const normX = agent.position.x / bX;
        const normY = dy / bY;
        const normZ = agent.position.z / bZ;
        const distSq = normX * normX + normY * normY + normZ * normZ;
        if (distSq > 1.0) {
          const scale = 1.0 / Math.sqrt(distSq);
          agent.position.x *= scale;
          agent.position.y = creatureCenterY + dy * scale;
          agent.position.z *= scale;
          const normal = new THREE.Vector3(
            agent.position.x / (bX * bX),
            (agent.position.y - creatureCenterY) / (bY * bY),
            agent.position.z / (bZ * bZ),
          ).normalize();
          const dot = agent.direction.dot(normal);
          agent.direction.sub(normal.multiplyScalar(2 * dot));
          bounced = true;
        }
      } else {
        if (agent.position.x > bX) {
          agent.position.x = bX;
          agent.direction.x *= -1;
          bounced = true;
        } else if (agent.position.x < -bX) {
          agent.position.x = -bX;
          agent.direction.x *= -1;
          bounced = true;
        }
        const minY = creatureCenterY - bY;
        const maxY = creatureCenterY + bY;
        if (agent.position.y > maxY) {
          agent.position.y = maxY;
          agent.direction.y *= -1;
          bounced = true;
        } else if (agent.position.y < minY) {
          agent.position.y = minY;
          agent.direction.y *= -1;
          bounced = true;
        }
        if (agent.position.z > bZ) {
          agent.position.z = bZ;
          agent.direction.z *= -1;
          bounced = true;
        } else if (agent.position.z < -bZ) {
          agent.position.z = -bZ;
          agent.direction.z *= -1;
          bounced = true;
        }
      }

      if (bounced) {
        agent.direction.normalize();
        if (engine.sound) {
          engine.sound.onAgentBounce(agent.position, engine.camera);
        }
        // Feelers stop at boundary instead of bouncing
        if (agent.isFeeler) {
          agent.active = false;
        }
      }

      // Progressive stem tapering along the length of the branch
      if (!agent.isFeeler) {
        const arch = genome.archetype || "bush";
        const branchDepth = agent.branchDepth || 0;

        let minBranchesForArch = 2;
        if (arch === "bush") minBranchesForArch = engine.bushMinBranches ?? 6;
        else if (arch === "rhizome") minBranchesForArch = engine.rhizomeMinBranches ?? 6;
        else if (arch === "tree") minBranchesForArch = engine.treeMinBranches ?? 4;

        // Lazy: these O(n) scans are only needed by the legacy (non tree-model) taper path
        const canTerminateBranch = () => {
          const nonTaperingBranchesOfStrain = activeAgents.filter(
            (a) => a.active && !a.tapering && !a.isFeeler && a.genome.name === genome.name,
          ).length;
          const livingNonFeelerCount = activeAgents.filter(
            (a) => a.active && !a.tapering && !a.isFeeler,
          ).length;
          return (
            nonTaperingBranchesOfStrain > minBranchesForArch &&
            livingNonFeelerCount - 1 >= engine.minCreatures
          );
        };

        if (agent.tapering) {
          // CRITICAL FIX (Bug B): Let tapering branches smoothly complete their 8-step sculptural taper
          agent.taperBudget = (agent.taperBudget || 0) + 1;
          const taperDecay = Math.max(0.68, 0.86 - agent.taperBudget * 0.03);
          agent.thickness *= taperDecay;

          if (agent.thickness <= 0.035 || agent.taperBudget >= 8) {
            extrudePointedTerminalCap(engine, agent, genome, agent.thickness);
            agent.active = false;
            currentActiveCount--;
            const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
            strainCounts.set(agent.genome.name, Math.max(0, newCount));
          }
        } else if (treeModel) {
          // Tree architecture model handles taper + termination by length budget (stepTreeArchitecture)
        } else {
          const pruneTaperMult =
            0.75 + (engine.pruningStrength !== undefined ? engine.pruningStrength : 0.8) * 0.35;
          // Ensure rhizomes taper naturally from arteries to fine capillaries (fixing Pic 2)
          const rawArchTaper =
            arch === "bush"
              ? (engine.bushTaper ?? 0.65)
              : arch === "tree"
                ? (engine.treeTaper ?? 0.65)
                : Math.max(0.55, engine.rhizomeTaper ?? 0.55);
          const archTaper = rawArchTaper * pruneTaperMult;

          const baseDecay =
            branchDepth === 0
              ? 0.992
              : branchDepth === 1
                ? 0.982
                : branchDepth === 2
                  ? 0.968
                  : 0.952;
          const archDecay = Math.max(0.91, Math.min(0.996, 1.0 - (1.0 - baseDecay) * archTaper));
          agent.thickness *= archDecay;

          if (!canTerminateBranch()) {
            const floorThickness =
              branchDepth === 0
                ? Math.max(0.18, genome.thicknessBase * 0.14)
                : Math.max(0.04, genome.thicknessBase * 0.03);
            if (agent.thickness < floorThickness) {
              agent.thickness = floorThickness;
            }
          } else if (arch !== "snake") {
            const maxDepth = Math.max(5, engine.maxBranchDepth ?? 5);
            const branchAgeLimit =
              (branchDepth === 0 ? 280 : Math.max(45, 165 - branchDepth * 26)) /
              Math.max(0.25, archTaper);
            const termChance =
              (engine.terminationProb || 0.05) * 0.018 * (1.0 + branchDepth * 0.5) * archTaper;
            const minTwigThreshold = 0.055;
            if (
              branchDepth >= maxDepth ||
              agent.age > branchAgeLimit ||
              Math.random() < termChance ||
              (branchDepth > 0 && agent.thickness <= minTwigThreshold)
            ) {
              agent.tapering = true;
              agent.taperBudget = 0;
            }
          }
        }
      }

      agent.thickness = THREE.MathUtils.clamp(
        agent.thickness,
        0.001,
        Math.max(engine.maxLineWidth, genome.thicknessBase * 1.5),
      );
      const ageScale = treeModel
        ? getTreeRenderScale(agent)
        : agent.isFeeler
          ? 1.0
          : agent.age >= 25
            ? 1.0
            : 0.55 + 0.45 * (agent.age / 25);
      const renderThickness = Math.max(0.001, agent.thickness * ageScale);

      // All feelers draw visible trail segments
      engine.addLineSegment(
        agent.lastPosition,
        agent.position,
        agent.isFeeler && agent.realGenome ? agent.realGenome : genome,
        renderThickness,
        false,
        agent.id,
      );
      spawnAgentAppendages(engine, agent, genome, renderThickness);

      agent.lastPosition.copy(agent.position);

      if (treeModel && bounced) {
        // Tree tips stop at the world boundary instead of snaking along it
        endTreeTipAtBoundary(engine, agent, newAgents);
        if (agent.tapering && agent.active) {
          agent.active = false;
          currentActiveCount--;
          strainCounts.set(genome.name, Math.max(0, (strainCounts.get(genome.name) || 1) - 1));
        }
      }

      if (treeModel) {
        stepTreeArchitecture(
          engine,
          agent,
          newAgents,
          strainCounts.get(genome.name) || 1,
          effectiveStepSize,
        );
      } else {
        const livingNonFeelerCount = activeAgents.filter(
          (a) => a.active && !a.tapering && !a.isFeeler,
        ).length;
        const isUnderMinCreatures = livingNonFeelerCount < engine.minCreatures;
        executeBotanicalBranching(
          engine,
          agent,
          activeAgents,
          newAgents,
          strainCounts,
          effectiveBifurcationRate,
          isUnderMinCreatures,
        );
      }

      if (!engine.designerMode) {
        handleBreedingAndFeelers(
          agent,
          i,
          activeAgents,
          newAgents,
          bredThisFrame,
          engine,
          nonTaperingStrains,
        );
      }

      // 4-STAGE LIFESPAN MODEL
      checkLifespanDeath(engine, agent, activeAgents, livingOrganismCount, maxM);

      const isStrainDying =
        engine.dyingStrains && engine.dyingStrains.has(agent.genome.name);
      if (isStrainDying && !agent.tapering) {
        agent.tapering = true;
        agent.forceTapering = true;
        agent.fadeAge = 0;
        agent.taperBudget = undefined;
      }

      if (agent.tapering && isStrainDying) {
        agent.fadeAge = (agent.fadeAge || 0) + 1;
        if (agent.fadeAge < 180 && !agent.isFeeler) {
          agent.thickness = Math.max(0.05, agent.thickness * 0.96);
        } else if (agent.fadeAge >= (agent.isFeeler ? 25 : 360)) {
          extrudePointedTerminalCap(engine, agent, genome, agent.thickness);
          agent.active = false;
          currentActiveCount--;
          const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
          strainCounts.set(agent.genome.name, Math.max(0, newCount));

          if ((engine as any).markStrainSegmentsDying) {
            (engine as any).markStrainSegmentsDying(agent.genome.name);
          }
          for (let j = 0; j < activeAgents.length; j++) {
            const other = activeAgents[j];
            const isDescendant =
              other.parentAgent === agent ||
              (agent.id !== undefined && other.parentId === agent.id);
            const isSameStrain = other.genome.name === agent.genome.name;
            const isFeelerOfStrain =
              other.realGenome && other.realGenome.name === agent.genome.name;
            if (other.active && (isDescendant || isSameStrain || isFeelerOfStrain)) {
              extrudePointedTerminalCap(engine, other, other.genome, other.thickness);
              other.active = false;
              other.tapering = true;
              other.forceTapering = true;
              currentActiveCount--;
            }
          }

          const lifespanSecs = (agent.age / 60.0).toFixed(1);
          engine.onLog(
            `💀 ${agent.genome.name} [${(agent.genome.archetype || "bush").toUpperCase()}] completed lifecycle after ${lifespanSecs}s`,
          );
        }
      }
    }
  }

  sustainTreeGrowth(engine, activeAgents, newAgents);
  engine.agents = activeAgents.filter((a) => a.active);
}
