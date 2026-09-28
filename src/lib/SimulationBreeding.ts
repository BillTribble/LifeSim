import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { breedGenomes } from "./SimulationGenetics";
import { ensureUniqueStrainName } from "./SimulationGenomeGenerators";
import {
  getFertilityMinTicks,
  getHybridCooldownTicks,
  getPostMatingCooldownTicks,
  getSeekRadius,
  getSeekRamp,
  isBirthThrottled,
  isOrganismDesperate,
  isSpeciesOnCooldown,
  recordBirth,
  recordSpeciesMatingPair,
  setSpeciesCooldown,
} from "./SimulationSeekRamp";
import { isTreeModelAgent } from "./SimulationTreeArchitecture";
import { applyTreeStrainCooldown } from "./SimulationTreeGrowth";
import {
  endFeeler,
  getFeelerMaxReach,
  resolveRootOrganismGenome,
  spawnFeeler,
} from "./SimulationFeelers";
import { findNearestPartner, isOrganismMature } from "./SimulationPartnerSearch";
import { clampInsideBounds } from "./SimulationBoundary";

/** Max per-step lean of a tip toward a partner (seekAmount maps into 0.03..0.10). */
const SEEK_LERP_MAX = 0.1;
/** A tip must have grown this many steps before it can emit a feeler. */
const FEELER_MIN_TIP_AGE_STEPS = 20;
import { canEnterDeleting, isNextCullVictim, selectCullVictim } from "./SimulationCulling";
export { canEnterDeleting } from "./SimulationCulling";

