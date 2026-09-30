import { getEvolutionStepConfig } from "./EvolutionPresets";
import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { sustainTreeGrowth } from "./SimulationTreeGrowth";
import { areStrainsCompatibleForMating, getSeekRadius, getSeekRamp, isOrganismDesperate, isSpeciesOnCooldown } from "./SimulationSeekRamp";
import { handleBreedingAndFeelers } from "./SimulationBreeding";
import { endFeeler, getFeelerStepSize, updateFeelerSeeking } from "./SimulationFeelers";
import { checkLifespanDeath, enforceCreatureCap } from "./SimulationCulling";
import { reflectAtBoundary } from "./SimulationBoundary";
import { isStrainDying as isStrainDyingPhase } from "./SimulationEngineHelpers";
import { isOrganismMature, isOverSizeBudget } from "./SimulationPartnerSearch";
import { trackBushBranchStep, stepBushTendrilBranching, canBushTipTaper } from "./SimulationBushTendrils";
import { applyBotanicalConceptSteering, getBotanicalStepSize, executeBotanicalBranching, spawnAgentAppendages, resolveAgentHabit } from "./SimulationBotany";
import { isTreeModelAgent, ensureTreeAgentInit, getTreeRenderScale, getTreeStepSize, stepTreeArchitecture, endTreeTipAtBoundary, tickTreeRest } from "./SimulationTreeArchitecture";
import { getBushMorphScale, isBigBranchingMode, isFiligreeMode } from "./SimulationMorphology";

/** Partners closer than this (6 units) are exempt from inter-species repulsion so they can touch. */
const SEEK_CONTACT_RANGE_SQ = 36;
/** Max per-step lean toward a partner. */
const SEEK_LERP_MAX = 0.1;

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

export function extrudeRootNubCap(
  engine: SimulationEngine,
  agent: Agent,
  genome: any,
  baseThickness: number,
) {
  if (agent.isFeeler) return;
  const nubThick = Math.max(0.18, baseThickness);
  const dir = agent.direction.clone().normalize();
  if (dir.lengthSq() < 0.001) dir.set(0, 1, 0);
  const backLen = Math.max(1.1, nubThick * 1.65);
  const backTip = agent.lastPosition.clone().addScaledVector(dir, -backLen);
  const g = agent.realGenome || genome;
  engine.addLineSegment(agent.lastPosition, backTip, g, nubThick, false, agent.id, 3.0);
}

