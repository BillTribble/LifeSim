import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent, MAX_POINTS } from "./SimulationTypes";
import {
  canEnterDeleting,
  trySpawnTaperingFeeler,
  updateFeelerSeeking,
  handleBreedingAndFeelers,
} from "./SimulationBreeding";

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

  // Emergency extinction recovery: If all organisms have died and no agents are active, re-seed founder species
  const livingNonFeelerAgents = activeAgents.filter(a => a.active && !a.tapering && !a.isFeeler).length;
  if (livingNonFeelerAgents === 0 && activeAgents.filter(a => a.active).length === 0 && engine.agents.length > 0) {
    engine.onLog("🌱 Ecosystem extinct — spawning emergency founder species.");
    engine.spawnNewSpecies();
    engine.spawnNewSpecies();
  }

  // Cap maximum species by tapering the oldest variant when capacity exceeded
  if (canEnterDeleting(engine, activeAgents, 1) && nonTaperingStrains.size > engine.maxSpecies) {
    let oldestGenomeName: string | null = null;
    let oldestAge = -Infinity;
    for (const a of activeAgents) {
      if (a.active && !a.tapering && !a.isFeeler && a.hasBred) {
         const age = engine.time - (a.genome.createdAt || 0);
         if (age > oldestAge) {
             oldestAge = age;
             oldestGenomeName = a.genome.name;
         }
      }
    }
    
    if (oldestGenomeName) {
      engine.killSpecies(
        oldestGenomeName,
        "maximum species capacity reached",
      );
    }
  }

  let aliveSpeciesCount = 0;
  let totalBiomass = 0;
  engine.biomassMap.forEach(v => {
    if (v > 0) aliveSpeciesCount++;
    totalBiomass += v;
  });

  // Ignore aliveSpeciesCount (which includes fading dead trails) for breeding caps

  for (let i = 0; i < activeAgents.length; i++) {
    const agent = activeAgents[i];
    
    const isDying = agent.tapering || agent.forceTapering || !agent.active || (engine.dyingStrains && engine.dyingStrains.has(agent.genome.name));
    agent.suppressionFade = agent.suppressionFade || 0;
    const isSuppressed = engine.suppressedStrains && engine.suppressedStrains.has(agent.genome.name);
    if (isSuppressed) {
      agent.suppressionFade = Math.min(1.0, agent.suppressionFade + 0.02); // 50 frames to fully suppress (~0.8s real time, independent of slowmo)
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
    
    // Width-dependent growth speed modifier
    let widthSpeedMult = 1.0;
    if (engine.widthGrowthEffect) {
      const refThickness = Math.max(0.1, agent.thickness);
      widthSpeedMult = Math.pow(1.0 / refThickness, engine.widthGrowthEffect);
      widthSpeedMult = Math.max(0.1, Math.min(5.0, widthSpeedMult));
    }

    // Branching-driven growth speed boost: creatures doing lots of branching grow faster!
    const branchCountForBoost = strainCounts.get(agent.genome.name) || 1;
    const branchGrowthMultiplier = 1.0 + Math.min(5.0, Math.max(0, branchCountForBoost - 1) * 0.05 * (engine.branchGrowthBoost || 1.0));

    // Blend smoothly from normal speed to heavily nerfed (0.2x) speed
    const speedMult = baseSpeedMult * (1.0 - agent.suppressionFade * 0.8) * agent.growthBoost * widthSpeedMult * branchGrowthMultiplier;
    
    agent.growthAccumulator = (agent.growthAccumulator || 0) + engine.growthSpeed * speedMult * engine.timeScale;
    let iterations: number;
    if (isDying) {
      // Initialize taper tracking on first dying frame
      if (agent.taperBudget === undefined) {
        const arch = agent.genome.archetype || 'bush';
        agent.taperBudget = 0; // Counts segments added during taper (no fixed limit)
        engine.onLog(`🌿 ${agent.genome.name} [${arch.toUpperCase()}] tapering out (thickness: ${agent.thickness.toFixed(2)})`);
      }
      // Keep growing as long as there's still visible thickness — branches always taper to zero (0.001)
      if (agent.thickness > 0.001) {
        iterations = Math.floor(agent.growthAccumulator);
      } else {
        iterations = 0;
      }
    } else {
      iterations = Math.floor(agent.growthAccumulator);
    }
    agent.growthAccumulator -= Math.floor(agent.growthAccumulator);

    for (let iter = 0; iter < iterations; iter++) {
      if (!agent.active) break;
      if (agent.tapering) {
        trySpawnTaperingFeeler(agent, activeAgents, newAgents, engine);
        break; // Stop growing stems when in deleting phase
      }
      const { genome } = agent;
      const isHybrid = !!genome.isHybrid || genome.name.startsWith("Hybrid") || genome.name.startsWith("Kin") || genome.name.includes("-");

      let effectiveBifurcationRate = genome.bifurcationRate;
      let effectiveWanderIntensity = genome.wanderIntensity;
      let effectiveStepSize = genome.stepSize;

      if (genome.archetype === "bush") {
        // BUSH: Broad sprawling shrub canopy
        effectiveBifurcationRate *= 6.0 * (engine.bushBranching ?? 1.0);
        effectiveStepSize *= (engine.bushStepSize ?? 0.45);
        effectiveWanderIntensity *= 0.75;
      } else if (genome.archetype === "tree") {
        // Tree: Short vertical trunk -> Prolific canopy branching into fine limbs and twigs
        const trunkDurationTicks = 60 * Math.max(0.5, engine.timeScale);
        if (!agent.isCanopy && agent.age < trunkDurationTicks) {
          // Phase 1: Straight vertical trunk
          effectiveBifurcationRate *= 0.01 * (engine.treeBranching ?? 1.0);
          effectiveStepSize *= (engine.treeStepSize ?? 0.90) * 1.3;
          effectiveWanderIntensity *= 0.02; // Rigid, straight trunk
          // Pull trunk gently upward toward +Y
          agent.direction.lerp(new THREE.Vector3(0, 1, 0), 0.08).normalize();
        } else {
          // Phase 2: Canopy — prolific branching with straight, wooden limbs (no snake wobble!)
          agent.isCanopy = true;
          const canopyAge = agent.age >= trunkDurationTicks ? agent.age - trunkDurationTicks : 50;
          const canopyProgress = Math.min(1.0, canopyAge / 300);
          const branchRamp = 15.0 + canopyProgress * 25.0; // Ramps from 15x to 40x so it branches prolifically!
          effectiveBifurcationRate *= branchRamp * (engine.treeBranching ?? 1.0);
          effectiveStepSize *= (engine.treeStepSize ?? 0.90) * (0.7 - canopyProgress * 0.25); // Twigs get shorter as branches multiply
          effectiveWanderIntensity *= 0.3; // Low wander so tree branches remain straight and wooden, not wobbly!
          // Give limbs a slight upward canopy lift
          agent.direction.lerp(new THREE.Vector3(0, 0.4, 0), 0.03).normalize();
        }
      } else if (genome.archetype === "snake") {
        effectiveBifurcationRate *= 0.05 * (engine.snakeBranching ?? 1.0);
        effectiveWanderIntensity *= engine.snakeWander;
        effectiveStepSize *= engine.snakeStepSize;
      } else if (genome.archetype === "rhizome") {
        effectiveBifurcationRate *= 12.0 * (engine.rhizomeBranching ?? 1.0);
        effectiveStepSize *= (engine.rhizomeStepSize ?? 0.40);
        effectiveWanderIntensity *= 12.0;
      }

      // Width-driven branching & rotation: thicker agents branch more and wander more (rhododendron behavior)
      const thickRatio = agent.thickness / Math.max(0.5, genome.thicknessBase);
      const widthBoost = 1.0 + (thickRatio - 1.0) * engine.widthVariance * 3.0;
      effectiveBifurcationRate *= Math.max(1.0, widthBoost);
      effectiveWanderIntensity *= Math.max(1.0, 1.0 + (widthBoost - 1.0) * 0.5);

      // Hierarchical branch scaling: Higher-order branches and twigs get progressively smaller and shorter
      const branchDepth = agent.branchDepth || 0;
      const depthScale = Math.max(0.35, Math.pow(0.85, branchDepth));
      effectiveStepSize *= depthScale;

      agent.age++;
      if (agent.cooldown > 0) agent.cooldown--;

      let nearestDistSq = Infinity;
      let nearestTarget: Agent | null = null;
      let avoidanceForce = new THREE.Vector3();
      let avoidanceCount = 0;

      for (let j = 0; j < activeAgents.length; j++) {
        const other = activeAgents[j];
        if (other === agent || other.isFeeler) continue;

        const dSq = agent.position.distanceToSquared(other.position);
        const isSame = other.genome.name === agent.genome.name;
        const isSimilar = isSame || (other.genome.archetype === agent.genome.archetype && other.genome.movementType === agent.genome.movementType);

        if (!isSimilar) {
          // Global seeking without detection radius limit: find nearest agent of different species
          if (dSq < nearestDistSq) {
            nearestDistSq = dSq;
            nearestTarget = other;
          }
        } else {
          // Gentle local separation between same/similar species to prevent overlapping
          if (dSq < 2500) {
            avoidanceForce.add(
              new THREE.Vector3().subVectors(agent.position, other.position).normalize()
            );
            avoidanceCount++;
          }
        }
      }

      if (nearestTarget) {
        const dist = Math.sqrt(nearestDistSq);
        if (dist < 150) {
           // Symbiosis: Mutual spiraling when close
           const forward = new THREE.Vector3().addVectors(agent.direction, nearestTarget.direction).normalize();
           if (forward.lengthSq() < 0.001) forward.copy(agent.direction);
           
           const toUs = new THREE.Vector3().subVectors(agent.position, nearestTarget.position).normalize();
           const tangent = new THREE.Vector3().crossVectors(forward, toUs).normalize();
           if (tangent.lengthSq() < 0.001) tangent.set(0,1,0);
           
           const spiralDir = new THREE.Vector3().addVectors(forward, tangent.multiplyScalar(1.5)).normalize();
           
           // Pull them slightly closer if they drift too far within the 150 radius, push apart if too close
           const spacing = 20;
           if (dist > spacing) {
              spiralDir.add(toUs.clone().multiplyScalar(-0.2)).normalize();
           } else {
              spiralDir.add(toUs.clone().multiplyScalar(0.2)).normalize();
           }

           agent.direction.lerp(spiralDir, 0.3).normalize();
           
           // Symbiosis Buffs
           agent.thickness = Math.min(agent.thickness * 1.01, genome.thicknessBase * 1.5);
           agent.age = Math.max(0, agent.age - 0.5); // Extend lifespan
        } else {
           // Smooth, responsive global homing towards partner organism
           const toTarget = new THREE.Vector3()
             .subVectors(nearestTarget.position, agent.position)
             .normalize();
           const seekStrength = Math.min(
             1.0,
             Math.max(0.08, (engine.magnetism || 0.08) * 3.5) + (engine.seekAmount || 0.0) * 0.65
           );
           agent.direction.lerp(toTarget, seekStrength).normalize();
        }
      }

      if (avoidanceCount > 0) {
        avoidanceForce
          .divideScalar(avoidanceCount)
          .multiplyScalar((engine.magnetism || 0.08) * 1.5);
        agent.direction.add(avoidanceForce).normalize();
      }

      if (genome.stability > 0) genome.stability -= 0.003;

      if (agent.isFeeler) {
        updateFeelerSeeking(agent, engine);
      } else if (genome.movementType === "spiral") {
        if (!agent.spiralAxis) {
          // Determine a spiral axis perpendicular to the current direction
          const up = new THREE.Vector3(0, 1, 0);
          agent.spiralAxis = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
          if (agent.spiralAxis.lengthSq() < 0.001) {
            agent.spiralAxis.set(1, 0, 0);
          }
          // Tilt the axis forward slightly to ensure forward momentum
          agent.spiralAxis.add(agent.direction.clone().multiplyScalar(0.2)).normalize();
        }

        // Apply a strong, constant rotation around the spiral axis
        agent.direction.applyAxisAngle(agent.spiralAxis, 0.4);
        
        // Add a slight pull towards the general forward direction to avoid tightening into a flat circle
        const forwardBias = agent.spiralAxis.clone().cross(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)).normalize();
        agent.direction.add(forwardBias.multiplyScalar(0.05)).normalize();
      } else if (genome.movementType === "orthogonal") {
        if (Math.random() < effectiveWanderIntensity * 0.2) {
           const up = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
           const axis = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
           if (axis.lengthSq() > 0.001) {
             const angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.4;
             agent.direction.applyAxisAngle(axis, Math.random() < 0.5 ? angle : -angle);
           }
        }
        // Still add a tiny bit of wiggle
        agent.direction
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * effectiveWanderIntensity * 0.2,
              (Math.random() - 0.5) * effectiveWanderIntensity * 0.2,
              (Math.random() - 0.5) * effectiveWanderIntensity * 0.2,
            ),
          )
          .normalize();
      } else {
        agent.direction
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * effectiveWanderIntensity,
              (Math.random() - 0.5) * effectiveWanderIntensity,
              (Math.random() - 0.5) * effectiveWanderIntensity,
            ),
          )
          .normalize();
      }

      if (!agent.isFeeler && genome.wavingAmplitude > 0) {
        const wave =
          Math.sin(engine.time * genome.wavingSpeed + agent.age * 0.1) *
          genome.wavingAmplitude;
        const up = new THREE.Vector3(0, 1, 0);
        const waveAxis = new THREE.Vector3()
          .crossVectors(agent.direction, up)
          .normalize();
        if (waveAxis.lengthSq() > 0.001)
          agent.direction.applyAxisAngle(waveAxis, wave);
      }

      agent.position.addScaledVector(agent.direction, effectiveStepSize);

      const bX = engine.boundarySize;
      const bZ = engine.boundarySize;
      const squash = engine.boundarySquash ?? 1.0;
      const bY = Math.max(5.0, engine.boundarySize * squash);
      const creatureCenterY = engine.creatureCenterY || 18.921075;
      let bounced = false;

      if (engine.boundaryShape === "sphere") {
        // Ellipsoid / Ovoid centered at (0, creatureCenterY, 0)
        const dy = agent.position.y - creatureCenterY;
        const normX = agent.position.x / bX;
        const normY = dy / bY;
        const normZ = agent.position.z / bZ;
        const distSq = normX * normX + normY * normY + normZ * normZ;
        if (distSq > 1.0) {
          const scale = 1.0 / Math.sqrt(distSq);
          
          // Push agent back to ellipsoid surface
          agent.position.x = agent.position.x * scale;
          agent.position.y = creatureCenterY + dy * scale;
          agent.position.z = agent.position.z * scale;
          
          // Outward normal vector for ellipsoid
          const normal = new THREE.Vector3(
            agent.position.x / (bX * bX),
            (agent.position.y - creatureCenterY) / (bY * bY),
            agent.position.z / (bZ * bZ),
          ).normalize();
          
          // Reflect direction: R = D - 2(D.N)N
          const dot = agent.direction.dot(normal);
          agent.direction.sub(normal.multiplyScalar(2 * dot));
          
          bounced = true;
        }
      } else {
        // Rectangular Box centered at (0, creatureCenterY, 0)
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
      }

      // Step-by-step progressive stem tapering decay along the length of the branch
      if (!agent.isFeeler) {
        // Archetype-specific progressive thickness decay:
        // Snake: 0.9999 (can travel indefinitely without shrinking)
        // Bush: 0.992 (steady shrinking into bushy tips)
        // Tree: 0.996 during trunk (age < 150), 0.990 during canopy burst
        // Rhizome: 0.985 (rapid shrinking into fine thread tips)
        const arch = genome.archetype || 'bush';
        let archDecay = 0.995;
        if (arch === 'snake') archDecay = 0.9999;
        else if (arch === 'bush') archDecay = 0.996;   // Bush branches steadily taper down to delicate tips
        else if (arch === 'tree') archDecay = agent.age < 60 ? 0.995 : 0.988; // Trunk tapers smoothly, canopy limbs taper down to slender twigs
        else if (arch === 'rhizome') archDecay = 0.993; // Classic Ginger: rootlets taper continuously toward pointed organic root tips

        agent.thickness *= archDecay;
        
        // If agent is in tapering phase, aggressively taper to zero (0.001)
        if (isDying && agent.taperBudget !== undefined) {
          const taperAge = agent.taperBudget;
          const taperDecay = Math.max(0.70, 0.90 - taperAge * 0.008);
          agent.thickness *= taperDecay;
          agent.taperBudget++;
        } else if (agent.tapering) {
          agent.thickness *= 0.94;
        }

        if (!agent.tapering && arch !== "snake" && agent.thickness <= 0.001) {
          agent.active = false; // Branch tip has completed its natural anatomical growth
          currentActiveCount--;
          const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
          strainCounts.set(agent.genome.name, Math.max(0, newCount));
        }
      }

      // All branches taper to zero (0.001) — never stop bluntly
      const minAllowed = 0.001;
      agent.thickness = THREE.MathUtils.clamp(
        agent.thickness,
        minAllowed,
        Math.max(engine.maxLineWidth, genome.thicknessBase * 1.5),
      );
      const ageScale = agent.isFeeler ? 1.0 : (agent.age >= 30 ? 1.0 : 0.5 + 0.5 * (agent.age / 30));
      const renderThickness = Math.max(0.001, agent.thickness * ageScale);

      engine.addLineSegment(
        agent.lastPosition,
        agent.position,
        agent.isFeeler && agent.realGenome ? agent.realGenome : genome,
        renderThickness,
        false,
        agent.id,
      );

      if (!agent.tapering) {
        if (
          (genome.appendage === "hair" ||
            genome.appendage === "curlyHair" ||
            genome.appendage === "spirals") &&
          Math.random() < 0.55 * engine.ornamentFrequency
        ) {
          const rad = Math.random() * Math.PI * 2;
          const ax1 = new THREE.Vector3()
            .crossVectors(agent.direction, new THREE.Vector3(0, 1, 0))
            .normalize();
          const ax2 = new THREE.Vector3()
            .crossVectors(agent.direction, ax1)
            .normalize();
          const dir = ax1
            .multiplyScalar(Math.cos(rad))
            .add(ax2.multiplyScalar(Math.sin(rad)))
            .normalize();

          const hairStart = agent.position
            .clone()
            .add(dir.clone().multiplyScalar(renderThickness));
          const hairEnd = hairStart
            .clone()
            .add(dir.clone().multiplyScalar(5 + Math.random() * 5));
          engine.addLineSegment(
            hairStart,
            hairEnd,
            genome,
            renderThickness * 0.1,
            true,
            agent.id,
          );
        } else if (
          (genome.appendage === "thorns" ||
            genome.appendage === "crystals" ||
            genome.appendage === "sparkles") &&
          Math.random() < 0.45 * engine.ornamentFrequency
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
            .add(dir.clone().multiplyScalar(2 + Math.random() * 2));
          engine.addLineSegment(
            thornStart,
            thornEnd,
            genome,
            renderThickness * 0.7,
            true,
            agent.id,
          );
        } else {
          if (genome.appendage === "leaves" || genome.appendage === "ferns") {
            const baseInterval = genome.phyllotaxisMode === "whorled" ? 15 : 5;
            const nodeInterval = Math.max(1, Math.round((baseInterval * Math.max(1.0, engine.leafScale)) / engine.leafDensity));
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
                const leafStart = agent.position.clone().add(tiltedDir.clone().multiplyScalar(renderThickness));
                const leafEnd = leafStart.clone().add(tiltedDir.clone().multiplyScalar(renderThickness));
                engine.addLineSegment(leafStart, leafEnd, genome, renderThickness * 1.2, true, agent.id);
              };

              if (genome.phyllotaxisMode === "spiral") {
                const divAngle = THREE.MathUtils.degToRad(engine.phyllotaxisAngle);
                const theta = nodeIdx * divAngle;
                const leafDir = normal.clone().applyAxisAngle(agent.direction, theta).normalize();
                spawnLeaf(leafDir);
              } else if (genome.phyllotaxisMode === "decussate") {
                const theta = nodeIdx * (Math.PI / 2);
                const leafDir1 = normal.clone().applyAxisAngle(agent.direction, theta).normalize();
                const leafDir2 = normal.clone().applyAxisAngle(agent.direction, theta + Math.PI).normalize();
                spawnLeaf(leafDir1);
                spawnLeaf(leafDir2);
              } else {
                const numLeaves = 5;
                for (let i = 0; i < numLeaves; i++) {
                  const theta = (i * 2 * Math.PI) / numLeaves;
                  const leafDir = normal.clone().applyAxisAngle(agent.direction, theta).normalize();
                  spawnLeaf(leafDir);
                }
              }
            }
          } else {
            // For ALL other appendages (thorns, hair, curlyHair, crystals, spores, scales, spirals, flowers, lillyPads, petals, needles)
            const appInterval = Math.max(1, Math.floor(3 / (engine.ornamentFrequency || 1.0)));
            if (agent.age % appInterval === 0 || Math.random() < 0.5 * engine.ornamentFrequency) {
              const spawnPos = agent.position.clone();
              const up = new THREE.Vector3(0, 1, 0);
              let normal = new THREE.Vector3().crossVectors(agent.direction, up).normalize();
              if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);
              
              // 360 degree golden angle radial distribution along the stem
              const theta = (agent.age * 137.5 * Math.PI) / 180;
              const radDir = normal.clone().applyAxisAngle(agent.direction, theta).normalize();
              
              const appStart = spawnPos.clone().add(radDir.clone().multiplyScalar(renderThickness));
              const appEnd = appStart.clone().add(radDir.clone().multiplyScalar(renderThickness));
              engine.addLineSegment(appStart, appEnd, genome, renderThickness * 1.2, true, agent.id);
            }
          }
        }
      }

      agent.lastPosition.copy(agent.position);

      const myStrainCount = strainCounts.get(agent.genome.name) || 1;
      const maxForArchetype = genome.archetype === "bush" ? 250 : genome.archetype === "snake" ? (genome.singleton ? 1 : 2) : genome.archetype === "rhizome" ? 200 : genome.archetype === "tree" ? 250 : 50;

      const allowedToBranch = myStrainCount < maxForArchetype;

      if (agent.branchCooldown && agent.branchCooldown > 0) {
        agent.branchCooldown--;
      }

      // Dynamic branch tendency factoring in live BRANCH_VAR dial
      const liveBranchTendency = (genome.branchTendency || 1.0) * ((engine.branchTendencyVar || 20.0) / 20.0);
      const brMult = Math.max(0.1, engine.branchingMultiplier ?? 1.0);
      
      // Dynamic minimum interval before next branch: high branchingMultiplier reduces delay between branch nodes
      const baseMinInterval = genome.archetype === "rhizome" ? 3 : (genome.archetype === "bush" ? 5 : 8);
      const minInterval = Math.max(2, Math.floor(baseMinInterval / (1.0 + Math.log10(Math.max(1, brMult)))));
      const branchReady = (agent.branchCooldown || 0) <= 0 && agent.age >= minInterval;

      const branchProb = effectiveBifurcationRate * liveBranchTendency * brMult * 0.01;

      if (
        allowedToBranch &&
        !agent.isFeeler &&
        !agent.tapering &&
        branchReady &&
        activeAgents.length + newAgents.length < engine.maxAgents * 3.0 &&
        Math.random() < branchProb
      ) {
        agent.branchCooldown = minInterval + Math.floor(Math.random() * 3);

        const forkAngle = genome.archetype === "rhizome"
          ? (Math.PI / 3 + (Math.random() - 0.5) * 0.4) // Classic lateral root offshoot angle
          : (Math.PI / 4 + (Math.random() - 0.5) * 0.5);
        const newDirection = agent.direction
          .clone()
          .applyAxisAngle(
            new THREE.Vector3(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5,
            ).normalize(),
            forkAngle,
          );

        const isThickBranch = Math.random() < engine.branchSplitSizeProb;
        let thicknessMod = isThickBranch ? 0.82 + engine.branchBigger * 0.3 : 0.70;

        // When branching:
        // Bush: Children thin to delicate tendrils (0.70x), parent thins moderately
        // Rhizome (Ginger): Little rootlets sprout as smaller side branches (0.72x) that taper nicely, parent retains tuber bulk (0.92x)
        // Tree: Structural timber limbs (0.75x) thinner than trunk
        if (genome.archetype === "bush") {
          thicknessMod *= 0.70;    // Children thin to delicate tendrils
          agent.thickness *= 0.82; // Parent thins moderately
        } else if (genome.archetype === "rhizome") {
          thicknessMod *= 0.72; // Smaller rootlets popping out
          agent.thickness *= 0.92; // Main root tuber retains bulk
        } else if (genome.archetype === "tree") {
          thicknessMod *= 0.75; // Limbs get progressively thinner than trunk
          agent.thickness *= 0.85;
        }

        const branchGenome = agent.genome;
        const childThickness = agent.thickness * thicknessMod;

        newAgents.push({
          position: agent.position.clone(),
          lastPosition: agent.position.clone(),
          direction: newDirection,
          genome: branchGenome,
          active: true,
          age: agent.isCanopy ? 30 : 0,
          isCanopy: agent.isCanopy,
          thickness: childThickness,
          targetThickness: childThickness,
          cooldown: 300,
          id: engine.nextAgentId++,
          parentAgent: agent,
          parentId: agent.id,
          branchDepth: (agent.branchDepth || 0) + 1,
        });

        // TERM_BRANCH: Post-branch termination penalty
        // When termProbPostBranch > 0.5, creating a branch carries a risk of parent stem ending
        const postBranchRisk = (Math.max(0.5, engine.termProbPostBranch || 0.5) - 0.5) * 0.05 * (engine.terminationProb || 0.02);
        if (postBranchRisk > 0 && Math.random() < postBranchRisk) {
          agent.tapering = true;
        }
      }

      handleBreedingAndFeelers(
        agent,
        i,
        activeAgents,
        newAgents,
        bredThisFrame,
        engine,
        nonTaperingStrains,
      );


      // 4-STAGE LIFESPAN MODEL:
      // Stage 1 & 2: Growth & Breeding -> Once an organism has bred maxMatings times OR hits age timeout, growth stops & dying begins!
      const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
      const minMatingLifespan = (maxM + 1) * (engine.hybridCooldown || 340) * 1.2;
      const maxLifespan = Math.max(minMatingLifespan, 1200 * Math.max(0.5, engine.timeScale));
      const lifecycle = (engine as any).speciesLifecycleMap?.get(agent.genome.name);
      const speciesMCount = lifecycle?.matingCount || agent.matingCount || 0;
      const hasSpeciesBred = !!(agent.hasBred || lifecycle?.hasBred);
      const shouldDieFromMating = hasSpeciesBred && speciesMCount >= maxM;
      const shouldDieFromAge = agent.age > maxLifespan;

      if (!agent.tapering && (shouldDieFromMating || shouldDieFromAge)) {
        if (canEnterDeleting(engine, activeAgents, 1)) {
          const reason = shouldDieFromMating ? `bred ${maxM} times` : "reached max lifespan";
          engine.killSpecies(agent.genome.name, reason);
        } else if (shouldDieFromAge && agent.age > maxLifespan * 1.5) {
          // If the species cannot be deleted yet due to minimum species threshold (3 species),
          // individual ancient branches taper their tips so they don't grow infinitely
          agent.tapering = true;
          agent.fadeAge = 0;
        }
      }

      // If the whole species is in dyingStrains, or if this is a feeler whose host parent died, taper out
      const isStrainDying = engine.dyingStrains && engine.dyingStrains.has(agent.genome.name);
      const isOrphanedFeeler = agent.isFeeler && agent.parentAgent && (agent.parentAgent.tapering || !agent.parentAgent.active);
      if ((isStrainDying || isOrphanedFeeler) && !agent.tapering) {
        agent.tapering = true;
        agent.forceTapering = true;
        agent.fadeAge = 0;
        agent.taperBudget = undefined;
      }

      if (agent.tapering) {
        agent.fadeAge = (agent.fadeAge || 0) + 1;
        if (agent.fadeAge < 180 && !agent.isFeeler) {
          // Phase 1 (Ticks 0 to 180 / ~3s): Tapering to fine sculptural tips
          agent.thickness = Math.max(0.1, agent.thickness * 0.96);
        } else if (agent.fadeAge < 360 && !agent.isFeeler) {
          // Phase 2 (Ticks 180 to 360 / ~3s): Pause in completed tapered form
        } else {
          // Phase 3 (At tick 360, or tick 25 for feelers): Trigger Transparency Dissolve
          const maxFade = agent.isFeeler ? 25 : 360;
          if (agent.fadeAge >= maxFade) {
            agent.active = false;
            currentActiveCount--;
            const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
            strainCounts.set(agent.genome.name, Math.max(0, newCount));

            const isStrainDying = engine.dyingStrains && engine.dyingStrains.has(agent.genome.name);
            if (newCount <= 0 || isStrainDying) {
              if ((engine as any).markStrainSegmentsDying) {
                (engine as any).markStrainSegmentsDying(agent.genome.name);
              }
            } else {
              engine.markAgentSegmentsDying(agent.id);
            }

            // Deactivate all branches and feelers linked to this organism so no ghost branches or feelers linger
            for (let j = 0; j < activeAgents.length; j++) {
              const other = activeAgents[j];
              const isDescendant = other.parentAgent === agent || (agent.id !== undefined && other.parentId === agent.id);
              const isSameStrain = other.genome.name === agent.genome.name;
              const isFeelerOfStrain = other.realGenome && other.realGenome.name === agent.genome.name;
              if (other.active && (isDescendant || isSameStrain || isFeelerOfStrain)) {
                other.active = false;
                other.tapering = true;
                other.forceTapering = true;
                currentActiveCount--;
              }
            }

            // Check if this was the last active agent of its strain
            const remainingOfStrain = activeAgents.filter(
              a => a.active && a.genome.name === agent.genome.name
            ).length;
            if (remainingOfStrain <= 0) {
              if (!engine.dyingStrains) engine.dyingStrains = new Set();
              engine.dyingStrains.add(agent.genome.name);
            }

            const lifespanSecs = (agent.age / 60.0).toFixed(1);
            engine.onLog(
              `💀 ${agent.genome.name} [${(agent.genome.archetype || 'bush').toUpperCase()}] died after ${lifespanSecs}s (bred: ${agent.hasBred ? 'YES' : 'NO'}, mated: ${agent.matingCount || 0}x, fadeAge: ${agent.fadeAge})`
            );
          }
        }
      } 
      
      if (!agent.tapering && agent.active) {
        // Healthy active organisms maintain their natural thickness Base
        agent.thickness = Math.max(agent.thickness, genome.thicknessBase);
      }
    }
  }

  // Purge dead inactive agents from simulation memory array
  engine.agents = activeAgents.filter(a => a.active);
}
