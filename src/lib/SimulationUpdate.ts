import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome, Agent, MAX_POINTS, BOUNDARY } from "./SimulationTypes";
import { mutateGenome, breedGenomes } from "./SimulationGenetics";
import { processAgents } from "./SimulationUpdateAgents";

export function updateSimulation(engine: SimulationEngine) {
  engine.time++;
  if (engine.controls) {
    engine.controls.update();
  }

  if (engine.lastMaxDOMs !== undefined && engine.lastMaxDOMs > engine.maxDOMs) {
    engine.lastMaxDOMs = engine.maxDOMs;
  }

  const baseCycle = 2400;
  const adjustedCycle = baseCycle / (engine.tideSpeed || 0.01);
  const cycleProgress = (engine.time % adjustedCycle) / adjustedCycle;

  let pulseOffset = -BOUNDARY - 300;

  if (cycleProgress > 0.95) {
    const pulseProgress = (cycleProgress - 0.95) / 0.05;
    engine.tideValue = Math.sin(pulseProgress * Math.PI);
    engine.tideValue = Math.pow(engine.tideValue, 1.2);
    pulseOffset = -BOUNDARY - 100 + pulseProgress * (BOUNDARY * 2 + 200);
  } else {
    engine.tideValue = 0;
  }

  if (engine.tideMesh) {
    const mat = engine.tideMesh.material as THREE.ShaderMaterial;
    mat.uniforms.tideValue.value = engine.tideValue;
    mat.uniforms.pulseOffset.value = pulseOffset;
    mat.uniforms.time.value = engine.time * 0.01;
    mat.uniforms.colorTop.value.set(engine.tideColor);
    mat.uniforms.colorBottom.value.set(engine.tideColor);
    mat.uniforms.thickness.value = engine.tideThickness;
    mat.uniforms.tideOpacity.value = engine.tideOpacity;
    mat.uniforms.tideSaturation.value = engine.tideSaturation;
    engine.tideMesh.position.y = pulseOffset;
    engine.tideMesh.visible = engine.tideValue > 0.01;
  }

  let appendagesChanged = false;
  if (engine.lastFlowerSize !== engine.flowerSize) {
    appendagesChanged = true;
    engine.lastFlowerSize = engine.flowerSize;
  }
  if (engine.lastHybridSize !== engine.hybridSize) {
    appendagesChanged = true;
    engine.lastHybridSize = engine.hybridSize;
  }

  const growthDuration = 40;

  const uniqueGenomes = new Map<string, Genome>();
  engine.agents.forEach((a) => {
    if (a.active) uniqueGenomes.set(a.genome.name, a.genome);
  });

  const pulsingGenomes = Array.from(uniqueGenomes.values()).filter(
    (g) => g.pulseTarget !== "none",
  );

  const updateMeshGrowth = (mesh: THREE.InstancedMesh, segments: any[]) => {
    let changed = false;
    const isHybrid = engine.hybridMeshes.includes(mesh);
    const hybridVariantId = isHybrid ? engine.hybridMeshes.indexOf(mesh) : -1;

    for (let i = 0; i < (mesh.count || 0); i++) {
      const seg = segments[i];
      if (seg) {
        if (isHybrid && seg.variant !== hybridVariantId) {
          engine.dummy.matrix.makeScale(0, 0, 0);
          mesh.setMatrixAt(i, engine.dummy.matrix);
          changed = true;
          continue;
        }

        const age = engine.time - seg.timestamp;
        const genome = uniqueGenomes.get(seg.strainName);

        let sizePulseEffect = 1.0;
        let colorPulseEffect = 1.0;

        if (isHybrid) {
          if (age < 300) {
            const phase = Math.sin(
              age * 0.05 * (engine.globalPulseSpeed || 1.0),
            );
            const intensity = 1.0 - Math.pow(age / 300, 2);
            sizePulseEffect = 1.0 + phase * 0.5 * intensity;
            colorPulseEffect = sizePulseEffect;
          }
        } else if (genome && genome.pulseTarget !== "none") {
          const isStem = mesh === engine.cylinderMesh;
          const tp = genome.pulseTarget;
          const match =
            tp === "all" ||
            (isStem && tp === "stem") ||
            (!isStem && tp === "appendage");

          if (match) {
            const pulseVal = Math.sin(
                engine.time *
                  genome.pulseSpeed *
                  (engine.globalPulseSpeed || 1.0),
              );
              
            colorPulseEffect = 1.0 + pulseVal * 0.4;
            
            if (isStem) {
                sizePulseEffect = 1.0 + pulseVal * 0.4;
            }
          }
        }

        if (
          age <= growthDuration ||
          appendagesChanged ||
          sizePulseEffect !== 1.0 ||
          colorPulseEffect !== 1.0 ||
          isHybrid
        ) {
          const growth = age <= growthDuration ? age / growthDuration : 1.0;
          engine.dummy.matrix.copy(seg.matrix);
          engine.dummy.matrix.decompose(
            engine.dummy.position,
            engine.dummy.quaternion,
            engine.dummy.scale,
          );

          if (isHybrid) {
            const slowRot = age * 0.005;
            engine.dummy.quaternion.multiply(
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler(slowRot, slowRot * 1.1, slowRot * 0.8),
              ),
            );
          }

          const sizeMult =
            mesh === engine.cylinderMesh
              ? 1.0
              : isHybrid
                ? engine.hybridSize || 2.0
                : engine.flowerSize;
          engine.dummy.scale.multiplyScalar(growth * sizeMult * sizePulseEffect);
          engine.dummy.updateMatrix();
          mesh.setMatrixAt(i, engine.dummy.matrix);

          if (
            colorPulseEffect !== 1.0 &&
            genome &&
            mesh.instanceColor &&
            !isHybrid
          ) {
            const c = genome.color.clone().multiplyScalar(colorPulseEffect);
            mesh.setColorAt(i, c);
          }
          changed = true;
        }
      }
    }
    if (changed) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };

  for (const app of engine.appendages.values()) {
    updateMeshGrowth(app.mesh, app.segments);
  }
  for (const mesh of engine.hybridMeshes) {
    updateMeshGrowth(mesh, engine.hybridSegments);
  }

  if (
    pulsingGenomes.some(
      (g) => g.pulseTarget === "stem" || g.pulseTarget === "all",
    )
  ) {
    const activeRange = Math.min(engine.pointCount, MAX_POINTS);
    for (let i = Math.max(0, activeRange - 20000); i < activeRange; i++) {
      const seg = engine.segments[i];
      if (seg) {
        const genome = uniqueGenomes.get(seg.strainName);
        if (
          genome &&
          (genome.pulseTarget === "stem" || genome.pulseTarget === "all")
        ) {
          const pulseEffect =
            1.0 +
            Math.sin(
              engine.time *
                genome.pulseSpeed *
                (engine.globalPulseSpeed || 1.0),
            ) *
              0.4;
          const c = genome.color.clone().multiplyScalar(pulseEffect);
          engine.cylinderMesh.setColorAt(i, c);
        }
      }
    }
    engine.cylinderMesh.instanceColor!.needsUpdate = true;
  }

  const speedFactor = engine.growthSpeed < 1.0 ? Math.pow(engine.growthSpeed, 2) : engine.growthSpeed;
  const effectiveDieback = (engine.diebackRate / 100.0) * speedFactor;

  if (effectiveDieback > 0.000001 || (engine.dyingStrains && engine.dyingStrains.size > 0)) {
    const batchSize = Math.floor(engine.maxDOMs / 20); // Full sweep every ~20 frames
    const sweepStart = (engine.time * batchSize) % engine.maxDOMs;

    for (let i = 0; i < batchSize; i++) {
      const idx = (sweepStart + i) % engine.maxDOMs;
      const seg = engine.segments[idx];
      if (seg && !engine.dyingStems.has(idx)) {
        const age = engine.time - seg.timestamp;
        const bias = engine.diebackAgeBias || 1.0;
        const isDyingStrain = engine.dyingStrains && engine.dyingStrains.has(seg.strainName);
        let prob = Math.min(
          1.0,
          Math.pow(age / 500, bias) * Math.max(0.000001, effectiveDieback) * 0.5, // 10x higher probability but smaller chunks
        );
        if (isDyingStrain) {
          prob = Math.min(1.0, Math.pow(age / 100, bias) * (engine.cullRate * 0.16)); // Much higher probability, focusing on oldest parts
        }
        if (Math.random() < prob) {
          const chunkSize = Math.max(1, Math.random() * Math.min(20, effectiveDieback * 5)); // Smaller, more uniform chunks
          for (let j = 0; j < chunkSize; j++) {
            const chunkIdx = (idx + j) % engine.maxDOMs;
            const cSeg = engine.segments[chunkIdx];
            if (cSeg && !engine.dyingStems.has(chunkIdx)) {
              const cAge = engine.time - cSeg.timestamp;
              if (cAge > 60) {
                engine.markDying(engine.segments, engine.dyingStems, chunkIdx);
              }
            }
          }
        }
      }
    }

    for (const app of engine.appendages.values()) {
      const appLim = Math.floor(engine.maxDOMs / 4);
      if (appLim > 0) {
        const appBatchSize = Math.floor(appLim / 20); // Faster sweep for appendages since they just check parents
        const appSweepStart = (engine.time * appBatchSize) % appLim;
        for (let i = 0; i < appBatchSize; i++) {
          const idx = (appSweepStart + i) % appLim;
          const seg = app.segments[idx];
          if (seg && !app.dyingSet.has(idx)) {
            const parentSeg = engine.segments[seg.parentIndex];
            const parentDead =
              !parentSeg ||
              parentSeg.timestamp !== seg.parentTimestamp ||
              engine.dyingStems.has(seg.parentIndex);
            if (parentDead) {
              engine.markDying(app.segments, app.dyingSet, idx);
            }
          }
        }
      }
    }

    const sweepDist = 50 + Math.floor(engine.growthSpeed * 10);
    const overwriteHead = engine.pointCount % engine.maxDOMs;
    for (let j = 0; j < sweepDist; j++) {
      const idx = (overwriteHead + j) % engine.maxDOMs;
      if (engine.segments[idx] && !engine.dyingStems.has(idx)) {
        if (engine.time - engine.segments[idx].timestamp > 100) {
          engine.markDying(engine.segments, engine.dyingStems, idx);
        }
      }
    }
  }

  engine.processDying(engine.segments, engine.dyingStems, engine.cylinderMesh);
  for (const app of engine.appendages.values()) {
    engine.processDying(app.segments, app.dyingSet, app.mesh, true);

    if (effectiveDieback > 0.000001 || (engine.dyingStrains && engine.dyingStrains.size > 0)) {
      const sweepDist = 50 + Math.floor(engine.growthSpeed * 10);
      const appLimit = Math.floor(engine.maxDOMs / 4);
      if (appLimit > 0) {
        const appHead = app.count % appLimit;
        for (let j = 0; j < sweepDist; j++) {
          const idx = (appHead + j) % appLimit;
          if (app.segments[idx] && !app.dyingSet.has(idx)) {
            if (engine.time - app.segments[idx].timestamp > 100) {
              engine.markDying(app.segments, app.dyingSet, idx);
            }
          }
        }
      }
    }
  }

  for (const mesh of engine.hybridMeshes) {
    engine.processDying(engine.hybridSegments, engine.dyingHybrids, mesh);
  }

  if (engine.hybridConnectionMesh) {
    const positions: number[] = [];
    const activeHybrids: { pos: THREE.Vector3; time: number }[] = [];
    for (let i = 0; i < 2000; i++) {
      const seg = engine.hybridSegments[i];
      if (seg && !engine.dyingHybrids.has(seg.index)) {
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(seg.matrix);
        activeHybrids.push({ pos, time: seg.timestamp });
      }
    }

    activeHybrids.sort((a, b) => a.time - b.time);

    for (let i = 0; i < activeHybrids.length - 1; i++) {
      positions.push(
        activeHybrids[i].pos.x,
        activeHybrids[i].pos.y,
        activeHybrids[i].pos.z,
      );
      positions.push(
        activeHybrids[i + 1].pos.x,
        activeHybrids[i + 1].pos.y,
        activeHybrids[i + 1].pos.z,
      );
    }

    const posAttr = engine.hybridConnectionMesh.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    if (positions.length > posAttr.array.length) {
      engine.hybridConnectionMesh.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(positions.length * 2), 3),
      );
    }

    const newArray = engine.hybridConnectionMesh.geometry.getAttribute(
      "position",
    ).array as Float32Array;
    newArray.set(positions);
    for (let k = positions.length; k < newArray.length; k++) {
      newArray[k] = 0;
    }

    engine.hybridConnectionMesh.geometry.setDrawRange(0, positions.length / 3);
    engine.hybridConnectionMesh.geometry.getAttribute("position").needsUpdate =
      true;
  }

  if (effectiveDieback > 0.000001 || (engine.dyingStrains && engine.dyingStrains.size > 0)) {
    const batchSize = 100;
    const sweepStart = (engine.time * batchSize) % 2000;
    for (let i = 0; i < batchSize; i++) {
      const idx = (sweepStart + i) % 2000;
      const seg = engine.hybridSegments[idx];
      if (seg && !engine.dyingHybrids.has(idx)) {
        const age = engine.time - seg.timestamp;
        const deathProb = Math.min(
          1.0,
          Math.pow(age / 5000, engine.diebackAgeBias) * Math.max(0.000001, effectiveDieback) * 0.05,
        );
        if (Math.random() < deathProb) {
          engine.markDying(engine.hybridSegments, engine.dyingHybrids, idx);
        }
      }
    }
  }

  const activeAgents: Agent[] = [];
  for (let i = 0; i < engine.agents.length; i++) {
    if (engine.agents[i].active) {
      activeAgents.push(engine.agents[i]);
    }
  }
  engine.agents = activeAgents;

  if (engine.time % 120 === 0) {
    let totalBiomass = 0;
    engine.biomassMap.forEach((v) => (totalBiomass += v));

    if (totalBiomass > 1000) {
      engine.biomassMap.forEach((biomass, strainName) => {
        const ratio = biomass / totalBiomass;
        const isDying = engine.dyingStrains && engine.dyingStrains.has(strainName);

        if (isDying && ratio < 0.05) {
          engine.biomassMap.delete(strainName);
          engine.dyingStrains.delete(strainName);
          if (engine.speciesAbove5Percent) engine.speciesAbove5Percent.delete(strainName);
          if (engine.suppressedStrains) engine.suppressedStrains.delete(strainName);
          
          for (let i = 0; i < engine.maxDOMs; i++) {
            if (engine.segments[i] && engine.segments[i].strainName === strainName) {
              engine.dummy.matrix.makeScale(0, 0, 0);
              engine.cylinderMesh.setMatrixAt(i, engine.dummy.matrix);
              engine.segments[i] = undefined as any;
            }
          }
          engine.cylinderMesh.instanceMatrix.needsUpdate = true;
          
          for (const app of engine.appendages.values()) {
            const lim = Math.floor(engine.maxDOMs / 4);
            for (let i = 0; i < lim; i++) {
              if (app.segments[i] && app.segments[i].strainName === strainName) {
                engine.dummy.matrix.makeScale(0, 0, 0);
                app.mesh.setMatrixAt(i, engine.dummy.matrix);
                app.segments[i] = undefined as any;
              }
            }
            app.mesh.instanceMatrix.needsUpdate = true;
          }
          
          for (let i = 0; i < activeAgents.length; i++) {
            if (activeAgents[i].genome.name === strainName) {
              activeAgents[i].active = false;
            }
          }
          engine.onLog(`Species ${strainName.split(' ')[0]} was fully eradicated.`);
          return;
        }

        if (!engine.suppressedStrains) engine.suppressedStrains = new Set();
        if (!engine.speciesAbove5Percent) engine.speciesAbove5Percent = new Set();
        
        if (ratio > 0.05) {
          engine.speciesAbove5Percent.add(strainName);
        } else if (ratio < 0.05 && engine.speciesAbove5Percent.has(strainName)) {
          engine.speciesAbove5Percent.delete(strainName);
          for (let i = 0; i < activeAgents.length; i++) {
            if (activeAgents[i].genome.name === strainName) {
              activeAgents[i].tapering = true;
              activeAgents[i].forceTapering = true;
            }
          }
          if (!engine.dyingStrains) engine.dyingStrains = new Set();
          engine.dyingStrains.add(strainName);
          engine.onLog(`Species ${strainName} dropped below 5% and was culled to make space.`);
        }

        const justSuppressed = ratio > engine.entropyThreshold && !engine.suppressedStrains.has(strainName);
        
        if (ratio > engine.entropyThreshold) {
          engine.suppressedStrains.add(strainName);
        } else if (ratio < 0.5) {
          engine.suppressedStrains.delete(strainName);
        }

        if (engine.suppressedStrains.has(strainName)) {
          const dominantAgents: Agent[] = [];
          for (let i = 0; i < activeAgents.length; i++) {
            if (activeAgents[i].genome.name === strainName) {
              dominantAgents.push(activeAgents[i]);
            }
          }
          
          if (dominantAgents.length > 1) {
            // Sort by age, keep the newest one, taper the rest
            dominantAgents.sort((a, b) => a.age - b.age);
            for (let i = 1; i < dominantAgents.length; i++) {
              const agent = dominantAgents[i];
              agent.tapering = true;
              agent.forceTapering = true;
            }
          }

          if (justSuppressed && dominantAgents.length > 0) {
            const victim =
              dominantAgents[Math.floor(Math.random() * dominantAgents.length)];
            const mutatedGenome = mutateGenome(
              victim.genome,
              engine.traitProbs,
              engine.multicolorAppProb,
              engine.sameColorAppProb,
            );
            mutatedGenome.name = `Hybrid-Entropy-${Math.floor(Math.random() * 1000)}`;

            for (let k = 0; k < 3; k++) {
              const spawned = {
                position: victim.position.clone(),
                direction: new THREE.Vector3(
                  Math.random() - 0.5,
                  Math.random() - 0.5,
                  Math.random() - 0.5,
                ).normalize(),
                genome: mutatedGenome,
                active: true,
                age: 0,
                lastPosition: victim.position.clone(),
                thickness: mutatedGenome.thicknessBase,
                cooldown: 300,
              };
              engine.agents.push(spawned);
              activeAgents.push(spawned);
            }
            engine.onLog(
              `CRITICAL ENTROPY: ${strainName} suppressed. Triggering mutation burst.`,
            );
          }
        }
      });
    }
  }

  let newAgents: Agent[] = [];
  const bredThisFrame = new Set<Agent>();

  let currentActiveCount = 0;
  const strainCounts = new Map<string, number>();
  for (const a of activeAgents) {
    if (a.active) {
      currentActiveCount++;
      strainCounts.set(a.genome.name, (strainCounts.get(a.genome.name) || 0) + 1);
    }
  }

  if (engine.time % 15 === 0) {
    for (let i = 0; i < activeAgents.length; i++) {
      const a1 = activeAgents[i];
      if (!a1.active || a1.tapering) continue;

      for (let j = i + 1; j < activeAgents.length; j++) {
        const a2 = activeAgents[j];
        if (!a2.active || a2.tapering) continue;

        if (a1.genome.name === a2.genome.name) {
          const dSq = a1.position.distanceToSquared(a2.position);
          if (dSq < 25) {
            const activeStrainsCount = strainCounts.size || 1;
            const minPerStrain = Math.max(1, Math.floor(engine.minAgents / activeStrainsCount));
            const myStrainCount = strainCounts.get(a2.genome.name) || 1;

            if (currentActiveCount > engine.minAgents && myStrainCount > minPerStrain) {
              const combinedThickness = a1.thickness + a2.thickness * 0.4;
              a1.thickness = Math.min(
                combinedThickness,
                a1.genome.thicknessBase * 3.0,
              );
              a1.direction.add(a2.direction).normalize();
              a2.tapering = true;
              a2.forceTapering = true;
              engine.onLog(`Branch Merge: ${a1.genome.name}`);
              break;
            }
          }
        }
      }
    }
  }

  processAgents(engine, activeAgents, newAgents, bredThisFrame);
  engine.agents.push(...newAgents);

  engine.agents = engine.agents.filter((a) => a.active);

  const activeNotTapering = engine.agents.filter(a => !a.tapering && !a.isFeeler);
  
  if (activeNotTapering.length > engine.maxAgents * 0.5) { // Optimization: only run if mildly crowded
    const strainGroups = new Map<string, typeof activeNotTapering>();
    activeNotTapering.forEach(a => {
      const arr = strainGroups.get(a.genome.name);
      if (arr) arr.push(a);
      else strainGroups.set(a.genome.name, [a]);
    });

    const activeSpeciesCount = strainGroups.size || 1;
    const globalLimit = engine.maxAgents;
    // The "fair share" if ecoFade is 1:
    const perSpeciesLimit = Math.max(1, Math.floor(globalLimit / activeSpeciesCount));
    const fade = engine.ecoFade || 0;

    // What's the max agents this specific species is allowed to have before culling?
    const effectiveLimitPerSpecies = Math.max(1, Math.floor(fade * perSpeciesLimit + (1 - fade) * globalLimit));

    // Pass 1: Cull species that have exceeded their effective quota
    for (const [strainName, agents] of strainGroups.entries()) {
      if (agents.length > effectiveLimitPerSpecies) {
        agents.sort((a, b) => b.age - a.age); // Oldest first
        const numToTaper = agents.length - effectiveLimitPerSpecies;
        for (let i = 0; i < numToTaper; i++) {
          agents[i].tapering = true;
          agents[i].forceTapering = true;
        }
      }
    }
    
    // Pass 2: Failsafe global cut (in case ecoFade < 1 and sum exceeds maxAgents)
    const survivors = engine.agents.filter(a => !a.tapering && !a.isFeeler);
    if (survivors.length > globalLimit) {
      survivors.sort((a, b) => b.age - a.age);
      const overflow = survivors.length - globalLimit;
      for (let i = 0; i < overflow; i++) {
        survivors[i].tapering = true;
        survivors[i].forceTapering = true;
      }
    }
  } else if (activeNotTapering.length > engine.maxAgents) {
    // Basic fallback just in case
    activeNotTapering.sort((a, b) => b.age - a.age);
    const numToTaper = activeNotTapering.length - engine.maxAgents;
    for (let i = 0; i < numToTaper; i++) {
       activeNotTapering[i].tapering = true;
       activeNotTapering[i].forceTapering = true;
    }
  }
}
