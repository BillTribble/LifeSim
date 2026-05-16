import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent, MAX_POINTS, BOUNDARY } from "./SimulationTypes";
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
      engine.dyingStrains.add(oldestGenomeName);
      engine.onLog(`Maximum species exceeded! Gradual die-off of oldest species: ${oldestGenomeName.split(' ')[0]}`);
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

  const monopolyThreshold = Math.max(10, totalBiomass * engine.entropyThreshold);
  const monopolyStrains = new Set<string>();
  if (totalBiomass > 0) {
     engine.biomassMap.forEach((v, k) => {
        if (v > monopolyThreshold) monopolyStrains.add(k);
     });
  }

  for (let i = 0; i < activeAgents.length; i++) {
    const agent = activeAgents[i];
    
    const isSuppressed = engine.suppressedStrains && engine.suppressedStrains.has(agent.genome.name);
    agent.suppressionFade = agent.suppressionFade || 0;
    if (isSuppressed) {
      agent.suppressionFade = Math.min(1.0, agent.suppressionFade + 0.02); // 50 frames to fully suppress (about 1 second)
    } else {
      agent.suppressionFade = Math.max(0.0, agent.suppressionFade - 0.02);
    }
    
    let baseSpeedMult = agent.genome.archetype === "snake" ? 3.0 : 1.0;
    // Blend smoothly from normal speed to heavily nerfed (0.2x) speed
    const speedMult = baseSpeedMult * (1.0 - agent.suppressionFade * 0.8);
    
    agent.growthAccumulator = (agent.growthAccumulator || 0) + engine.growthSpeed * speedMult;
    let iterations = Math.floor(agent.growthAccumulator);
    agent.growthAccumulator -= iterations;

    for (let iter = 0; iter < iterations; iter++) {
      if (!agent.active) break;
      const { genome } = agent;
      const isHybrid = genome.name.startsWith("Hybrid");

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
        effectiveWanderIntensity *= 3.0;
        effectiveStepSize *= 1.5;
      } else if (genome.archetype === "fuzzy") {
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

      if (engine.time % 4 === 0) {
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

      if (agent.position.length() > BOUNDARY) {
        agent.direction
          .sub(agent.position.clone().normalize().multiplyScalar(0.08))
          .normalize();
      }

      agent.position.addScaledVector(agent.direction, effectiveStepSize);
      agent.thickness = THREE.MathUtils.clamp(
        agent.thickness,
        0.1,
        engine.maxLineWidth,
      );
      const renderThickness = Math.max(0.1, agent.thickness * 0.9);

      engine.addLineSegment(
        agent.lastPosition,
        agent.position,
        genome,
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

          const hairEnd = agent.position
            .clone()
            .add(dir.multiplyScalar(5 + Math.random() * 5));
          engine.addLineSegment(
            agent.position,
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

          const thornEnd = agent.position
            .clone()
            .add(dir.multiplyScalar(2 + Math.random() * 2));
          engine.addLineSegment(
            agent.position,
            thornEnd,
            genome,
            renderThickness * 0.7,
            true,
          );
        } else if (
          (genome.appendage === "spores" || genome.appendage === "scales") &&
          Math.random() < 0.03 * engine.ornamentFrequency &&
          engine.pointCount < MAX_POINTS - 10
        ) {
          const floatPos = agent.position
            .clone()
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
              ),
            );
          engine.addLineSegment(
            agent.position,
            floatPos,
            genome,
            renderThickness * 1.5,
            true,
          );
        } else if (
          (genome.appendage === "flowers" ||
            genome.appendage === "leaves" ||
            genome.appendage === "petals" ||
            genome.appendage === "needles" ||
            genome.appendage === "ferns" ||
            genome.appendage === "buds") &&
          Math.random() < 0.05 * engine.ornamentFrequency &&
          engine.pointCount < MAX_POINTS - 10
        ) {
          const spawnPos = agent.position.clone();
          const offset = new THREE.Vector3()
            .crossVectors(agent.direction, new THREE.Vector3(0, 1, 0))
            .normalize()
            .multiplyScalar(renderThickness);
          engine.addLineSegment(
            spawnPos,
            spawnPos.clone().add(offset),
            genome,
            renderThickness * 1.2,
            true,
          );
        }
      }

      agent.lastPosition.copy(agent.position);

      const myStrainCount = strainCounts.get(agent.genome.name) || 1;
      const maxForArchetype = genome.archetype === "bush" ? 40 : genome.archetype === "snake" ? (genome.singleton ? 1 : 2) : genome.archetype === "fuzzy" ? 150 : 20;

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
          Math.random() < engine.branchMutationRate &&
          projectedSpeciesCount < engine.maxSpecies
        ) {
          branchGenome = mutateBranchGenome(
            agent.genome,
            engine.traitProbs,
            engine.multicolorAppProb,
            engine.sameColorAppProb,
          );
          branchGenome.createdAt = engine.time;
          projectedSpeciesCount++;
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
      if (!engine.suppressedStrains) engine.suppressedStrains = new Set();
      const isSuppressed = engine.suppressedStrains.has(evalGenome.name);
      const isFertile = !agent.tapering && (agent.age > 50 || evalGenome.stability < 0.5 || isMonopoly || strainAge > 2000);
      // Removed species and branch limits from canBreed so that older/desperate creatures continue to seek out mates
      // The culling logic will naturally handle cleaning up excess creatures.
      const canBreed = isFertile && agent.cooldown <= 0 && !bredThisFrame.has(agent) && activeAgents.length + newAgents.length < engine.maxAgents * 1.5;

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
           
           if (!agent.isFeeler && distSq < reach && (isSuppressed || isDesperate) && agent.cooldown <= 0 && Math.random() < 0.2 * reachMultiplier) {
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
                   agent.cooldown = 150; // Prevent spamming feelers too fast
                   if (isDesperate && !isSuppressed) {
                       engine.onLog(`Aging ${agent.genome.name.split(' ')[0]} desperately hunting for a mate!`);
                   } else {
                       engine.onLog(`Suppressed ${agent.genome.name.split(' ')[0]} sent out a feeler!`);
                    }
               }
           
            const breedReach = engine.proximity * engine.proximity * (isDesperate ? 0.2 : 0.05) * reachMultiplier;
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
                            engine.onLog(`Sacrificed a feeler to make room for hybrid!`);
                        } else {
                            if (!engine.dyingStrains) engine.dyingStrains = new Set();
                            engine.dyingStrains.add(victimSpeciesName);
                            engine.onLog(`Hybridization occurred! Gradual die-off of oldest species: ${victimSpeciesName.split(' ')[0]} to make room!`);
                        }
                    } else {
                        allowBreeding = false;
                    }
                }

                if (allowBreeding) {
                    const childGenome = breedGenomes(
                  agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome,
                  nearestPartner.isFeeler && nearestPartner.realGenome ? nearestPartner.realGenome : nearestPartner.genome,
                  engine.traitProbs,
                  engine.multicolorAppProb,
                  engine.sameColorAppProb,
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
    
               engine.spawnHybridArtifact(midPoint, childGenome.color);
    
               agent.cooldown = engine.hybridCooldown;
               nearestPartner.cooldown = engine.hybridCooldown;
    
               bredThisFrame.add(agent);
               bredThisFrame.add(nearestPartner);
               
               projectedSpeciesCount++;
               
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


      let currentTermProb = engine.terminationProb * 0.001; // Extremely low base multiplier for long life
      if (genome.archetype === "fuzzy") {
         currentTermProb *= 0.2; // Proliferate for longer
      }
      if (agent.age < 120) {
        currentTermProb *= engine.termProbPostBranch * 0.1; // Scaled down branch penalty
      }

      // 1: Older Strains Die Out (Bias system towards old variants dying to make room)
      if (strainAge > 0) {
         // Non-linear increase in termination probability for older variants
         const agePenalty = Math.pow(Math.max(0, strainAge - 2000) / 2000, 2) * 0.4;
         currentTermProb += agePenalty * engine.terminationProb; // Make age penalty relative to dial, so 0 dial = 0 death 
      }
      
      // 4: Hybrid Vigor / Young Strain Immunity
      const hasVigor = strainAge < 1000;
      if (hasVigor) {
         // Young variants are highly resistant to natural random tapering
         currentTermProb *= 0.1;
      }

      const speedFactor = engine.growthSpeed < 1.0 ? Math.pow(engine.growthSpeed, 2) : engine.growthSpeed;
      currentTermProb *= speedFactor;

      const activeStrainsCount = strainCounts.size || 1;
      const minPerStrain = Math.max(1, Math.floor(engine.minAgents / activeStrainsCount));

      if (
        !agent.tapering &&
        agent.age > 40 &&
        Math.random() < currentTermProb &&
        currentActiveCount > engine.minAgents &&
        myStrainCount > minPerStrain
      ) {
        agent.tapering = true;
      }

      if (agent.tapering) {
        if (!agent.forceTapering && (currentActiveCount <= engine.minAgents || myStrainCount <= minPerStrain)) {
          agent.tapering = false;
          agent.forceTapering = false;
          agent.recovering = true;
          agent.targetThickness = genome.thicknessBase;
        } else {
          let duration = engine.taperDuration;
          if (agent.isFeeler) duration /= engine.feelerFade;
          let shrinkRate = Math.pow(0.5, 1.0 / (duration * 30 + 1));
          
          agent.thickness *= shrinkRate;
          if (agent.thickness <= 0.15) {
            agent.active = false;
            currentActiveCount--;
            const newCount = (strainCounts.get(agent.genome.name) || 1) - 1;
            if (newCount <= 0) {
              strainCounts.delete(agent.genome.name);
            } else {
              strainCounts.set(agent.genome.name, newCount);
            }
          }
        }
      } 
      
      if (!agent.tapering && agent.active) {
        if (!agent.recovering) {
          agent.thickness *= genome.thicknessDecay;
          // Natural recovery: if they get too thin, they bounce back and get thick again
          if (agent.thickness <= genome.minThickness * 1.5 && Math.random() < 0.05) {
             agent.recovering = true;
             agent.targetThickness = genome.thicknessBase;
             engine.onLog(`Strain ${genome.name.split(' ')[0]} recovered its thickness!`);
          }
        }
        agent.thickness = Math.max(agent.thickness, genome.minThickness);

        if (agent.targetThickness !== undefined) {
          const recoverySpeed = agent.recovering ? 0.008 : 0.05;
          agent.thickness += (agent.targetThickness - agent.thickness) * recoverySpeed;
          if (Math.abs(agent.targetThickness - agent.thickness) < 0.05) {
            agent.targetThickness = undefined;
            agent.recovering = false;
          }
        }
      }
    }
  }
}
