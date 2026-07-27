import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent, MAX_POINTS } from "./SimulationTypes";
import {
  mutateGenome,
  breedGenomes,
  mutateBranchGenome,
} from "./SimulationGenetics";

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
  // MINIMUM POPULATION IMMUNITY (NO DEATH IF ≤ 3 CREATURES LEFT):
  // When active main organisms <= 3, suspend natural death and clear all 3D dissolve sets.
  const activeMainOrganisms = activeAgents.filter(a => a.active && !a.isFeeler);
  const minThreshold = engine.minAgents || 3;
  if (activeMainOrganisms.length <= minThreshold) {
    if (!engine.immunityLogged) {
      engine.onLog(`🛡️ MINIMUM POPULATION IMMUNITY (≤ ${minThreshold} creatures): Natural death suspended until offspring breed.`);
      engine.immunityLogged = true;
    }
    for (const agent of activeMainOrganisms) {
      agent.tapering = false;
      agent.dyingStart = undefined;
      if (engine.dyingStrains) engine.dyingStrains.delete(agent.genome.name);
    }
    if (engine.dyingStems) engine.dyingStems.clear();
    for (const app of engine.appendages.values()) {
      if (app.dyingSet) app.dyingSet.clear();
    }
    for (let sIdx = 0; sIdx < engine.maxDOMs; sIdx++) {
      if (engine.segments[sIdx]) engine.segments[sIdx].dyingStart = undefined;
    }
    for (const app of engine.appendages.values()) {
      const appLim = Math.floor(engine.maxDOMs / 4);
      for (let aIdx = 0; aIdx < appLim; aIdx++) {
        if (app.segments[aIdx]) app.segments[aIdx].dyingStart = undefined;
      }
    }
  } else {
    engine.immunityLogged = false;
  }

  // Cap maximum species by tapering the oldest variant
  if (nonTaperingStrains.size > engine.maxSpecies) {
    let oldestGenomeName: string | null = null;
    let oldestAge = -Infinity;
    for (const a of activeAgents) {
      if (a.active && !a.tapering && !a.isFeeler) {
         const age = engine.time - (a.genome.createdAt || 0);
         if (age > oldestAge) {
             oldestAge = age;
             oldestGenomeName = a.genome.name;
         }
      }
    }
    
    if (oldestGenomeName) {
      if (!engine.dyingStrains) engine.dyingStrains = new Set();
      if (!engine.dyingStrains.has(oldestGenomeName)) {
        engine.onLog(`Maximum species capacity reached. Gradual die-off of oldest species: ${oldestGenomeName.split(' ')[0]}`);
      }
      engine.dyingStrains.add(oldestGenomeName);
      for (const a of activeAgents) {
        if (a.genome.name === oldestGenomeName) {
           a.tapering = true;
           a.forceTapering = true;
        }
      }
    }
  }

  let aliveSpeciesCount = 0;
  let totalBiomass = 0;
  engine.biomassMap.forEach(v => {
    if (v > 0) aliveSpeciesCount++;
    totalBiomass += v;
  });

  // Ignore aliveSpeciesCount (which includes fading dead trails) for breeding caps, 
  // so we don't accidentally eradicate healthy species just because old trails haven't faded yet.
  let projectedSpeciesCount = nonTaperingStrains.size;

  const entropyEnabled = engine.entropyThreshold > 0.001;
  const monopolyThreshold = entropyEnabled ? Math.max(10, totalBiomass * engine.entropyThreshold) : Infinity;
  const monopolyStrains = new Set<string>();
  if (entropyEnabled && totalBiomass > 0) {
     engine.biomassMap.forEach((v, k) => {
        if (v > monopolyThreshold) monopolyStrains.add(k);
     });
  }

  for (let i = 0; i < activeAgents.length; i++) {
    const agent = activeAgents[i];
    
    // Protect newborn offspring (age < 60) from inheriting dying state on birth
    const isDying = (agent.age >= 60 || agent.tapering) && (agent.tapering || agent.forceTapering || !agent.active || (engine.dyingStrains && engine.dyingStrains.has(agent.genome.name)));
    if (isDying) {
      if (!agent.tapering) {
        agent.tapering = true;
        agent.dyingStart = engine.unscaledTime;
        engine.onLog(`🔻 Organism ${agent.genome.name.split(' ')[0]} entering 4-second smooth dissolve (Thickness: ${agent.thickness.toFixed(2)}).`);
      }
      if (!agent.dyingStart) agent.dyingStart = engine.unscaledTime;
      agent.recovering = false;
      agent.targetThickness = undefined;
      if (!engine.dyingStrains) engine.dyingStrains = new Set();
      engine.dyingStrains.add(agent.genome.name);
    }
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
    else if (agent.genome.archetype === "ginger") baseSpeedMult = engine.gingerSpeed;
    
    agent.growthBoost = agent.growthBoost || 1.0;
    if (agent.growthBoost > 1.0) {
      agent.growthBoost = Math.max(1.0, agent.growthBoost - 0.03 * engine.timeScale);
    }
    
    // Blend smoothly from normal speed to heavily nerfed (0.2x) speed
    const speedMult = baseSpeedMult * (1.0 - agent.suppressionFade * 0.8) * agent.growthBoost;
    
    agent.growthAccumulator = (agent.growthAccumulator || 0) + engine.growthSpeed * speedMult * engine.timeScale;
    let iterations = isDying ? 0 : Math.floor(agent.growthAccumulator);
    agent.growthAccumulator -= iterations;

    for (let iter = 0; iter < iterations; iter++) {
      if (!agent.active) break;
      const { genome } = agent;
      const isHybrid = genome.name.startsWith("Hybrid") || genome.name.startsWith("Kin");

      let effectiveBifurcationRate = genome.bifurcationRate;
      let effectiveWanderIntensity = genome.wanderIntensity;
      let effectiveStepSize = genome.stepSize;

      if (genome.archetype === "bush") {
        effectiveBifurcationRate *= 4.0;
        effectiveStepSize *= 0.4;
        effectiveWanderIntensity *= 2.0;
      } else if (genome.archetype === "tree") {
        effectiveBifurcationRate *= 0.25;
        effectiveStepSize *= 1.2;
        effectiveWanderIntensity *= 0.5;
      } else if (genome.archetype === "snake") {
        effectiveBifurcationRate *= 0.05;
        effectiveWanderIntensity *= engine.snakeWander;
        effectiveStepSize *= engine.snakeStepSize;
      } else if (genome.archetype === "ginger") {
        effectiveBifurcationRate *= 12.0;
        effectiveStepSize *= 0.6;
        effectiveWanderIntensity *= 12.0;
      }

      agent.age++;
      if (agent.cooldown > 0) agent.cooldown--;

      let nearestDistSq = Infinity;
      let nearestTarget: Agent | null = null;
      let avoidanceForce = new THREE.Vector3();
      let avoidanceCount = 0;

      const isYoungHybrid = isHybrid && agent.age < 2400;
      const onCooldown = agent.cooldown > 0;

      for (let j = 0; j < activeAgents.length; j++) {
        const other = activeAgents[j];
        if (other === agent) continue;

        const dSq = agent.position.distanceToSquared(other.position);

        if (isYoungHybrid || onCooldown) {
          if (dSq < 10000) {
            avoidanceForce.add(
              new THREE.Vector3()
                .subVectors(agent.position, other.position)
                .normalize(),
            );
            avoidanceCount++;
          }
        } else {
          const isSame = other.genome.name === agent.genome.name;
          const isSimilar = isSame || (other.genome.archetype === agent.genome.archetype && other.genome.movementType === agent.genome.movementType);

          if (!isSimilar && other.cooldown <= 0) {
            if (dSq < nearestDistSq) {
              nearestDistSq = dSq;
              nearestTarget = other;
            }
          } else if (isSimilar) {
            // Same or similar species repel each other
            if (dSq < 10000) {
              avoidanceForce.add(
                new THREE.Vector3().subVectors(agent.position, other.position).normalize()
              );
              avoidanceCount++;
            }
          }
        }
      }

      const snakeMagMod = genome.archetype === "snake" ? 0.02 : 1.0;

      if (
        !isYoungHybrid &&
        !onCooldown &&
        nearestTarget &&
        nearestDistSq < 60000
      ) {
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
           const seek = new THREE.Vector3()
             .subVectors(nearestTarget.position, agent.position)
             .normalize()
             .multiplyScalar(engine.magnetism * 4.0 * snakeMagMod);
           agent.direction.add(seek).normalize();
        }
      }

      if (avoidanceCount > 0) {
        avoidanceForce
          .divideScalar(avoidanceCount)
          .multiplyScalar(engine.magnetism * 1.0 * snakeMagMod);
        agent.direction.add(avoidanceForce).normalize();
      }

      if (genome.stability > 0) genome.stability -= 0.003;

      if (agent.isFeeler) {
        // Feelers don't wander, wave, or spiral; they are homing missiles.
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

      const b = engine.boundarySize;
      const aspectX = 1.6; // Oblong/Ovoid aspect scaling for rectangular screens
      let bounced = false;

      if (engine.boundaryShape === "sphere") {
        // Ovoid Ellipsoid: (x / (1.6 * b))^2 + (y / b)^2 + (z / b)^2 <= 1.0
        const scaledX = agent.position.x / aspectX;
        const distSq = scaledX * scaledX + agent.position.y * agent.position.y + agent.position.z * agent.position.z;
        if (distSq > b * b) {
          const dist = Math.sqrt(distSq);
          const scale = b / dist;
          
          // Outward normal vector for ellipsoid
          const normal = new THREE.Vector3(agent.position.x / (aspectX * aspectX), agent.position.y, agent.position.z).normalize();
          
          // Push agent back to ovoid surface
          agent.position.x = scaledX * scale * aspectX;
          agent.position.y = agent.position.y * scale;
          agent.position.z = agent.position.z * scale;
          
          // Reflect direction: R = D - 2(D.N)N
          const dot = agent.direction.dot(normal);
          agent.direction.sub(normal.multiplyScalar(2 * dot));
          
          bounced = true;
        }
      } else {
        // Oblong Cube
        const bx = b * aspectX;
        if (agent.position.x > bx) {
          agent.position.x = bx;
          agent.direction.x *= -1;
          bounced = true;
        } else if (agent.position.x < -bx) {
          agent.position.x = -bx;
          agent.direction.x *= -1;
          bounced = true;
        }

        if (agent.position.y > b) {
          agent.position.y = b;
          agent.direction.y *= -1;
          bounced = true;
        } else if (agent.position.y < -b) {
          agent.position.y = -b;
          agent.direction.y *= -1;
          bounced = true;
        }

        if (agent.position.z > b) {
          agent.position.z = b;
          agent.direction.z *= -1;
          bounced = true;
        } else if (agent.position.z < -b) {
          agent.position.z = -b;
          agent.direction.z *= -1;
          bounced = true;
        }
      }

      if (bounced) {
        agent.direction.normalize();
      }

      const minAllowed = agent.isFeeler ? 0.1 : Math.max(3.5, (genome.thicknessBase || 4.0) * 0.75);
      agent.thickness = THREE.MathUtils.clamp(
        agent.thickness,
        minAllowed,
        Math.max(12.0, engine.maxLineWidth * 1.5),
      );
      const renderThickness = Math.max(minAllowed, agent.thickness);

      engine.addLineSegment(
        agent.lastPosition,
        agent.position,
        agent.isFeeler && agent.realGenome ? agent.realGenome : genome,
        renderThickness,
      );

      if (!agent.tapering) {
        if (
          (genome.appendage === "hair" ||
            genome.appendage === "curlyHair" ||
            genome.appendage === "spirals") &&
          Math.random() < 0.15 * engine.ornamentFrequency &&
          engine.pointCount < MAX_POINTS - 10
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
          );
        } else if (
          (genome.appendage === "thorns" ||
            genome.appendage === "crystals" ||
            genome.appendage === "sparkles") &&
          Math.random() < 0.08 * engine.ornamentFrequency &&
          engine.pointCount < MAX_POINTS - 10
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
          );
        } else if (engine.pointCount < MAX_POINTS - 10) {
          if (genome.appendage === "leaves") {
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
                engine.addLineSegment(leafStart, leafEnd, genome, renderThickness * 1.2, true);
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
              engine.addLineSegment(appStart, appEnd, genome, renderThickness * 1.2, true);
            }
          }
        }
      }

      agent.lastPosition.copy(agent.position);

      const myStrainCount = strainCounts.get(agent.genome.name) || 1;
      const maxForArchetype = genome.archetype === "bush" ? 40 : genome.archetype === "snake" ? (genome.singleton ? 1 : 2) : genome.archetype === "ginger" ? 150 : 20;

      const isSnake = genome.archetype === "snake";
      let allowedToBranch = !(isSnake && myStrainCount >= maxForArchetype);

      if (
        allowedToBranch &&
        !agent.isFeeler &&
        !agent.tapering &&
        agent.age > 30 + Math.random() * 40 &&
        activeAgents.length + newAgents.length < engine.maxAgents * 1.5 &&
        Math.random() <
          effectiveBifurcationRate *
            genome.branchTendency *
            engine.branchingMultiplier
      ) {
        if (myStrainCount >= maxForArchetype) {
           // We are at or over the branch limit for this creature type.
           // Find the oldest active branch of strictly the same genome and kill it to make room.
           let oldestBranch: Agent | null = null;
           for (let idx = 0; idx < activeAgents.length; idx++) {
              const ca = activeAgents[idx];
              if (ca.active && !ca.tapering && ca.genome.name === genome.name) {
                 if (!oldestBranch || ca.age > oldestBranch.age) {
                    oldestBranch = ca;
                 }
              }
           }
           if (oldestBranch) {
              oldestBranch.tapering = true;
              oldestBranch.forceTapering = true;
           }
        }

        // Partially reset age to allow varied branching distances instead of rigid grids
        agent.age = Math.floor(Math.random() * 25);
        const forkAngle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        const newDirection = agent.direction
          .clone()
          .applyAxisAngle(
            new THREE.Vector3(
              Math.random(),
              Math.random(),
              Math.random(),
            ).normalize(),
            forkAngle,
          );

        const isThickBranch = Math.random() < engine.branchSplitSizeProb;
        let thicknessMod = isThickBranch ? 1.0 + engine.branchBigger : 0.85;

        if (genome.archetype === "bush") {
          thicknessMod *= 0.8;
        } else if (genome.archetype === "tree") {
          thicknessMod *= 1.25;
        }

        let branchGenome = agent.genome;
        if (
          engine.branchMutationRate > 0 &&
          Math.random() < engine.branchMutationRate * 0.005 &&
          projectedSpeciesCount < engine.maxSpecies
        ) {
          branchGenome = mutateBranchGenome(
            agent.genome,
            engine.traitProbs,
            engine.multicolorAppProb,
            engine.sameColorAppProb,
            engine.appendageSpawnRate,
            engine.glowProbability,
          );
          branchGenome.createdAt = engine.time;
          projectedSpeciesCount++;
          if (engine.branchMutationCount < 3) {
            engine.branchMutationCount++;
            engine.lastBranchMutationWorldPos = agent.position.clone();
            if (engine.onBranchMutationEvent) {
              engine.onBranchMutationEvent({
                parent: agent.genome,
                child: branchGenome,
                count: engine.branchMutationCount,
              });
            }
          }
        }

        newAgents.push({
          position: agent.position.clone(),
          lastPosition: agent.position.clone(),
          direction: newDirection,
          genome: branchGenome,
          active: true,
          age: 0,
          thickness: agent.thickness,
          targetThickness: agent.thickness * thicknessMod,
          cooldown: 300,
        });
      }

      const evalGenome = agent.isFeeler && agent.realGenome ? agent.realGenome : genome;
      let strainAge = 0;
      if (evalGenome.createdAt !== undefined) {
         strainAge = engine.time - evalGenome.createdAt;
      }

      const isMonopoly = monopolyStrains.has(evalGenome.name);
      // Age-dependent feeler emission: Organism extends feelers more and more frequently as it grows until it has mated 3 times
      if (!agent.isFeeler && (agent.mateCount || 0) < 3 && !agent.tapering && agent.age > 15 && agent.cooldown <= 0) {
        const feelerChance = Math.min(0.85, (agent.age - 15) * 0.04 * engine.timeScale);
        if (Math.random() < feelerChance) {
          const feelerGenome = { ...agent.genome };
          feelerGenome.name = `Feeler-${Math.floor(Math.random() * 10000)}`;
          feelerGenome.archetype = "snake"; // Fast sensory feeler
          feelerGenome.thicknessBase = Math.max(0.2, agent.thickness * 0.3);
          feelerGenome.minThickness = 0.1;
          feelerGenome.wanderIntensity *= 1.8;

          const spawnDir = agent.direction.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)).normalize();
          newAgents.push({
            position: agent.position.clone(),
            lastPosition: agent.position.clone(),
            direction: spawnDir,
            genome: feelerGenome,
            active: true,
            age: 0,
            thickness: feelerGenome.thicknessBase,
            cooldown: 15,
            isFeeler: true,
            realGenome: agent.genome,
          });
          agent.cooldown = 25;
          engine.onLog(`📡 ${agent.genome.name.split(' ')[0]} extending sensory feelers to breed (Mated ${agent.mateCount || 0}/3).`);
        }
      }

      const isFertile = !agent.tapering && (agent.mateCount || 0) < 3 && (agent.age > 20 || evalGenome.stability < 0.5 || isMonopoly || strainAge > 2000);
      const canBreed = isFertile && agent.cooldown <= 0 && !bredThisFrame.has(agent);

      if (canBreed) {
        let bestPartner: any = null;
        let nearestDistSq = Infinity;
        let bestDiffScore = -Infinity;

        for (let j = 0; j < activeAgents.length; j++) {
           if (j === i) continue;

           const partner = activeAgents[j];
           const partnerEvalGenome = partner.isFeeler && partner.realGenome ? partner.realGenome : partner.genome;
           const partnerStrainAge = partnerEvalGenome.createdAt !== undefined ? engine.time - partnerEvalGenome.createdAt : 0;
           const partnerMonopoly = monopolyStrains.has(partnerEvalGenome.name);
           const partnerFertile =
             partner.age > 50 || partnerEvalGenome.stability < 0.5 || partnerMonopoly || partnerStrainAge > 2000;

           if (
             !partnerFertile ||
             partner.cooldown > 0 ||
             bredThisFrame.has(partner)
           )
             continue;

           if (evalGenome.name !== partnerEvalGenome.name) {
             const distSq = agent.position.distanceToSquared(partner.position);

             if (isMonopoly) {
                 let diffScore = 0;
                 if (evalGenome.archetype !== partnerEvalGenome.archetype) diffScore += 10;
                 if (evalGenome.movementType !== partnerEvalGenome.movementType) diffScore += 5;
                 const h1 = evalGenome.color.getHSL({h:0,s:0,l:0}).h;
                 const h2 = partnerEvalGenome.color.getHSL({h:0,s:0,l:0}).h;
                 let hDiff = Math.abs(h1 - h2);
                 if (hDiff > 0.5) hDiff = 1.0 - hDiff;
                 diffScore += hDiff * 10;
                 
                 diffScore -= Math.sqrt(distSq) / 2000.0;
                 
                 if (diffScore > bestDiffScore) {
                     bestDiffScore = diffScore;
                     bestPartner = partner;
                     nearestDistSq = distSq;
                 }
             } else {
                 if (distSq < nearestDistSq) {
                     nearestDistSq = distSq;
                     bestPartner = partner;
                 }
             }
           }
        }

        if (bestPartner) {
           const distSq = nearestDistSq;
           const isDesperate = isMonopoly || strainAge > 2000 || agent.age > engine.despairAge;
           const reachMultiplier = isDesperate ? engine.desperation : 1.0;
           const reach = engine.proximity * engine.proximity * reachMultiplier * reachMultiplier;
           
           const towardsPartner = bestPartner.position.clone().sub(agent.position).normalize();
           if (agent.isFeeler) {
               agent.direction.copy(towardsPartner);
           } else if (distSq < reach) {
               // If desperate, forcefully reach out; else gently steer
               agent.direction.lerp(towardsPartner, isDesperate ? 0.8 : 0.2).normalize();
           }
           
           if (entropyEnabled && !agent.isFeeler && distSq < reach && agent.cooldown <= 0 && Math.random() < 0.2 * reachMultiplier * engine.timeScale) {
                   const feelerGenome = { ...agent.genome };
                   feelerGenome.name = `Feeler-${Math.floor(Math.random() * 10000)}`;
                   feelerGenome.archetype = "snake"; // Fast!
                   feelerGenome.thicknessBase = Math.max(0.2, agent.thickness * 0.3);
                   feelerGenome.minThickness = 0.1;
                   // High wander so it spirals towards them quickly
                   feelerGenome.wanderIntensity *= 1.5;
                   
                    newAgents.push({
                        position: agent.position.clone(),
                        lastPosition: agent.position.clone(),
                        direction: towardsPartner.clone(),
                        genome: feelerGenome,
                        active: true,
                        age: 0,
                        thickness: feelerGenome.thicknessBase,
                        cooldown: 20, // Low cooldown so the feeler itself can breed quickly
                        isFeeler: true,
                        realGenome: agent.genome,
                    });
                    agent.cooldown = 150;
                    if (engine.feelerCount < 3) {
                      engine.feelerCount++;
                      engine.lastFeelerWorldPos = agent.position.clone();
                      if (engine.onFeelerEvent) {
                        engine.onFeelerEvent({ parent: agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome, feeler: feelerGenome, count: engine.feelerCount });
                      }
                    } // Prevent spamming feelers too fast
                   if (isDesperate && !isSuppressed) {
                       engine.onLog(`Aging ${agent.genome.name.split(' ')[0]} seeking hybridization partner.`);
                   } else {
                       engine.onLog(`Suppressed ${agent.genome.name.split(' ')[0]} extended sensory feeler.`);
                    }
               }
           
            // Require physical touching based on agent thicknesses to breed
            const touchDist = (agent.thickness + bestPartner.thickness) * 1.5 + 1.0;
            const breedReach = touchDist * touchDist;
            if (distSq < breedReach) {
                const nearestPartner = bestPartner;
                
                let allowBreeding = true;
                if (projectedSpeciesCount >= engine.maxSpecies) {
                    let victimSpeciesName = "";

                    // 1. Try to find an unrelated feeler to sacrifice first
                    for (let idx = 0; idx < activeAgents.length; idx++) {
                        const ca = activeAgents[idx];
                        if (ca.active && !ca.tapering && ca.isFeeler && ca !== agent && ca !== nearestPartner) {
                            victimSpeciesName = ca.genome.name;
                            break;
                        }
                    }

                    // 2. If no feeler found, eradicate oldest species (whether breeder is a feeler or not)
                    if (!victimSpeciesName) {
                        let oldestCreatedAt = Infinity;
                        for (let idx = 0; idx < activeAgents.length; idx++) {
                            const ca = activeAgents[idx];
                            if (ca.active && !ca.tapering && ca.genome.createdAt !== undefined && !ca.isFeeler) {
                                const evalGenomeAgent = agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome;
                                const evalGenomePartner = nearestPartner.isFeeler && nearestPartner.realGenome ? nearestPartner.realGenome : nearestPartner.genome;
                                if (ca.genome.name !== evalGenomeAgent.name && ca.genome.name !== evalGenomePartner.name) {
                                    if (ca.genome.createdAt < oldestCreatedAt) {
                                        oldestCreatedAt = ca.genome.createdAt;
                                        victimSpeciesName = ca.genome.name;
                                    }
                                }
                            }
                        }
                    }

                    if (victimSpeciesName) {
                        let isFeelerSacrifice = false;
                        for (let idx = 0; idx < activeAgents.length; idx++) {
                            if (activeAgents[idx].genome.name === victimSpeciesName && activeAgents[idx].isFeeler) {
                                isFeelerSacrifice = true;
                            }
                            if (activeAgents[idx].genome.name === victimSpeciesName) {
                                activeAgents[idx].tapering = true;
                                activeAgents[idx].forceTapering = true;
                            }
                        }
                        // Instantly reflect this in the projected count so we don't count the dying species anymore
                        if (!isFeelerSacrifice) {
                            nonTaperingStrains.delete(victimSpeciesName);
                        }
                        
                        if (isFeelerSacrifice) {
                            engine.onLog(`Feeler terminated for hybrid creation.`);
                        } else {
                            if (!engine.dyingStrains) engine.dyingStrains = new Set();
                            if (!engine.dyingStrains.has(victimSpeciesName)) {
                                engine.onLog(`Hybridization recorded. Culling oldest species: ${victimSpeciesName.split(' ')[0]}.`);
                            }
                            engine.dyingStrains.add(victimSpeciesName);
                        }
                    }
                }

                if (allowBreeding) {
                    const childGenome = breedGenomes(
                  agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome,
                  nearestPartner.isFeeler && nearestPartner.realGenome ? nearestPartner.realGenome : nearestPartner.genome,
                  engine.traitProbs,
                  engine.multicolorAppProb,
                  engine.sameColorAppProb,
                  engine.appendageSpawnRate,
                  engine.glowProbability,
                );
               childGenome.createdAt = engine.time;
               const childDir = agent.direction
                 .clone()
                 .lerp(nearestPartner.direction, 0.5)
                 .normalize();
               const midPoint = agent.position
                 .clone()
                 .lerp(nearestPartner.position, 0.5);
    
               newAgents.push({
                 position: midPoint.clone(),
                 lastPosition: midPoint.clone(),
                 direction: childDir,
                 genome: childGenome,
                 active: true,
                 age: 0,
                 thickness: childGenome.thicknessBase,
                 cooldown: engine.hybridCooldown,
               });
    
               // Post-Breeding Transition: Once parents breed, mark them as bred so they taper out and die neatly
               agent.hasBred = true;
               agent.tapering = true;
               nearestPartner.hasBred = true;
               nearestPartner.tapering = true;

               engine.spawnHybridArtifact(midPoint, childGenome.color);
               engine.onLog(`💖 Hybrid child ${childGenome.name.split(' ')[0]} [${childGenome.archetype.toUpperCase()}] spawned from successful breeding.`);

               if (engine.matingCount < 3) {
                 engine.matingCount++;
                 engine.lastMatingWorldPos = midPoint.clone();
                 if (engine.onMatingEvent) {
                   engine.onMatingEvent({
                     parent1: agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome,
                     parent2: nearestPartner.isFeeler && nearestPartner.realGenome ? nearestPartner.realGenome : nearestPartner.genome,
                     child: childGenome,
                   });
                 }
               }
    
               agent.cooldown = engine.hybridCooldown;
               nearestPartner.cooldown = engine.hybridCooldown;
    
               bredThisFrame.add(agent);
               bredThisFrame.add(nearestPartner);
               
               projectedSpeciesCount++;
               
               // Post-mating rapid die-off: Once creatures mate, they immediately taper and dissolve smoothly all at once
               if (engine.postMatingDieoff !== false) {
                 agent.tapering = true;
                 agent.forceTapering = true;
                 nearestPartner.tapering = true;
                 nearestPartner.forceTapering = true;

                 if (!engine.dyingStrains) engine.dyingStrains = new Set();
                 engine.dyingStrains.add(agent.genome.name);
                 engine.dyingStrains.add(nearestPartner.genome.name);
               }

               if (isMonopoly) {
                 agent.tapering = true;
                 agent.forceTapering = true;
               }

               if (agent.isFeeler) {
                 agent.tapering = true;
                 agent.forceTapering = true;
               }
               if (nearestPartner.isFeeler) {
                 nearestPartner.tapering = true;
                 nearestPartner.forceTapering = true;
               }
            }
           }
         }
      }


      // 4-STAGE LIFESPAN MODEL:
      // Stage 1 & 2: Growth & Breeding -> Once an organism has bred (hasBred) OR hits age timeout (300 ticks ~ 5s), it tapers!
      const maxGrowthAge = 300 * Math.max(0.5, engine.timeScale);
      if (!agent.tapering && (agent.hasBred || agent.age > maxGrowthAge)) {
        agent.tapering = true;
      }

      // Stage 3 & 4: Dissolving & Removal -> Maintain original thickness; stem & appendages dissolve together over 4 seconds
      if (agent.tapering) {
        if (!agent.dyingStart) agent.dyingStart = engine.unscaledTime;
        const fadeAge = engine.unscaledTime - agent.dyingStart;
        const wipeDuration = 240.0; // 4.0 seconds smooth dissolve fade OUT
        
        if (fadeAge > wipeDuration) {
          agent.active = false;
          currentActiveCount--;
          const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
          strainCounts.set(agent.genome.name, Math.max(0, newCount));
          const lifespanSecs = (agent.age / 60.0).toFixed(1);
          engine.onLog(
            `💀 Organism ${agent.genome.name.split(' ')[0]} [${(agent.genome.archetype || 'bush').toUpperCase()}] finished 4s dissolve and vanished after ${lifespanSecs}s.`
          );
        }
      } 
      
      if (!agent.tapering && agent.active) {
        // Maintain bold lush thickness near thicknessBase without decaying into thin sticks
        const targetThick = genome.thicknessBase || 4.0;
        agent.thickness += (targetThick - agent.thickness) * 0.05;
      }
    }
  }
}

  // Purge dead inactive agents from simulation memory array
  engine.agents = activeAgents.filter(a => a.active);
}