// Feeler helpers moved to SimulationFeelers.ts; re-exported for existing importers.
export {
  buildFeelerOwnerMap,
  createFeelerGenome,
  ownerOfStrain,
  resolveRootOrganismGenome,
  updateFeelerSeeking,
} from "./SimulationFeelers";

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
    strainAge >= minGrowthTicks &&
    // Fertility requires growth (steps + tissue), not just engine ticks (plan 3.2)
    isOrganismMature(engine, evalGenome);
  const canBreed =
    isFertile && !bredThisFrame.has(agent);

  if (canBreed) {
    const found = findNearestPartner(engine, agent, i, activeAgents, bredThisFrame, evalGenome, maxM);
    const bestPartner: any = found.bestPartner;
    const bestPartnerFertile = found.bestPartnerFertile;
    const nearestDistSq = found.nearestDistSq;
    const targetContactPos = found.targetContactPos;

    if (bestPartner && targetContactPos) {
      const distSq = nearestDistSq;
      const isDesperate = isOrganismDesperate(engine, evalGenome, agent.age);
      const reachMultiplier = isDesperate ? engine.desperation : 1.0;
      // Seek radius is bounded (0.4 x world radius, 0.9 x when desperate) whatever the proximity dial says
      const seekRadius = getSeekRadius(engine, isDesperate);
      const reach = seekRadius * seekRadius;

      const towardsPartner = targetContactPos
        .clone()
        .sub(agent.position)
        .normalize();
      if (agent.isFeeler) {
        // Feeler steering is owned by updateFeelerSeeking (organic lerp toward its locked target)
      } else if (distSq < reach && seekRamp > 0 && bestPartnerFertile && (agent.branchDepth || 0) >= (isDesperate ? 1 : 2)) {
        // Gentle lean of outer tips only, toward fertile partners only (was 0.79-0.95 on every tip)
        const seekAmt = Math.max(0.0, Math.min(1.0, engine.seekAmount ?? 0.65));
        const effectiveLerp = Math.min(SEEK_LERP_MAX, (isDesperate ? 0.05 : 0.03) + 0.07 * seekAmt) * seekRamp;
        if (isTreeModelAgent(agent)) {
          const depth = agent.branchDepth || 0;
          const treeScale = agent.isSeekerTwig ? 0.95 : depth === 0 ? 0.15 : 0.55;
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
        agent.age >= FEELER_MIN_TIP_AGE_STEPS; // agent.age is in growth steps, not ticks
      const feelerThrottleTicks = Math.max(360, getHybridCooldownTicks(engine));
      const isThrottled =
        engine.time - ((evalGenome as any).lastFeelerSpawnTime ?? -Infinity) <
        feelerThrottleTicks;
      const feelerReach = getFeelerMaxReach(engine, evalGenome);
      const canSpawnFeeler =
        engine.allowBreeding &&
        canBreed &&
        bestPartnerFertile &&
        !bestPartner.isFeeler &&
        seekRamp > 0 &&
        !agent.isFeeler &&
        !agent.tapering &&
        !hasActiveFeeler &&
        isPastDelay &&
        !isThrottled &&
        // Don't emit a feeler that is doomed from the start (its organism is the next cull victim)
        !isNextCullVictim(engine, activeAgents, nonTaperingStrains, evalGenome.name);
      if (canSpawnFeeler) {
        const baseSpawnChance = isDesperate
          ? Math.max(0.08 * reachMultiplier, 0.025 * feelerProb)
          : 0.025 * feelerProb;
        // Roll runs once per growth step, which already scales with timeScale (no extra factor)
        if (distSq < feelerReach * feelerReach && isPastDelay && Math.random() < baseSpawnChance) {
          spawnFeeler(
            engine,
            agent,
            towardsPartner,
            bestPartner.genome.name,
            Math.sqrt(distSq),
            evalGenome,
            newAgents,
            isDesperate,
          );
        }
      }

      const touchDist = Math.max(0.5, Math.min(agent.thickness, (bestPartner.thickness || 1.0)) * 0.5);
      const breedReach = touchDist * touchDist;
      // Global birth throttle (plan 3.3), checked before any cull so a blocked birth kills nobody.
      // Counted, not logged: one line per blocked contact would flood the log.
      const throttled = isBirthThrottled(engine);
      if (throttled && canBreed && bestPartnerFertile && distSq < breedReach) {
        (engine as any).throttledBirths = ((engine as any).throttledBirths || 0) + 1;
      }
      if (canBreed && bestPartnerFertile && engine.allowBreeding && distSq < breedReach && !throttled) {
        const nearestPartner = bestPartner;
        let allowBreeding = true;
        if (nonTaperingStrains.size >= engine.maxCreatures) {
          const parentAName = resolveRootOrganismGenome(agent, engine).name;
          const parentBName = resolveRootOrganismGenome(nearestPartner, engine).name;

          const victimSpeciesName = selectCullVictim(engine, activeAgents, new Set([parentAName, parentBName]));

          if (victimSpeciesName) {
            const livingOrganisms = engine.getLivingOrganismCount();
            if (livingOrganisms - 1 >= engine.minCreatures) {
              engine.killSpecies(victimSpeciesName, "sacrificed for new hybrid birth");
              nonTaperingStrains.delete(victimSpeciesName);
              engine.onLog(`Breeding recorded. Culling oldest species: ${victimSpeciesName}. (policy=preferBredSmallest)`);
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
          recordBirth(engine);
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
          // Seed dispersal: newborns start 10-20 units away along childDir, clamped inside the world
          const spawnPoint = clampInsideBounds(
            engine,
            midPoint.clone().addScaledVector(childDir, 10 + Math.random() * 10),
          );

          const cd = Math.max(
            minGrowthTicks,
            getPostMatingCooldownTicks(engine, parent1Genome),
            getPostMatingCooldownTicks(engine, parent2Genome),
          );
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

          // Freeze all active feelers belonging to either parent strain immediately (stop growing, do not vanish)
          const host1 = agent.isFeeler && agent.parentAgent ? agent.parentAgent : agent;
          const host2 = nearestPartner.isFeeler && nearestPartner.parentAgent ? nearestPartner.parentAgent : nearestPartner;
          for (const list of [activeAgents, newAgents]) {
            for (const fa of list) {
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
                endFeeler(engine, fa, "mated", {
                  dissolve: false,
                  detail: fa === agent || fa === nearestPartner ? "self" : "organism",
                });
              }
            }
          }

          engine.spawnHybridArtifact(midPoint, childGenome.color, host1Strain, host2Strain, agent.id, nearestPartner.id, childGenome.name);
          engine.sound?.onMatingSuccess(midPoint, childGenome, engine.camera);
          engine.totalHybridCount = (engine.totalHybridCount || 0) + 1;
          const isFeelerMating = !!(agent.isFeeler || nearestPartner.isFeeler);
          engine.onLog(
            `💖 Offspring ${childGenome.name} [${childGenome.archetype.toUpperCase()}] spawned from ${host1Strain} × ${host2Strain} (Mating: ${host1Strain}=${mCount1}/${maxM}, ${host2Strain}=${mCount2}/${maxM}) via=${isFeelerMating ? "feeler" : "body"}`,
          );

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

          if (agent.isFeeler) endFeeler(engine, agent, "mated", { dissolve: false, detail: "self" });
          if (nearestPartner.isFeeler) endFeeler(engine, nearestPartner, "mated", { dissolve: false, detail: "self" });
        }
      }
    }
  }
}
