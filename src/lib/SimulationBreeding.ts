import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { breedGenomes } from "./SimulationGenetics";

export function canEnterDeleting(
  engine: SimulationEngine,
  activeAgents: Agent[],
  countAsRemoved: number = 1,
): boolean {
  if (!engine.hasAnyOrganismBred) return false;
  const livingSpecies = new Set<string>();
  for (const a of activeAgents) {
    if (a.active && !a.tapering && !a.isFeeler) {
      livingSpecies.add(a.genome.name);
    }
  }
  return livingSpecies.size >= 4 && (livingSpecies.size - countAsRemoved) >= 3;
}

export function createFeelerGenome(agent: Agent): any {
  return {
    ...agent.genome,
    name: `Feeler-${Math.floor(Math.random() * 10000)}`,
    archetype: "snake" as any,
    thicknessBase: Math.max(0.2, Math.min(0.35, agent.thickness * 0.4)),
    minThickness: 0.5,
    stepSize: 0.8,
    wanderIntensity: 0.75,
    bifurcationRate: 0.0001,
    branchTendency: 0,
    wavingAmplitude: 0.5,
    wavingSpeed: 0.05,
    isGlowing: true,
    thicknessDecay: 0.9999,
    movementType: "default",
    geometryType: "cylinder",
    appendage: "none" as any,
    sameColorAppendage: true,
    multicolorAppendage: false,
    gradientGrowth: false,
  };
}

export function trySpawnTaperingFeeler(
  agent: Agent,
  activeAgents: Agent[],
  newAgents: Agent[],
  engine: SimulationEngine,
): void {
  if (!agent.hasBred && !agent.isFeeler && agent.cooldown <= 0) {
    const evalGenome =
      agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome;
    const hasActiveFeeler =
      activeAgents.some(
        (a) =>
          a.active &&
          a.isFeeler &&
          !a.tapering &&
          ((a.realGenome && a.realGenome.name === evalGenome.name) ||
            (a.parentAgent &&
              a.parentAgent.genome.name === evalGenome.name) ||
            a.genome.name === evalGenome.name),
      ) ||
      newAgents.some(
        (a) =>
          a.active &&
          a.isFeeler &&
          !a.tapering &&
          ((a.realGenome && a.realGenome.name === evalGenome.name) ||
            (a.parentAgent &&
              a.parentAgent.genome.name === evalGenome.name) ||
            a.genome.name === evalGenome.name),
      );
    if (!hasActiveFeeler && Math.random() < 0.05 * engine.timeScale) {
      const feelerGenome = createFeelerGenome(agent);
      newAgents.push({
        position: agent.position.clone(),
        lastPosition: agent.position.clone(),
        direction: agent.direction.clone(),
        genome: feelerGenome,
        active: true,
        age: 0,
        thickness: feelerGenome.thicknessBase,
        cooldown: 0,
        isFeeler: true,
        realGenome: agent.genome,
        parentAgent: agent,
      });
      agent.cooldown = 45;
    }
  }
}

export function updateFeelerSeeking(
  agent: Agent,
  engine: SimulationEngine,
): void {
  // Feelers keep seeking until they mate; once they mate, they die 3 seconds (180 ticks) afterwards
  if (agent.dieAfterTicks !== undefined) {
    agent.dieAfterTicks--;
    if (agent.dieAfterTicks <= 0 && !agent.tapering) {
      agent.tapering = true;
      agent.forceTapering = true;
      agent.fadeAge = 0;
      agent.taperBudget = undefined;
    }
  }
  if (!agent.tapering) {
    // Omniscient seeking: find nearest SEGMENT of any creature of a different strain
    const myStrainName = agent.realGenome
      ? agent.realGenome.name
      : agent.genome.name;
    let nearestPos: THREE.Vector3 | null = null;
    let minDSq = Infinity;
    // Search all live segments for the closest point on any other organism
    for (let sIdx = 0; sIdx < engine.segments.length; sIdx++) {
      const seg = engine.segments[sIdx];
      if (
        !seg ||
        seg.dyingStart ||
        seg.strainName === myStrainName ||
        seg.strainName.startsWith("Feeler-")
      )
        continue;
      const m = seg.matrix.elements;
      const sx = m[12],
        sy = m[13],
        sz = m[14];
      const dx = agent.position.x - sx,
        dy = agent.position.y - sy,
        dz = agent.position.z - sz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDSq) {
        minDSq = dSq;
        nearestPos = new THREE.Vector3(sx, sy, sz);
      }
    }
    if (nearestPos) {
      const homingVector = new THREE.Vector3()
        .subVectors(nearestPos, agent.position)
        .normalize();
      agent.direction.lerp(homingVector, 0.92).normalize();
    }
  }
}

