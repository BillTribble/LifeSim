import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { breedGenomes } from "./SimulationGenetics";
import { ensureUniqueStrainName } from "./SimulationGenomeGenerators";
import {
  areStrainsCompatibleForMating,
  getFertilityMinTicks,
  getHybridCooldownTicks,
  getSeekRamp,
  isOutsideMatingNexus,
  isSpeciesOnCooldown,
  recordSpeciesMatingPair,
  setSpeciesCooldown,
} from "./SimulationSeekRamp";
import { isTreeModelAgent } from "./SimulationTreeArchitecture";
import { applyTreeStrainCooldown } from "./SimulationTreeGrowth";

export function canEnterDeleting(
  engine: SimulationEngine,
  activeAgents: Agent[],
  countAsRemoved: number = 1,
): boolean {
  if (!engine.hasAnyOrganismBred) return false;
  const livingOrganisms =
    typeof engine.getLivingOrganismCount === "function"
      ? engine.getLivingOrganismCount()
      : (() => {
          const living = new Set<string>();
          for (let i = 0; i < activeAgents.length; i++) {
            const a = activeAgents[i];
            if (a.active && !a.tapering && !a.isFeeler) {
              living.add(a.genome.name);
            }
          }
          return living.size;
        })();
  const minCreatures = engine.minCreatures ?? 3;
  if (livingOrganisms < minCreatures) return false;
  if (livingOrganisms - countAsRemoved < minCreatures) return false;
  return true;
}

export function resolveRootOrganismGenome(
  agent: Agent,
  engine?: SimulationEngine,
): any {
  if (agent.isFeeler) {
    if (agent.realGenome && !agent.realGenome.name.startsWith("Feeler-")) {
      return agent.realGenome;
    }
    if (agent.parentAgent) {
      return resolveRootOrganismGenome(agent.parentAgent, engine);
    }
    if (engine && engine.genomeMap) {
      for (const [name, g] of engine.genomeMap.entries()) {
        if (
          !name.startsWith("Feeler-") &&
          (name === agent.genome.name || name === agent.realGenome?.name)
        ) {
          return g;
        }
      }
    }
  }
  return agent.genome;
}

/**
 * Builds (and caches per simulation tick) a map of feeler strain names to the name of the
 * root organism that owns them.
 *
 * Feeler segments are written into `engine.segments` using the feeler's own synthetic genome
 * name (`Feeler-1234`), which makes them look like an independent strain. Proximity checks must
 * resolve those back to the owning organism, otherwise an organism can "touch" its own feeler
 * (or a completely unrelated third party's feeler) and register that as contact with a partner
 * that is actually on the other side of the world.
 */
export function buildFeelerOwnerMap(
  engine: SimulationEngine,
  activeAgents?: Agent[],
): Map<string, string> {
  const agentCount = (engine.agents || []).length;
  const cache = (engine as any)._feelerOwnerCache;
  if (cache && cache.time === engine.time && cache.agentCount === agentCount) {
    return cache.map as Map<string, string>;
  }
  const map = new Map<string, string>();
  const pools: Agent[][] = [engine.agents || []];
  if (activeAgents && activeAgents !== engine.agents) pools.push(activeAgents);
  for (const pool of pools) {
    for (let i = 0; i < pool.length; i++) {
      const a = pool[i];
      if (!a || !a.isFeeler) continue;
      const root = resolveRootOrganismGenome(a, engine);
      if (root?.name && root.name !== a.genome.name) {
        map.set(a.genome.name, root.name);
      }
    }
  }
  (engine as any)._feelerOwnerCache = { time: engine.time, agentCount, map };
  return map;
}

/** Resolves a segment strain name to the organism that owns it (feelers map to their parent). */
export function ownerOfStrain(
  strainName: string,
  ownerMap: Map<string, string>,
): string {
  return ownerMap.get(strainName) ?? strainName;
}

