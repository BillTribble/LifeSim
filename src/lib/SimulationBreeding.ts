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
    if (
      a.active &&
      !a.tapering &&
      !a.isFeeler &&
      (engine.biomassMap.get(a.genome.name) || 0) > 0 &&
      !(engine.dyingStrains && engine.dyingStrains.has(a.genome.name))
    ) {
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
    stepSize: 1.3,
    wanderIntensity: 0.15,
    bifurcationRate: 0.0001,
    branchTendency: 0,
    wavingAmplitude: 0.15,
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
  const feelerDelayTicks = ((engine as any).feelerDelay ?? 6.0) * 60;
  const evalGenome = agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome;
  let strainAge = 0;
  if (evalGenome.createdAt !== undefined) {
    strainAge = engine.time - evalGenome.createdAt;
  }
  // Disabled during initial feeler delay period (6 seconds / 360 ticks)
  if (agent.age < feelerDelayTicks || strainAge < feelerDelayTicks) {
    return;
  }
  const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
  const mCount = (engine as any).speciesLifecycleMap?.get(evalGenome.name)?.matingCount || agent.matingCount || 0;
  if (mCount < maxM && !agent.isFeeler && !agent.tapering && agent.cooldown <= 0) {
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
    // Omniscient seeking: find nearest segment or live agent of any other strain (including feelers)
    const myStrainName = agent.realGenome
      ? agent.realGenome.name
      : agent.genome.name;
    let nearestPos: THREE.Vector3 | null = null;
    let minDSq = Infinity;

    // 1. Search all live segments for the closest point on any other organism
    for (let sIdx = 0; sIdx < engine.segments.length; sIdx++) {
      const seg = engine.segments[sIdx];
      if (
        !seg ||
        seg.dyingStart ||
        seg.strainName === myStrainName ||
        (agent.realGenome && seg.strainName === agent.genome.name)
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

    // 2. Search active agent heads of any other strain (especially other feelers!)
    for (let aIdx = 0; aIdx < engine.agents.length; aIdx++) {
      const other = engine.agents[aIdx];
      if (!other.active || other === agent || other.tapering) continue;
      const otherStrain = other.realGenome ? other.realGenome.name : other.genome.name;
      if (otherStrain === myStrainName) continue;
      const dSq = agent.position.distanceToSquared(other.position);
      // Give bonus priority to active feelers so two feelers home directly towards each other!
      const effectiveDSq = other.isFeeler ? dSq * 0.5 : dSq;
      if (effectiveDSq < minDSq) {
        minDSq = effectiveDSq;
        nearestPos = other.position.clone();
      }
    }

    if (nearestPos) {
      const homingVector = new THREE.Vector3()
        .subVectors(nearestPos, agent.position)
        .normalize();
      agent.direction.lerp(homingVector, 0.7).normalize();
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
  const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
  const mCount = (engine as any).speciesLifecycleMap?.get(evalGenome.name)?.matingCount || agent.matingCount || 0;

  const feelerProb = (engine as any).feelerProb ?? 0.45;
  const feelerDelayTicks = ((engine as any).feelerDelay ?? 6.0) * 60;
  const isPastDelay = strainAge >= feelerDelayTicks || agent.age >= feelerDelayTicks;
  if (
    !agent.isFeeler &&
    mCount < maxM &&
    !agent.tapering &&
    !hasActiveFeeler &&
    isPastDelay &&
    agent.cooldown <= 0
  ) {
    if (Math.random() < 0.04 * feelerProb * 2.0 * engine.timeScale) {
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
      if (engine.feelerCount < 3) {
        engine.feelerCount++;
        engine.lastFeelerWorldPos = agent.position.clone();
        if (engine.onFeelerEvent) {
          engine.onFeelerEvent({
            parent: agent.genome,
            feeler: feelerGenome,
            count: engine.feelerCount,
          });
        }
      }
      engine.onLog(
        `📡 ${agent.genome.name} extending sensory feelers to breed (Age ${agent.age}).`,
      );
    }
  }

  const isFertile =
    (!agent.tapering || (!agent.isFeeler && agent.thickness > 0.1 && mCount === 0)) &&
    mCount < maxM &&
    agent.cooldown <= 0 &&
    (agent.isFeeler ||
      agent.age > 8 ||
      evalGenome.stability < 0.5 ||
      strainAge > 40);
  const canBreed =
    isFertile && agent.cooldown <= 0 && !bredThisFrame.has(agent);

  if (canBreed) {
    let bestPartner: any = null;
    let nearestDistSq = Infinity;
    let targetContactPos: THREE.Vector3 | null = null;

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
      const partnerMCount =
        (engine as any).speciesLifecycleMap?.get(partnerEvalGenome.name)?.matingCount ||
        partner.matingCount ||
        0;

      // Feelers can mate with any living partner species
      const partnerFertile =
        (!partner.tapering || (!partner.isFeeler && partner.thickness > 0.1 && partnerMCount === 0)) &&
        (agent.isFeeler ||
          (partnerMCount < maxM &&
            partner.cooldown <= 0 &&
            (partner.isFeeler ||
              partner.age > 8 ||
              partnerEvalGenome.stability < 0.5 ||
              partnerStrainAge > 40)));

      if (
        !partnerFertile ||
        bredThisFrame.has(partner)
      )
        continue;

      if (evalGenome.name !== partnerEvalGenome.name) {
        let distSq = agent.position.distanceToSquared(partner.position);
        let closestPos = partner.position.clone();

        const totalSegs = engine.segments.length;
        if (totalSegs > 0) {
          const ax = agent.position.x;
          const ay = agent.position.y;
          const az = agent.position.z;
          // Sample up to 250 segments adaptively to keep frame times under 1ms
          const stride = Math.max(1, Math.floor(totalSegs / 250));

          for (let sIdx = 0; sIdx < totalSegs; sIdx += stride) {
            const seg = engine.segments[sIdx];
            if (
              seg &&
              !seg.dyingStart &&
              (seg.strainName === partnerEvalGenome.name ||
                (partner.isFeeler && seg.strainName === partner.genome.name) ||
                (seg.strainName.startsWith("Feeler-") && seg.strainName !== agent.genome.name))
            ) {
              const m = seg.matrix.elements;
              const dx = ax - m[12];
              const dy = ay - m[13];
              const dz = az - m[14];
              const d = dx * dx + dy * dy + dz * dz;
              if (d < distSq) {
                distSq = d;
                closestPos.set(m[12], m[13], m[14]);
              }
            }
          }
        }

        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          bestPartner = partner;
          targetContactPos = closestPos;
        }
      }
    }

    if (bestPartner && targetContactPos) {
      const distSq = nearestDistSq;
      const isDesperate = strainAge > 1500 || agent.age > engine.despairAge;
      const reachMultiplier = isDesperate ? engine.desperation : 1.0;
      const reach =
        engine.proximity *
        engine.proximity *
        reachMultiplier *
        reachMultiplier;

      const towardsPartner = targetContactPos
        .clone()
        .sub(agent.position)
        .normalize();
      if (agent.isFeeler) {
        agent.direction.copy(towardsPartner);
      } else if (distSq < reach) {
        // Blend between standard creature steering and feeler-like direct copy based on engine.seekAmount
        const feelerSimilarity = Math.max(0.0, Math.min(1.0, engine.seekAmount ?? 0.65));
        const baseLerp = isDesperate ? 0.85 : 0.40;
        const effectiveLerp = Math.min(1.0, baseLerp + (1.0 - baseLerp) * feelerSimilarity);
        agent.direction
          .lerp(towardsPartner, effectiveLerp)
          .normalize();
      }

      const feelerDelayTicks = ((engine as any).feelerDelay ?? 6.0) * 60;
      if (
        isDesperate &&
        !agent.isFeeler &&
        !hasActiveFeeler &&
        agent.age >= feelerDelayTicks &&
        strainAge >= feelerDelayTicks &&
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
            `Aging ${agent.genome.name} seeking hybridization partner.`,
          );
        } else {
          engine.onLog(
            `Suppressed ${agent.genome.name} extended sensory feeler.`,
          );
        }
      }

      // Require physical touching based on agent thicknesses to breed
      const touchDist = Math.max(16.0, (agent.thickness + (bestPartner.thickness || 1.0)) * 3.2 + 5.0);
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
                if (
                  activeAgents[idx].genome.name === victimSpeciesName &&
                  activeAgents[idx].isFeeler
                ) {
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
                `Breeding recorded. Culling oldest species: ${victimSpeciesName}.`,
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

          // Post-Breeding Transition: Synchronize species-level mating counts and cooldowns
          engine.hasAnyOrganismBred = true;
          const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
          const host1Strain = agent.isFeeler && agent.realGenome ? agent.realGenome.name : agent.genome.name;
          const host2Strain = nearestPartner.isFeeler && nearestPartner.realGenome ? nearestPartner.realGenome.name : nearestPartner.genome.name;

          const s1 = (engine as any).speciesLifecycleMap?.get(host1Strain);
          const s2 = (engine as any).speciesLifecycleMap?.get(host2Strain);

          if (s1) {
            s1.matingCount = (s1.matingCount || 0) + 1;
            if (s1.matingCount >= maxM) {
              s1.hasBred = true;
              s1.phase = "MATURE";
            }
          }
          if (s2) {
            s2.matingCount = (s2.matingCount || 0) + 1;
            if (s2.matingCount >= maxM) {
              s2.hasBred = true;
              s2.phase = "MATURE";
            }
          }

          const mCount1 = s1?.matingCount || (agent.matingCount || 0) + 1;
          const mCount2 = s2?.matingCount || (nearestPartner.matingCount || 0) + 1;

          // Apply cooldown to ALL active agents and feelers of both parent strains to prevent duplicate rapid collisions
          const cd = engine.hybridCooldown || 340;
          for (let j = 0; j < activeAgents.length; j++) {
            const a = activeAgents[j];
            const aStrain = a.isFeeler && a.realGenome ? a.realGenome.name : a.genome.name;
            if (aStrain === host1Strain) {
              a.cooldown = Math.max(a.cooldown, cd);
              a.matingCount = mCount1;
              if (mCount1 >= maxM) {
                a.hasBred = true;
              }
            } else if (aStrain === host2Strain) {
              a.cooldown = Math.max(a.cooldown, cd);
              a.matingCount = mCount2;
              if (mCount2 >= maxM) {
                a.hasBred = true;
              }
            }
          }

          // Schedule active feelers that participated in mating to dissolve smoothly
          const host1 = agent.isFeeler && agent.parentAgent ? agent.parentAgent : agent;
          const host2 = nearestPartner.isFeeler && nearestPartner.parentAgent ? nearestPartner.parentAgent : nearestPartner;
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
            host1Strain,
            host2Strain,
            agent.id,
            nearestPartner.id,
          );
          engine.totalHybridCount = (engine.totalHybridCount || 0) + 1;
          engine.onLog(
            `💖 Offspring ${childGenome.name} [${childGenome.archetype.toUpperCase()}] spawned from ${host1Strain} × ${host2Strain} (Mating: ${host1Strain}=${mCount1}/${maxM}, ${host2Strain}=${mCount2}/${maxM})`,
          );

          const isFeelerMating = !!(agent.isFeeler || nearestPartner.isFeeler);
          (childGenome as any)._isFeelerMating = isFeelerMating;

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
                isFeeler: isFeelerMating,
              });
            }
          }

          bredThisFrame.add(agent);
          bredThisFrame.add(nearestPartner);

          // Post-mating die-off ONLY when species has reached maxMatings limit
          if (engine.postMatingDieoff !== false) {
            if (
              mCount1 >= maxM &&
              canEnterDeleting(engine, activeAgents, 1)
            ) {
              engine.killSpecies(host1Strain, `mating completed ${maxM}x`);
            }

            if (
              mCount2 >= maxM &&
              canEnterDeleting(engine, activeAgents, 1)
            ) {
              engine.killSpecies(
                host2Strain,
                `mating completed ${maxM}x`,
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