export function handleBreedingAndFeelers(
  agent: Agent,
  i: number,
  activeAgents: Agent[],
  newAgents: Agent[],
  bredThisFrame: Set<Agent>,
  engine: SimulationEngine,
  nonTaperingStrains: Set<string>,
): void {
  const genome = agent.genome;
  const evalGenome =
    agent.isFeeler && agent.realGenome ? agent.realGenome : genome;
  let strainAge = 0;
  if (evalGenome.createdAt !== undefined) {
    strainAge = engine.time - evalGenome.createdAt;
  }

  // Age-dependent feeler emission: Organism extends feelers as it grows until it has bred
  // Limit: only ONE active feeler per creature at a time
  // Limit: only ONE active feeler per species at a time
  const hasActiveFeeler =
    activeAgents.some(
      (a) =>
        a.active &&
        a.isFeeler &&
        !a.tapering &&
        ((a.realGenome && a.realGenome.name === evalGenome.name) ||
          (a.parentAgent && a.parentAgent.genome.name === evalGenome.name) ||
          a.genome.name === evalGenome.name),
    ) ||
    newAgents.some(
      (a) =>
        a.active &&
        a.isFeeler &&
        !a.tapering &&
        ((a.realGenome && a.realGenome.name === evalGenome.name) ||
          (a.parentAgent && a.parentAgent.genome.name === evalGenome.name) ||
          a.genome.name === evalGenome.name),
    );
  if (
    !agent.isFeeler &&
    !agent.hasBred &&
    !agent.tapering &&
    !hasActiveFeeler &&
    (agent.age > 70 || strainAge > 180) &&
    agent.cooldown <= 0
  ) {
    const feelerChance = Math.min(
      0.85,
      (agent.age - 120) * 0.04 * engine.timeScale,
    );
    if (Math.random() < feelerChance) {
      const feelerGenome = createFeelerGenome(agent);

      const spawnDir = agent.direction.clone();
      newAgents.push({
        position: agent.position.clone(),
        lastPosition: agent.position.clone(),
        direction: spawnDir,
        genome: feelerGenome,
        active: true,
        age: 0,
        thickness: feelerGenome.thicknessBase,
        cooldown: 0,
        isFeeler: true,
        realGenome: agent.genome,
        parentAgent: agent,
      });
      agent.cooldown = 45;
      engine.onLog(
        `📡 ${agent.genome.name.split(" ")[0]} extending sensory feelers to breed (Age ${agent.age}).`,
      );
    }
  }

  const isFertile =
    !agent.tapering &&
    !agent.hasBred &&
    agent.cooldown <= 0 &&
    (agent.isFeeler ||
      agent.age > 150 ||
      evalGenome.stability < 0.5 ||
      strainAge > 2000);
  const canBreed =
    isFertile && agent.cooldown <= 0 && !bredThisFrame.has(agent);

  if (canBreed) {
    let bestPartner: any = null;
    let nearestDistSq = Infinity;
    let bestDiffScore = -Infinity;

    for (let j = 0; j < activeAgents.length; j++) {
      if (j === i) continue;

      const partner = activeAgents[j];
      const partnerEvalGenome =
        partner.isFeeler && partner.realGenome
          ? partner.realGenome
          : partner.genome;
      const partnerStrainAge =
        partnerEvalGenome.createdAt !== undefined
          ? engine.time - partnerEvalGenome.createdAt
          : 0;
      const partnerFertile =
        !partner.tapering &&
        !partner.hasBred &&
        partner.cooldown <= 0 &&
        (partner.isFeeler ||
          partner.age > 150 ||
          partnerEvalGenome.stability < 0.5 ||
          partnerStrainAge > 2000);

      if (
        !partnerFertile ||
        partner.cooldown > 0 ||
        bredThisFrame.has(partner)
      )
        continue;

      if (evalGenome.name !== partnerEvalGenome.name) {
        let distSq = agent.position.distanceToSquared(partner.position);
        if (agent.isFeeler || partner.isFeeler) {
          for (let sIdx = 0; sIdx < engine.segments.length; sIdx += 3) {
            const seg = engine.segments[sIdx];
            if (
              seg &&
              !seg.dyingStart &&
              seg.strainName === partnerEvalGenome.name
            ) {
              const m = seg.matrix.elements;
              const d = agent.position.distanceToSquared(
                new THREE.Vector3(m[12], m[13], m[14]),
              );
              if (d < distSq) distSq = d;
            }
          }
        }

        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          bestPartner = partner;
        }
      }
    }

    if (bestPartner) {
      const distSq = nearestDistSq;
      const isDesperate = strainAge > 2000 || agent.age > engine.despairAge;
      const reachMultiplier = isDesperate ? engine.desperation : 1.0;
      const reach =
        engine.proximity *
        engine.proximity *
        reachMultiplier *
        reachMultiplier;

      const towardsPartner = bestPartner.position
        .clone()
        .sub(agent.position)
        .normalize();
      if (agent.isFeeler) {
        agent.direction.copy(towardsPartner);
      } else if (distSq < reach) {
        // If desperate, forcefully reach out; else gently steer
        agent.direction
          .lerp(towardsPartner, isDesperate ? 0.8 : 0.2)
          .normalize();
      }

      if (
        !agent.isFeeler &&
        !hasActiveFeeler &&
        distSq < reach &&
        agent.cooldown <= 0 &&
        Math.random() < 0.2 * reachMultiplier * engine.timeScale
      ) {
        const feelerGenome = createFeelerGenome(agent);

        newAgents.push({
          position: agent.position.clone(),
          lastPosition: agent.position.clone(),
          direction: towardsPartner.clone(),
          genome: feelerGenome,
          active: true,
          age: 0,
          thickness: feelerGenome.thicknessBase,
          cooldown: 0, // Stagger feeler breeding attempts
          isFeeler: true,
          realGenome: agent.genome,
          parentAgent: agent,
        });
        agent.cooldown = 400;
        if (engine.feelerCount < 3) {
          engine.feelerCount++;
          engine.lastFeelerWorldPos = agent.position.clone();
          if (engine.onFeelerEvent) {
            engine.onFeelerEvent({
              parent:
                agent.isFeeler && agent.realGenome
                  ? agent.realGenome
                  : agent.genome,
              feeler: feelerGenome,
              count: engine.feelerCount,
            });
          }
        } // Prevent spamming feelers too fast
        const isSuppressed = !!(
          engine.suppressedStrains &&
          engine.suppressedStrains.has(agent.genome.name)
        );
        if (isDesperate && !isSuppressed) {
          engine.onLog(
            `Aging ${agent.genome.name.split(" ")[0]} seeking hybridization partner.`,
          );
        } else {
          engine.onLog(
            `Suppressed ${agent.genome.name.split(" ")[0]} extended sensory feeler.`,
          );
        }
      }

      // Require physical touching based on agent thicknesses to breed
      const touchDist =
        (agent.thickness + bestPartner.thickness) * 1.5 + 1.0;
      const breedReach = touchDist * touchDist;
      if (engine.allowBreeding && distSq < breedReach) {
        const nearestPartner = bestPartner;
        let allowBreeding = true;
        if (nonTaperingStrains.size >= engine.maxSpecies) {
          let victimSpeciesName = "";

          // 1. Try to find an unrelated feeler to sacrifice first
          for (let idx = 0; idx < activeAgents.length; idx++) {
            const ca = activeAgents[idx];
            if (
              ca.active &&
              !ca.tapering &&
              ca.isFeeler &&
              ca !== agent &&
              ca !== nearestPartner
            ) {
              victimSpeciesName = ca.genome.name;
              break;
            }
          }

          // 2. If no feeler found, eradicate oldest species (whether breeder is a feeler or not)
          if (!victimSpeciesName) {
            let oldestCreatedAt = Infinity;
            for (let idx = 0; idx < activeAgents.length; idx++) {
              const ca = activeAgents[idx];
              if (
                ca.active &&
                !ca.tapering &&
                ca.genome.createdAt !== undefined &&
                !ca.isFeeler
              ) {
                const evalGenomeAgent =
                  agent.isFeeler && agent.realGenome
                    ? agent.realGenome
                    : agent.genome;
                const evalGenomePartner =
                  nearestPartner.isFeeler && nearestPartner.realGenome
                    ? nearestPartner.realGenome
                    : nearestPartner.genome;
                if (
                  ca.genome.name !== evalGenomeAgent.name &&
                  ca.genome.name !== evalGenomePartner.name
                ) {
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
              if (
                activeAgents[idx].genome.name === victimSpeciesName &&
                activeAgents[idx].isFeeler
              ) {
                isFeelerSacrifice = true;
                break;
              }
            }
            if (isFeelerSacrifice) {
              for (let idx = 0; idx < activeAgents.length; idx++) {
                if (activeAgents[idx].genome.name === victimSpeciesName) {
                  activeAgents[idx].tapering = true;
                  activeAgents[idx].forceTapering = true;
                }
              }
            } else {
              engine.killSpecies(victimSpeciesName, "sacrificed for new hybrid birth");
            }
            // Instantly reflect this in the projected count so we don't count the dying species anymore
            if (!isFeelerSacrifice) {
              nonTaperingStrains.delete(victimSpeciesName);
            }

            if (isFeelerSacrifice) {
              engine.onLog(`Feeler terminated for child creation.`);
            } else {
              engine.onLog(
                `Breeding recorded. Culling oldest species: ${victimSpeciesName.split(" ")[0]}.`,
              );
            }
          }
        }

        if (allowBreeding) {
          const childGenome = breedGenomes(
            agent.isFeeler && agent.realGenome
              ? agent.realGenome
              : agent.genome,
            nearestPartner.isFeeler && nearestPartner.realGenome
              ? nearestPartner.realGenome
              : nearestPartner.genome,
            engine.traitProbs,
            engine.multicolorAppProb,
            engine.sameColorAppProb,
            engine.appendageSpawnRate,
            engine.glowProbability,
          );
          childGenome.createdAt = engine.time;
          if (typeof engine.initSpeciesLifecycle === 'function') {
            engine.initSpeciesLifecycle(childGenome.name);
          }
          const childDir = agent.direction
            .clone()
            .lerp(nearestPartner.direction, 0.5)
            .normalize();
          const midPoint = agent.isFeeler
            ? agent.position.clone()
            : nearestPartner.isFeeler
              ? nearestPartner.position.clone()
              : agent.position.clone().lerp(nearestPartner.position, 0.5);

          // Offspring spawn exactly at the midPoint (center of mating artifact) and grow outward
          const spawnPoint = midPoint.clone();

          newAgents.push({
            position: spawnPoint.clone(),
            lastPosition: spawnPoint.clone(),
            direction: childDir,
            genome: childGenome,
            active: true,
            age: 0,
            thickness: childGenome.thicknessBase,
            cooldown: engine.hybridCooldown,
          });

          // Post-Breeding Transition: Once parents breed, mark them as bred so they taper out and die neatly
          engine.hasAnyOrganismBred = true;
          agent.hasBred = true;
          if (canEnterDeleting(engine, activeAgents, 1)) {
            engine.killSpecies(agent.genome.name, "mating completed");
          }
          nearestPartner.hasBred = true;
          const s1 = (engine as any).speciesLifecycleMap?.get(
            agent.genome.name,
          );
          if (s1) {
            s1.hasBred = true;
            s1.matingCount = (s1.matingCount || 0) + 1;
            s1.phase = "MATURE";
          }
          const s2 = (engine as any).speciesLifecycleMap?.get(
            nearestPartner.genome.name,
          );
          if (s2) {
            s2.hasBred = true;
            s2.matingCount = (s2.matingCount || 0) + 1;
            s2.phase = "MATURE";
          }
          if (canEnterDeleting(engine, activeAgents, 1)) {
            engine.killSpecies(nearestPartner.genome.name, "mating completed");
          }

          if (agent.isFeeler && agent.parentAgent) {
            agent.parentAgent.hasBred = true;
          }
          if (nearestPartner.isFeeler && nearestPartner.parentAgent) {
            nearestPartner.parentAgent.hasBred = true;
          }

          // Schedule any active feelers for either parent organism to die 3 seconds (180 ticks) after mating
          const host1 =
            agent.isFeeler && agent.parentAgent ? agent.parentAgent : agent;
          const host2 =
            nearestPartner.isFeeler && nearestPartner.parentAgent
              ? nearestPartner.parentAgent
              : nearestPartner;
          for (const fa of activeAgents) {
            if (
              fa.active &&
              fa.isFeeler &&
              (fa.parentAgent === host1 ||
                fa.parentAgent === host2 ||
                fa.parentAgent === agent ||
                fa.parentAgent === nearestPartner ||
                fa === agent ||
                fa === nearestPartner)
            ) {
              fa.dieAfterTicks = 180;
            }
          }

          engine.spawnHybridArtifact(
            midPoint,
            childGenome.color,
            agent.genome.name,
            nearestPartner.genome.name,
            agent.id,
            nearestPartner.id,
          );
          engine.onLog(
            `💖 Offspring ${childGenome.name.split(" ")[0]} [${childGenome.archetype.toUpperCase()}] spawned from ${agent.genome.name} [${(agent.genome.archetype || "bush").toUpperCase()}] × ${nearestPartner.genome.name} [${(nearestPartner.genome.archetype || "bush").toUpperCase()}]`,
          );

          if (engine.matingCount < 3) {
            engine.matingCount++;
            engine.lastMatingWorldPos = midPoint.clone();
            if (engine.onMatingEvent) {
              engine.onMatingEvent({
                parent1:
                  agent.isFeeler && agent.realGenome
                    ? agent.realGenome
                    : agent.genome,
                parent2:
                  nearestPartner.isFeeler && nearestPartner.realGenome
                    ? nearestPartner.realGenome
                    : nearestPartner.genome,
                child: childGenome,
              });
            }
          }

          agent.cooldown = engine.hybridCooldown;
          nearestPartner.cooldown = engine.hybridCooldown;

          bredThisFrame.add(agent);
          bredThisFrame.add(nearestPartner);

          // Post-mating rapid die-off: Once creatures mate, they immediately taper and dissolve smoothly all at once
          if (engine.postMatingDieoff !== false) {
            agent.matingCount = (agent.matingCount || 0) + 1;
            nearestPartner.matingCount =
              (nearestPartner.matingCount || 0) + 1;

            if (
              agent.matingCount >= 3 &&
              canEnterDeleting(engine, activeAgents, 1)
            ) {
              engine.killSpecies(agent.genome.name, "mating completed 3x");
            }

            if (
              nearestPartner.matingCount >= 3 &&
              canEnterDeleting(engine, activeAgents, 1)
            ) {
              engine.killSpecies(
                nearestPartner.genome.name,
                "mating completed 3x",
              );
            }
          }

          if (agent.isFeeler) {
            agent.tapering = true;
            agent.forceTapering = true;
            agent.fadeAge = agent.fadeAge || 0;
          }
          if (nearestPartner.isFeeler) {
            nearestPartner.tapering = true;
            nearestPartner.forceTapering = true;
            nearestPartner.fadeAge = nearestPartner.fadeAge || 0;
          }
        }
      }
    }
  }
}