export function processAgents(
  engine: SimulationEngine,
  activeAgents: Agent[],
  newAgents: Agent[],
  bredThisFrame: Set<Agent>,
) {
  (engine as any)._frameSeekerTwigCounts = new Map<string, number>();
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

  // Cap maximum species by culling a victim when capacity exceeded (see SimulationCulling.ts)
  enforceCreatureCap(engine, activeAgents, nonTaperingStrains);
  (engine as any)._frameSeekerTwigCounts = new Map<string, number>();

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
    if (agent.isFeeler) baseSpeedMult = 1.6;
    else if (agent.genome.archetype === "snake") baseSpeedMult = engine.snakeSpeed;
    else if (agent.genome.archetype === "bush") baseSpeedMult = engine.bushSpeed;
    else if (agent.genome.archetype === "tree" || agent.genome.archetype === "rhizome") baseSpeedMult = engine.treeSpeed ?? 0.65;

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
      if (!isDying && !agent.isFeeler && !agent.tapering && isOverSizeBudget(engine, genome.name)) {
        const activeSeekers = activeAgents.filter(
          (a) => a.active && !a.tapering && a.isSeekerTwig && a.genome.name === genome.name,
        ).length;
        const activeTipCount =
          activeAgents.filter((a) => a.active && !a.tapering && !a.isFeeler && a.genome.name === genome.name).length +
          newAgents.filter((a) => a.active && !a.tapering && !a.isFeeler && a.genome.name === genome.name).length;
        const isKeeper = activeTipCount <= 3;
        if (genome.archetype === "bush") {
          if (isKeeper) {
            agent.isSeekerTwig = true;
            if (((agent as any).branchSteps || 0) >= 32) {
              (agent as any).branchSteps = 0;
              (agent as any).branchDist = 0;
              (agent as any).distSinceLastFork = 0;
              agent.branchDepth = Math.max(1, Math.min(3, agent.branchDepth || 2));
              agent.thickness = Math.max(0.07, (genome.minThickness || 0.06) * 1.4);
            }
          } else if (agent.isSeekerTwig) {
            if (((agent as any).branchSteps || 0) >= 36 || agent.age > 54) {
              agent.tapering = true;
              agent.taperBudget = 0;
            }
          } else if (activeSeekers < 3 && (agent.branchDepth || 0) >= 1) {
            agent.isSeekerTwig = true;
            agent.seekerFlushes = (agent.seekerFlushes || 0) + 1;
            (agent as any).branchSteps = 0;
            agent.thickness = Math.min(agent.thickness, Math.max(0.06, (genome.minThickness || 0.05) * 1.35));
          } else if (!isKeeper && (canBushTipTaper(agent) || activeSeekers >= 3)) {
            agent.tapering = true;
            agent.taperBudget = 0;
          }
        } else {
          const isRhizomeTwig = genome.archetype === "rhizome" || habit === "rhizome_web";
          const minSeekerT = isRhizomeTwig ? Math.max(0.12, (genome.minThickness || 0.12) * 1.15) : Math.max(0.05, (genome.minThickness || 0.05) * 1.3);
          if (agent.isSeekerTwig) {
            if ((agent.treeLen || 0) >= (agent.treeBudget || 12)) {
              if (isKeeper) {
                agent.treeLen = 0;
                agent.treeBudget = 10 + Math.random() * 8;
                agent.thickness = Math.max(minSeekerT, agent.thickness * 0.92);
              } else {
                agent.tapering = true;
                agent.taperBudget = 0;
              }
            }
          } else if (activeSeekers >= 3 && !isKeeper) {
            agent.tapering = true;
            agent.taperBudget = 0;
          } else {
            agent.seekerFlushes = (agent.seekerFlushes || 0) + 1;
            agent.isSeekerTwig = true;
            agent.treeLen = 0;
            agent.treeBudget = Math.max(agent.treeBudget || 12, 12);
            agent.thickness = isRhizomeTwig ? Math.max(minSeekerT, Math.min(agent.thickness, minSeekerT * 1.25)) : Math.max(minSeekerT, Math.min(agent.thickness, minSeekerT * 1.3));
          }
        }
      }

      let effectiveBifurcationRate = genome.bifurcationRate;
      let effectiveWanderIntensity = genome.wanderIntensity;
      let effectiveStepSize = genome.stepSize;

      if (genome.archetype === "bush") {
        effectiveBifurcationRate *= 7.5 * (engine.bushBranching ?? 1.0);
        effectiveWanderIntensity *= 0.65;
      } else if (habit === "willow") {
        effectiveBifurcationRate *= 7.5;
        effectiveStepSize *= 0.65;
        effectiveWanderIntensity *= 0.65;
      } else if (genome.archetype === "tree" || habit === "oak" || habit === "elm" || habit === "pine") {
        // Compared against agent.age (growth steps), so no timeScale factor
        const trunkDurationTicks =
          habit === "oak" ? 12 : habit === "elm" ? 16 : (engine.treeBranchDelay ?? 15);
        if (!agent.isCanopy && (agent.branchDepth || 0) === 0 && agent.age < trunkDurationTicks) {
          effectiveBifurcationRate *= (habit === "pine" ? 0.6 : 0.04) * (engine.treeBranching ?? 1.0);
          effectiveStepSize *= (engine.treeStepSize ?? 0.75) * 1.15;
          effectiveWanderIntensity *= habit === "oak" ? 0.18 : 0.25;
        } else {
          agent.isCanopy = true;
          const canopyAge = Math.max(10, agent.age - trunkDurationTicks);
          const canopyProgress = Math.min(1.0, canopyAge / 220);
          const branchRamp = isBigBranchingMode(genome)
            ? 1.2 + canopyProgress * 1.5
            : isFiligreeMode(genome)
              ? 6.0 + canopyProgress * 8.0
              : 3.0 + canopyProgress * 4.5;
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
      // Soft size budget: an organism over its live-segment budget stops spawning new tips
      if (isOverSizeBudget(engine, genome.name)) effectiveBifurcationRate = 0;

      // Botanical step-size scaling per branch order
      if (genome.archetype === "bush") {
        const bushStepScale = engine.bushStepSize ?? 0.75;
        const morphStep = genome.stepSize * Math.pow(getBushMorphScale(genome), 0.35);
        effectiveStepSize = Math.max(
          0.20,
          morphStep * bushStepScale * Math.pow(0.86, Math.min(4, agent.branchDepth || 0)),
        );
      } else {
        effectiveStepSize = getBotanicalStepSize(engine, agent, effectiveStepSize);
      }
      const treeModel = isTreeModelAgent(agent);
      if (treeModel) {
        ensureTreeAgentInit(engine, agent);
        effectiveStepSize = getTreeStepSize(engine, agent);
        if (isFiligreeMode(genome)) effectiveStepSize = Math.min(effectiveStepSize, 0.42);
      }
      if (agent.isFeeler) {
        // Scaled from the parent's botanical step at spawn (was a fixed 1.3)
        effectiveStepSize = getFeelerStepSize(agent);
      } else {
        agent.lastStepSize = effectiveStepSize;
      }

      agent.age++;
      if (!agent.isFeeler) {
        const lc = engine.speciesLifecycleMap.get(agent.genome.name);
        if (lc && agent.age > (lc.maxAgeSteps ?? 0)) lc.maxAgeSteps = agent.age;
      }

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
        !agent.tapering &&
        !isSpeciesOnCooldown(engine, myStrain, evalGenome) &&
        agent.cooldown <= 0 &&
        seekRamp > 0 &&
        myMCount < maxM &&
        isOrganismMature(engine, evalGenome) &&
        (!treeModel || (agent.branchDepth || 0) >= 1 || agent.isSeekerTwig);
      const desperate = canSeek && isOrganismDesperate(engine, evalGenome, agent.age);
      const seekRadius = getSeekRadius(engine, desperate);

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
            const otherMCount =
              (engine as any).speciesLifecycleMap?.get(otherStrain)?.matingCount ||
              other.matingCount ||
              0;
            // Only fertile partners attract (plan 3.1)
            const otherReceptive =
              !other.tapering &&
              areStrainsCompatibleForMating(
                engine,
                myStrain,
                evalGenome,
                otherStrain,
                otherEvalGenome,
              ) &&
              otherMCount < maxM &&
              other.cooldown <= 0 &&
              !isSpeciesOnCooldown(engine, otherStrain, otherEvalGenome) &&
              isOrganismMature(engine, otherEvalGenome);

            if (otherReceptive && dSq < nearestDistSq) {
              nearestDistSq = dSq;
              nearestTarget = other;
              nearestTargetPos = other.position.clone();
            }
            // Keep spacing while seeking: only a receptive partner inside contact range is exempt
            // (any receptive partner when desperate, or far-spawned founders never meet)
            if (dSq < 1600 && !(otherReceptive && (desperate || dSq < SEEK_CONTACT_RANGE_SQ || treeModel))) {
              avoidanceForce.add(
                new THREE.Vector3().subVectors(agent.position, other.position).normalize(),
              );
              avoidanceCount++;
            }
          } else if (dSq < 1600 && !treeModel) {
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
          .multiplyScalar((engine.magnetism || 0.08) * (treeModel ? 0.35 : 1)); // dropped the extra 0.65 damping
        agent.direction.add(avoidanceForce).normalize();
      }

      if (genome.stability > 0) genome.stability -= 0.003;

      if (agent.isFeeler) {
        updateFeelerSeeking(agent, engine);
        // Ended feelers must not move or draw one more segment this iteration
        if (!agent.active) break;
        if (agent.feelerStepOverride !== undefined) {
          effectiveStepSize = Math.min(effectiveStepSize, agent.feelerStepOverride);
        }
      } else {
        // Apply authentic botanical steering (Gnarled Oak, Elm vase, Pine whorls, Willow droop, Rhizome web)
        applyBotanicalConceptSteering(
          engine,
          agent,
          activeAgents,
          effectiveWanderIntensity,
        );

        const depth = agent.branchDepth || 0;
        const skipCurvature = treeModel && depth <= 1;
        if (!skipCurvature && genome.movementType === "spiral") {
          if (!agent.spiralAxis) {
            agent.spiralAxis = agent.direction.clone().normalize();
          } else {
            agent.spiralAxis.lerp(agent.direction, 0.12).normalize();
          }
          agent.direction.applyAxisAngle(agent.spiralAxis, 0.09);
        } else if (!skipCurvature && genome.movementType === "orthogonal") {
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
          const jitterScale = treeModel ? (isBigBranchingMode(genome) ? 0.04 : 0.09) : 0.35;
          agent.direction
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * effectiveWanderIntensity * jitterScale,
                (Math.random() - 0.5) * effectiveWanderIntensity * jitterScale,
                (Math.random() - 0.5) * effectiveWanderIntensity * jitterScale,
              ),
            )
            .normalize();
        }

        // CRITICAL FIX (Bug A): Do NOT override structural branch vectors with 0.75 seekStrength!
        // Only outer canopy/rhizome tips (depth >= 2) apply a subtle phototropic/chemotropic lean (<= 0.022),
        // preserving 100% of the organism's true botanical silhouette in Simulation Mode!
        // Bounded seeking (plan 3.1): outer tips only, within 0.4 x world radius, lerp <= 0.1
        const dist = Math.sqrt(nearestDistSq);
        if (canSeek && nearestTargetPos && nearestTarget && seekRamp > 0 &&
          ((agent.branchDepth || 0) >= (desperate ? 1 : 2) || agent.isSeekerTwig) && dist < seekRadius) {
          const evo = getEvolutionStepConfig((engine as any).evolutionStep);
          const toTarget = new THREE.Vector3()
            .subVectors(nearestTargetPos, agent.position)
            .normalize();
          const twigBoost = agent.isSeekerTwig ? 1.5 : 1.0;
          agent.direction.lerp(toTarget, Math.min(SEEK_LERP_MAX, evo.seekLean * twigBoost) * seekRamp).normalize();
        }
      }

      agent.position.addScaledVector(agent.direction, effectiveStepSize);
      if (genome.archetype === "bush") trackBushBranchStep(agent, effectiveStepSize);
      if (agent.isFeeler) agent.feelerTravel = (agent.feelerTravel ?? 0) + effectiveStepSize;
      if (engine.sound) {
        engine.sound.onAgentStep(agent, engine.camera);
      }

      const bounced = reflectAtBoundary(engine, agent);

      if (bounced) {
        agent.direction.normalize();
        if (engine.sound) {
          engine.sound.onAgentBounce(agent.position, engine.camera);
        }
        // Feelers stop at boundary instead of bouncing
        if (agent.isFeeler) {
          endFeeler(engine, agent, "boundary", { dissolve: true });
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
          agent.taperBudget = (agent.taperBudget || 0) + 1;
          const taperDecay = Math.max(0.62, 0.78 - (agent.taperBudget || 0) * 0.03);
          agent.thickness *= taperDecay;
          const maxTaperSteps = isBigBranchingMode(genome) ? 3 : treeModel ? 5 : 14;
          const minTaperThick = isBigBranchingMode(genome) ? 0.14 : 0.035;
          if (agent.thickness <= minTaperThick || agent.taperBudget >= maxTaperSteps) {
            extrudePointedTerminalCap(engine, agent, genome, agent.thickness);
            agent.active = false;
            currentActiveCount--;
            const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
            strainCounts.set(agent.genome.name, Math.max(0, newCount));
            // Gate on lifecycle phase too: the strain may already have left dyingStrains
            if (isStrainDyingPhase(engine, genome.name)) {
              engine.markStrainSegmentsDying(genome.name);
            }
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
                : Math.max(0.06, genome.thicknessBase * 0.045);
            if (agent.thickness < floorThickness) {
              agent.thickness = floorThickness;
            }
            if (branchDepth >= (engine.maxBranchDepth ?? 5) && agent.age > 75) {
              agent.branchDepth = Math.max(1, (engine.maxBranchDepth ?? 5) - 2);
              (agent as any).branchSteps = 0;
              (agent as any).branchDist = 0;
              (agent as any).distSinceLastFork = 0;
            }
          } else if (arch !== "snake") {
            const maxDepth = Math.max(5, engine.maxBranchDepth ?? 5);
            const branchAgeLimit =
              (branchDepth === 0 ? 280 : Math.max(55, 175 - branchDepth * 26)) /
              Math.max(0.25, archTaper);
            const termChance =
              (engine.terminationProb || 0.05) * 0.014 * (1.0 + branchDepth * 0.5) * archTaper;
            const minTwigThreshold = 0.055;
            const canTaper = canBushTipTaper(agent);
            if (
              canTaper &&
              (branchDepth >= maxDepth ||
              agent.age > branchAgeLimit ||
              Math.random() < termChance ||
              (branchDepth > 0 && agent.thickness <= minTwigThreshold))
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
        genome.archetype === "bush"
          ? Math.min(agent.thickness, genome.thicknessBase * 1.15 * Math.max(1, getBushMorphScale(genome) * 0.65))
          : Math.max(engine.maxLineWidth, genome.thicknessBase * (genome.trunkGirthMod ?? 1.5) * 1.2),
      );
      const isRootTrunk = !agent.isFeeler && !agent.parentId && (agent.branchDepth || 0) === 0;
      const ageScale = treeModel
        ? getTreeRenderScale(agent)
        : agent.isFeeler
          ? 1.0
          : isRootTrunk
            ? (agent.age >= 12 ? 1.0 : 1.08 - 0.08 * ((agent.age - 1) / 11))
            : agent.age >= 25
              ? 1.0
              : 0.72 + 0.28 * (agent.age / 25);
      const renderThickness = Math.max(0.001, agent.thickness * ageScale);

      if (isRootTrunk && agent.age === 1) {
        extrudeRootNubCap(engine, agent, genome, renderThickness);
      }

      if (agent.id !== undefined) {
        if (!agent.rootOrigin) agent.rootOrigin = (agent.treeRoot || agent.lastPosition || agent.position).clone();
        if (!agent.branchBasePos) agent.branchBasePos = agent.rootOrigin.clone();
        engine.agentAnchorMap.set(agent.id, {
          rootOrigin: agent.rootOrigin,
          branchBasePos: agent.branchBasePos,
          branchDepth: agent.branchDepth || 0,
        });
      }

      // All feelers draw visible trail segments (tagged with _isFeeler + parentStrainName)
      engine.addLineSegment(
        agent.lastPosition,
        agent.position,
        genome,
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
        if (genome.archetype === "bush") {
          const activeBushTips = strainCounts.get(genome.name) || 1;
          if (!isOverSizeBudget(engine, genome.name) || activeBushTips <= 4) {
            stepBushTendrilBranching(
              engine,
              agent,
              activeAgents,
              newAgents,
              strainCounts,
              isUnderMinCreatures,
            );
          }
        } else {
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

  // Feelers deactivated by any other path (pruning, fade cascade, …) still get a [FEELER_END] line
  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.isFeeler && !a.active && !a.feelerEnded) {
      endFeeler(engine, a, isStrainDyingPhase(engine, a.realGenome?.name) ? "parentDying" : "targetLost", {
        dissolve: true,
        detail: "external",
      });
    }
  }

  sustainTreeGrowth(engine, activeAgents, newAgents);
  engine.agents = activeAgents.filter((a) => a.active);
}