export function createFeelerGenome(agent: Agent, engine?: SimulationEngine): any {
  const rootGenome = resolveRootOrganismGenome(agent, engine);
  return {
    ...rootGenome,
    name: `Feeler-${Math.floor(Math.random() * 10000)}`,
    parentStrainName: rootGenome.name,
    _isFeeler: true,
    archetype: rootGenome.archetype, // Preserve parent organism archetype (Bush, Tree, Rhizome). Never snake!
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

export function updateFeelerSeeking(
  agent: Agent,
  engine: SimulationEngine,
): void {
  const rootGenome = resolveRootOrganismGenome(agent, engine);
  const myStrainName = rootGenome.name;

  const minGrowthTicks = getFertilityMinTicks(engine);
  const evalGenome =
    agent.isFeeler && agent.realGenome ? agent.realGenome : rootGenome;
  const strainAge =
    evalGenome.createdAt !== undefined
      ? engine.time - evalGenome.createdAt
      : engine.time;

  if (
    !engine.allowBreeding ||
    strainAge < minGrowthTicks ||
    isSpeciesOnCooldown(engine, myStrainName, evalGenome)
  ) {
    agent.active = false;
    return;
  }

  // Feeler lifecycle: dissolved if parent organism is dying, parent reached max matings, or feeler sought for > 6s (360 ticks)
  const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
  const mCount = (engine as any).speciesLifecycleMap?.get(myStrainName)?.matingCount || 0;
  const isParentDying = !!(engine.dyingStrains && engine.dyingStrains.has(myStrainName));
  const isParentExhausted = mCount >= maxM;
  const isOverFeelerLifetime = agent.age > 360;

  if ((isParentDying || isParentExhausted || isOverFeelerLifetime) && !agent.tapering) {
    // Feelers freeze in place when expired — stop moving, trail stays visible
    agent.active = false;
  }

  // Feelers keep seeking until they mate; once they mate, they die 3 seconds (180 ticks) afterwards
  if (agent.dieAfterTicks !== undefined) {
    agent.dieAfterTicks--;
    if (agent.dieAfterTicks <= 0 && !agent.tapering) {
      agent.active = false;
    }
  }

  if (!agent.tapering && agent.active) {
    const fertileStrains = new Map<string, any>();
    for (let aIdx = 0; aIdx < engine.agents.length; aIdx++) {
      const other = engine.agents[aIdx];
      if (!other.active) continue;
      const otherRoot = resolveRootOrganismGenome(other, engine);
      const otherStrain = otherRoot.name;
      if (otherStrain === myStrainName) continue;
      if (engine.dyingStrains && engine.dyingStrains.has(otherStrain)) continue;
      const otherMCount =
        (engine as any).speciesLifecycleMap?.get(otherStrain)?.matingCount ||
        other.matingCount ||
        0;
      if (otherMCount >= maxM) continue;
      const otherViable =
        !other.tapering || (!other.isFeeler && other.thickness > 0.1 && otherMCount === 0);
      if (!otherViable) continue;
      const otherCreatedAt = otherRoot.createdAt;
      const otherAge =
        otherCreatedAt !== undefined ? engine.time - otherCreatedAt : engine.time;
      if (otherAge < minGrowthTicks) continue;
      if (other.cooldown > 0 || isSpeciesOnCooldown(engine, otherStrain, otherRoot)) continue;
      if (!areStrainsCompatibleForMating(engine, myStrainName, evalGenome, otherStrain, otherRoot)) {
        continue;
      }
      fertileStrains.set(otherStrain, otherRoot);
    }

    if (fertileStrains.size === 0) {
      agent.active = false;
      return;
    }

    let nearestPos: THREE.Vector3 | null = null;
    let minDSq = Infinity;
    const feelerOwnerMap = buildFeelerOwnerMap(engine);
    const segPos = new THREE.Vector3();

    // 1. Search live non-feeler body segments for the closest point on any fertile partner organism
    for (let sIdx = 0; sIdx < engine.segments.length; sIdx++) {
      const seg = engine.segments[sIdx];
      if (!seg || seg.dyingStart || seg.isFeeler || seg.strainName.startsWith("Feeler-")) continue;
      const segOwner = ownerOfStrain(seg.strainName, feelerOwnerMap);
      const partnerRoot = fertileStrains.get(segOwner);
      if (!partnerRoot) continue;

      const m = seg.matrix.elements;
      const sx = m[12],
        sy = m[13],
        sz = m[14];
      segPos.set(sx, sy, sz);
      if (!isOutsideMatingNexus(engine, myStrainName, evalGenome, segOwner, partnerRoot, segPos)) {
        continue;
      }
      const dx = agent.position.x - sx,
        dy = agent.position.y - sy,
        dz = agent.position.z - sz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDSq) {
        minDSq = dSq;
        nearestPos = segPos.clone();
      }
    }

    // 2. Search active agent heads of any fertile partner strain (especially other active feelers)
    for (let aIdx = 0; aIdx < engine.agents.length; aIdx++) {
      const other = engine.agents[aIdx];
      if (!other.active || other === agent || other.tapering) continue;
      const otherRoot = resolveRootOrganismGenome(other, engine);
      if (!fertileStrains.has(otherRoot.name)) continue;
      if (
        !isOutsideMatingNexus(
          engine,
          myStrainName,
          evalGenome,
          otherRoot.name,
          otherRoot,
          other.position,
        )
      ) {
        continue;
      }

      const dSq = agent.position.distanceToSquared(other.position);
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
      agent.direction.copy(homingVector);
    } else {
      agent.active = false;
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
  const strainAge =
    evalGenome.createdAt !== undefined
      ? engine.time - evalGenome.createdAt
      : engine.time;

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

  const minGrowthTicks = getFertilityMinTicks(engine);
  const seekRamp = getSeekRamp(engine, agent, strainAge);
  const speciesCooldownActive = isSpeciesOnCooldown(engine, evalGenome.name, evalGenome);
  const isViableBody =
    !agent.tapering || (!agent.isFeeler && agent.thickness > 0.1 && mCount === 0);
  const isFertile =
    isViableBody &&
    mCount < maxM &&
    !speciesCooldownActive &&
    agent.cooldown <= 0 &&
    strainAge >= minGrowthTicks;
  const canBreed =
    isFertile && !bredThisFrame.has(agent);

  if (canBreed) {
    let bestPartner: any = null;
    let bestPartnerFertile = false;
    let nearestDistSq = Infinity;
    let targetContactPos: THREE.Vector3 | null = null;
    const feelerOwnerMap = buildFeelerOwnerMap(engine, activeAgents);

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
          : engine.time;
      const partnerMCount =
        (engine as any).speciesLifecycleMap?.get(partnerEvalGenome.name)?.matingCount ||
        partner.matingCount ||
        0;
      const partnerSeekRamp = getSeekRamp(engine, partner, partnerStrainAge);
      const partnerViable =
        !partner.tapering || (!partner.isFeeler && partner.thickness > 0.1 && partnerMCount === 0);
      const partnerOnCooldown =
        isSpeciesOnCooldown(engine, partnerEvalGenome.name, partnerEvalGenome) ||
        partner.cooldown > 0;
      const partnerCompatible = areStrainsCompatibleForMating(
        engine,
        evalGenome.name,
        evalGenome,
        partnerEvalGenome.name,
        partnerEvalGenome,
      );
      const partnerSeekable =
        partnerViable &&
        partnerCompatible &&
        partnerMCount < maxM &&
        !bredThisFrame.has(partner);
      if (!partnerSeekable) continue;

      const partnerFertile =
        partnerSeekable &&
        !partnerOnCooldown &&
        partnerSeekRamp > 0 &&
        partnerStrainAge >= minGrowthTicks;

      if (evalGenome.name !== partnerEvalGenome.name) {
        let distSq = Infinity;
        let closestPos: THREE.Vector3 | null = null;

        if (
          isOutsideMatingNexus(
            engine,
            evalGenome.name,
            evalGenome,
            partnerEvalGenome.name,
            partnerEvalGenome,
            partner.position,
          )
        ) {
          distSq = agent.position.distanceToSquared(partner.position);
          closestPos = partner.position.clone();
        }

        const totalSegs = engine.segments.length;
        if (totalSegs > 0) {
          const ax = agent.position.x;
          const ay = agent.position.y;
          const az = agent.position.z;
          const stride = Math.max(1, Math.floor(totalSegs / 250));

          for (let sIdx = 0; sIdx < totalSegs; sIdx += stride) {
            const seg = engine.segments[sIdx];
            if (!seg || seg.dyingStart) continue;
            // Frozen feeler trails must never count as fertile body tissue.
            if (seg.isFeeler || seg.strainName.startsWith("Feeler-")) continue;

            const segOwner = ownerOfStrain(seg.strainName, feelerOwnerMap);
            if (segOwner !== partnerEvalGenome.name || segOwner === evalGenome.name) continue;

            const m = seg.matrix.elements;
            if (
              !isOutsideMatingNexus(
                engine,
                evalGenome.name,
                evalGenome,
                partnerEvalGenome.name,
                partnerEvalGenome,
                { x: m[12], y: m[13], z: m[14] },
              )
            ) {
              continue;
            }
            const dx = ax - m[12];
            const dy = ay - m[13];
            const dz = az - m[14];
            const d = dx * dx + dy * dy + dz * dz;
            if (d < distSq) {
              distSq = d;
              if (!closestPos) closestPos = new THREE.Vector3();
              closestPos.set(m[12], m[13], m[14]);
            }
          }
        }

        if (closestPos && distSq < nearestDistSq) {
          nearestDistSq = distSq;
          bestPartner = partner;
          bestPartnerFertile = partnerFertile;
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
      } else if (distSq < reach && seekRamp > 0) {
        const feelerSimilarity = Math.max(0.0, Math.min(1.0, engine.seekAmount ?? 0.65));
        const baseLerp = isDesperate ? 0.85 : 0.40;
        const effectiveLerp = Math.min(1.0, baseLerp + (1.0 - baseLerp) * feelerSimilarity) * seekRamp;
        if (isTreeModelAgent(agent)) {
          const depth = agent.branchDepth || 0;
          const treeScale = depth === 0 ? 0.15 : 0.35;
          agent.direction.lerp(towardsPartner, effectiveLerp * treeScale).normalize();
        } else {
          agent.direction
            .lerp(towardsPartner, effectiveLerp)
            .normalize();
        }
      }

      const feelerDelayTicks = ((engine as any).feelerDelay ?? 6.0) * 60;
      const feelerProb = (engine as any).feelerProb ?? 0.45;
      const isPastDelay =
        strainAge >= feelerDelayTicks &&
        agent.age >= Math.min(feelerDelayTicks, 60);
      const feelerThrottleTicks = Math.max(360, getHybridCooldownTicks(engine));
      const isThrottled =
        engine.time - ((evalGenome as any).lastFeelerSpawnTime ?? -Infinity) <
        feelerThrottleTicks;
      const canSpawnFeeler =
        engine.allowBreeding &&
        canBreed &&
        bestPartnerFertile &&
        seekRamp > 0 &&
        !agent.isFeeler &&
        !agent.tapering &&
        !hasActiveFeeler &&
        isPastDelay &&
        !isThrottled;

      if (canSpawnFeeler) {
        const baseSpawnChance = isDesperate ? 0.08 * reachMultiplier : 0.025 * feelerProb;
        if ((distSq < reach || isPastDelay) && Math.random() < baseSpawnChance * engine.timeScale) {
          const rootGenome = resolveRootOrganismGenome(agent, engine);
          const feelerGenome = createFeelerGenome(agent, engine);

          newAgents.push({
            position: agent.position.clone(),
            lastPosition: agent.position.clone(),
            direction: towardsPartner.clone(),
            genome: feelerGenome,
            active: true,
            age: 0,
            thickness: feelerGenome.thicknessBase,
            cooldown: 0,
            isFeeler: true,
            realGenome: rootGenome,
            parentAgent: agent,
          });
          (rootGenome as any).lastFeelerSpawnTime = engine.time;
          if (evalGenome && evalGenome !== rootGenome) {
            (evalGenome as any).lastFeelerSpawnTime = engine.time;
          }
          if (engine.feelerCount < 3) {
            engine.feelerCount++;
            engine.lastFeelerWorldPos = agent.position.clone();
            engine.onFeelerEvent?.({ parent: rootGenome, feeler: feelerGenome, count: engine.feelerCount });
          }
          const isSuppressed = !!(engine.suppressedStrains && engine.suppressedStrains.has(rootGenome.name));
          if (isDesperate && !isSuppressed) {
            engine.onLog(`Aging ${rootGenome.name} seeking hybridization partner.`);
          } else if (isSuppressed) {
            engine.onLog(`Suppressed ${rootGenome.name} extended sensory feeler.`);
          } else {
            engine.onLog(`📡 ${rootGenome.name} extending sensory feelers toward ${bestPartner.genome.name} (Age ${agent.age}).`);
          }
        }
      }

      const touchDist = Math.max(0.5, Math.min(agent.thickness, (bestPartner.thickness || 1.0)) * 0.5);
      const breedReach = touchDist * touchDist;
      if (canBreed && bestPartnerFertile && engine.allowBreeding && distSq < breedReach) {
        const nearestPartner = bestPartner;
        let allowBreeding = true;
        if (nonTaperingStrains.size >= engine.maxCreatures) {
          const parentAName = resolveRootOrganismGenome(agent, engine).name;
          const parentBName = resolveRootOrganismGenome(nearestPartner, engine).name;

          let victimSpeciesName = "";
          let oldestCreatedAt = Infinity;
          for (let idx = 0; idx < activeAgents.length; idx++) {
            const ca = activeAgents[idx];
            if (!ca.active || ca.tapering || ca.isFeeler || ca.genome.createdAt === undefined) continue;
            if (engine.dyingStrains && engine.dyingStrains.has(ca.genome.name)) continue;
            if (ca.genome.name === parentAName || ca.genome.name === parentBName) continue;
            if (ca.genome.createdAt < oldestCreatedAt) {
              oldestCreatedAt = ca.genome.createdAt;
              victimSpeciesName = ca.genome.name;
            }
          }

          if (victimSpeciesName) {
            const livingOrganisms = engine.getLivingOrganismCount();
            if (livingOrganisms - 1 >= engine.minCreatures) {
              engine.killSpecies(victimSpeciesName, "sacrificed for new hybrid birth");
              nonTaperingStrains.delete(victimSpeciesName);
              engine.onLog(`Breeding recorded. Culling oldest species: ${victimSpeciesName}.`);
            } else {
              engine.onLog(
                `🛡️ Sacrifice blocked for ${victimSpeciesName}: would drop organisms below minCreatures (${livingOrganisms} - 1 < ${engine.minCreatures}). Breeding blocked to honor maxCreatures.`,
              );
              allowBreeding = false;
            }
          } else {
            engine.onLog(
              `🛡️ No cullable organism available (${nonTaperingStrains.size}/${engine.maxCreatures}). Breeding blocked to honor maxCreatures.`,
            );
            allowBreeding = false;
          }
        }

        if (allowBreeding) {
          const parent1Genome = resolveRootOrganismGenome(agent, engine);
          const parent2Genome = resolveRootOrganismGenome(nearestPartner, engine);

          const childGenome = breedGenomes(
            parent1Genome,
            parent2Genome,
            engine.traitProbs,
            engine.multicolorAppProb,
            engine.sameColorAppProb,
            engine.appendageSpawnRate,
            engine.glowProbability,
          );
          childGenome.createdAt = engine.time;
          childGenome.name = ensureUniqueStrainName(engine, childGenome.name);
          if (typeof engine.initSpeciesLifecycle === "function") {
            engine.initSpeciesLifecycle(childGenome.name);
          }
          nonTaperingStrains.add(childGenome.name);

          // When two parents collide head-on, deflect childDir perpendicular so newborns disperse outward into open space
          const childDir = agent.direction.clone().add(nearestPartner.direction);
          if (childDir.lengthSq() < 0.25 || agent.direction.dot(nearestPartner.direction) < -0.25) {
            const perp = new THREE.Vector3().crossVectors(agent.direction, new THREE.Vector3(0, 1, 0));
            if (perp.lengthSq() < 0.01) {
              perp.crossVectors(agent.direction, new THREE.Vector3(1, 0, 0));
            }
            perp.normalize();
            if (Math.random() < 0.5) perp.negate();
            childDir.copy(perp).add(
              new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.3) * 0.5, (Math.random() - 0.5) * 0.5),
            );
          }
          childDir.normalize();

          const contactPoint = targetContactPos.clone();
          const midPoint = agent.position.clone().lerp(contactPoint, 0.5);
          if (midPoint.distanceToSquared(agent.position) > breedReach) {
            midPoint.copy(agent.position);
          }
          const spawnPoint = midPoint.clone();

          const cd = Math.max(minGrowthTicks, getHybridCooldownTicks(engine));
          const host1Strain = parent1Genome.name;
          const host2Strain = parent2Genome.name;
          (childGenome as any).parentStrains = [host1Strain, host2Strain];
          (childGenome as any).birthOrigin = spawnPoint.clone();

          setSpeciesCooldown(engine, host1Strain, parent1Genome, cd);
          setSpeciesCooldown(engine, host2Strain, parent2Genome, cd);
          setSpeciesCooldown(engine, childGenome.name, childGenome, cd);
          recordSpeciesMatingPair(
            engine,
            host1Strain,
            parent1Genome,
            host2Strain,
            parent2Genome,
            childGenome.name,
            childGenome,
            midPoint,
          );

          newAgents.push({
            position: spawnPoint.clone(),
            lastPosition: spawnPoint.clone(),
            direction: childDir,
            genome: childGenome,
            active: true,
            age: 0,
            thickness: childGenome.thicknessBase,
            cooldown: cd,
          });

          engine.sound?.onSpeciesBorn(childGenome, spawnPoint, engine.camera);
          engine.hasAnyOrganismBred = true;
          const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
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

          const applyStrainState = (list: Agent[]) => {
            for (let j = 0; j < list.length; j++) {
              const a = list[j];
              const aStrain = a.isFeeler && a.realGenome ? a.realGenome.name : a.genome.name;
              if (aStrain === host1Strain) {
                a.cooldown = Math.max(a.cooldown || 0, cd);
                a.matingCount = mCount1;
                if (mCount1 >= maxM) a.hasBred = true;
              } else if (aStrain === host2Strain) {
                a.cooldown = Math.max(a.cooldown || 0, cd);
                a.matingCount = mCount2;
                if (mCount2 >= maxM) a.hasBred = true;
              }
            }
          };
          applyStrainState(activeAgents);
          applyStrainState(newAgents);
          applyTreeStrainCooldown(engine, host1Strain, cd);
          applyTreeStrainCooldown(engine, host2Strain, cd);

          // Freeze all active feelers belonging to either parent strain immediately
          const host1 = agent.isFeeler && agent.parentAgent ? agent.parentAgent : agent;
          const host2 = nearestPartner.isFeeler && nearestPartner.parentAgent ? nearestPartner.parentAgent : nearestPartner;
          for (const fa of activeAgents) {
            if (!fa.active || !fa.isFeeler) continue;
            const faStrain = fa.realGenome?.name || fa.parentAgent?.genome?.name || fa.genome.name;
            if (
              faStrain === host1Strain ||
              faStrain === host2Strain ||
              fa.parentAgent === host1 ||
              fa.parentAgent === host2 ||
              fa === agent ||
              fa === nearestPartner
            ) {
              fa.active = false;
            }
          }

          engine.spawnHybridArtifact(midPoint, childGenome.color, host1Strain, host2Strain, agent.id, nearestPartner.id);
          engine.sound?.onMatingSuccess(midPoint, childGenome, engine.camera);
          engine.totalHybridCount = (engine.totalHybridCount || 0) + 1;
          engine.onLog(
            `💖 Offspring ${childGenome.name} [${childGenome.archetype.toUpperCase()}] spawned from ${host1Strain} × ${host2Strain} (Mating: ${host1Strain}=${mCount1}/${maxM}, ${host2Strain}=${mCount2}/${maxM})`,
          );

          const isFeelerMating = !!(agent.isFeeler || nearestPartner.isFeeler);
          (childGenome as any)._isFeelerMating = isFeelerMating;

          if (engine.matingCount < 3) {
            engine.matingCount++;
            engine.lastMatingWorldPos = midPoint.clone();
            engine.onMatingEvent?.({
              parent1: parent1Genome,
              parent2: parent2Genome,
              child: childGenome,
              isFeeler: isFeelerMating,
            });
          }

          bredThisFrame.add(agent);
          bredThisFrame.add(nearestPartner);

          if (engine.postMatingDieoff !== false) {
            if (mCount1 >= maxM && canEnterDeleting(engine, activeAgents, 1)) {
              engine.killSpecies(host1Strain, `mating completed ${maxM}x`);
            }
            if (mCount2 >= maxM && canEnterDeleting(engine, activeAgents, 1)) {
              engine.killSpecies(host2Strain, `mating completed ${maxM}x`);
            }
          }

          if (agent.isFeeler) agent.active = false;
          if (nearestPartner.isFeeler) nearestPartner.active = false;
        }
      }
    }
  }
}
