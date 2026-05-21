import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome, Agent, MAX_POINTS } from "./SimulationTypes";
import { mutateGenome, breedGenomes } from "./SimulationGenetics";
import { processAgents } from "./SimulationUpdateAgents";

export function updateSimulation(engine: SimulationEngine) {
  engine.time += engine.timeScale;
  engine.unscaledTime += 1;
  engine.frameCount++;
  if (engine.controls) {
    engine.controls.autoRotateSpeed = engine.rotationSpeed || 0.1;
    engine.controls.update();
  }

  // Handle automatic theme morphing
  if (engine.themeMorphFreq < 1.0) {
    // scale from 3s to 10 minutes (600s). Max morphFreq (1.0) is OFF, so calculate up to 0.99
    const freq = Math.min(0.99, engine.themeMorphFreq);
    const intervalSecs = 3 * Math.pow(600 / 3, freq / 0.99);
    // 60 frames per second
    const intervalFrames = intervalSecs * 60;
    
    if (engine.frameCount - engine.lastThemeMorphTime > intervalFrames && engine.themeProgress >= 1.0) {
      engine.lastThemeMorphTime = engine.frameCount;
      
      // Pick random next theme different from current, biasing towards complementary (2) x2
      const candidates: number[] = [];
      for (let t = 0; t < 4; t++) {
        if (t !== engine.theme) {
          candidates.push(t);
          if (t === 2) candidates.push(t);
        }
      }
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      
      engine.setTheme(next, false);
          // We don't want the React layer to overwrite this automatically, 
          // but it will if the React state has its own 'theme'. 
          // To properly sync this, the engine should emit an event or React should just not force theme if it hasn't changed.
          // We will handle it locally.
          if (engine.onConfigChange) {
            engine.onConfigChange({ theme: next });
          }
        }
      }
    
      // Handle theme transition progress
      if (engine.themeProgress < 1.0) {
        // themeMorphSpeed is in seconds (1 to 20)
        const transitionSpeed = engine.manualThemeTransition ? 0.5 : engine.themeMorphSpeed;
        const progressInc = 1.0 / (transitionSpeed * 60);
        engine.themeProgress += progressInc;
        
        if (engine.themeProgress >= 1.0) {
          engine.themeProgress = 1.0;
          engine.theme = engine.nextTheme;
          engine.themeColor1 = engine.nextThemeColor1;
          engine.themeColor2 = engine.nextThemeColor2;
        }
      }

  // Update theme uniforms
  const leafMat = engine.appendages.get('leaves')?.mesh.material as THREE.MeshPhysicalMaterial;
  const materialsToUpdate = [
    engine.cylinderMesh.material as THREE.MeshPhysicalMaterial,
  ];
  if (engine.hybridMeshes.length > 0) {
    materialsToUpdate.push(engine.hybridMeshes[0].material as THREE.MeshPhysicalMaterial);
  }
  if (leafMat) {
    materialsToUpdate.push(leafMat);
  }

  for (const mat of materialsToUpdate) {
    if (mat && mat.userData.theme1) {
      mat.userData.theme1.value = engine.theme;
      mat.userData.theme2.value = engine.nextTheme;
      mat.userData.themeMix.value = engine.themeProgress < 1.0 ? engine.themeProgress : 0.0;
      
      const adjustSat = (c: THREE.Color) => {
        const hsl = c.getHSL({h:0,s:0,l:0});
        if (hsl.s > engine.maxSaturation) {
          c.setHSL(hsl.h, engine.maxSaturation, hsl.l);
        }
      };

      if (engine.theme === 3) {
        const bgC = new THREE.Color(engine.bgColor);
        const hsl = bgC.getHSL({h:0,s:0,l:0});
        mat.userData.themeColor1_A.value.setHSL((hsl.h + 0.5) % 1.0, Math.max(hsl.s, 0.5), 0.5);
      } else {
        mat.userData.themeColor1_A.value.set(engine.themeColor1);
        mat.userData.themeColor2_A.value.set(engine.themeColor2);
      }
      adjustSat(mat.userData.themeColor1_A.value);
      adjustSat(mat.userData.themeColor2_A.value);

      if (engine.nextTheme === 3) {
        const bgC = new THREE.Color(engine.bgColor);
        const hsl = bgC.getHSL({h:0,s:0,l:0});
        mat.userData.themeColor1_B.value.setHSL((hsl.h + 0.5) % 1.0, Math.max(hsl.s, 0.5), 0.5);
      } else {
        mat.userData.themeColor1_B.value.set(engine.nextThemeColor1);
        mat.userData.themeColor2_B.value.set(engine.nextThemeColor2);
      }
      adjustSat(mat.userData.themeColor1_B.value);
      adjustSat(mat.userData.themeColor2_B.value);
    }

    if (mat && mat.userData.botanyRealism) {
      mat.userData.botanyRealism.value = engine.botanyRealism ? 1.0 : 0.0;
    }
    if (mat && mat.userData.stemCurviness) {
      mat.userData.stemCurviness.value = engine.stemCurviness;
    }
    if (mat && mat.userData.veinStrength) {
      mat.userData.veinStrength.value = engine.veinStrength;
    }
  }

  if (engine.lastMaxDOMs !== undefined && engine.lastMaxDOMs > engine.maxDOMs) {
    engine.lastMaxDOMs = engine.maxDOMs;
  }

  const baseCycle = 2400;
  const adjustedCycle = baseCycle / (engine.tideSpeed || 0.01);
  const cycleProgress = (engine.time % adjustedCycle) / adjustedCycle;

  let pulseOffset = -engine.boundarySize - 300;

  if (cycleProgress > 0.95) {
    const pulseProgress = (cycleProgress - 0.95) / 0.05;
    engine.tideValue = Math.sin(pulseProgress * Math.PI);
    engine.tideValue = Math.pow(engine.tideValue, 1.2);
    pulseOffset = -engine.boundarySize - 100 + pulseProgress * (engine.boundarySize * 2 + 200);
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
  if (engine.lastLeafScale !== engine.leafScale) {
    appendagesChanged = true;
    engine.lastLeafScale = engine.leafScale;
  }
  if (engine.lastRelativeLeafSizeDiff !== engine.relativeLeafSizeDiff) {
    appendagesChanged = true;
    engine.lastRelativeLeafSizeDiff = engine.relativeLeafSizeDiff;
  }
  if (engine.lastStemCurviness !== engine.stemCurviness) {
    appendagesChanged = true;
    engine.lastStemCurviness = engine.stemCurviness;
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

        const isLeaf = mesh === engine.appendages.get("leaves")?.mesh;

        const packBAttr = mesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
        if (isLeaf && !packBAttr) {
           throw new Error("CRITICAL SHADER ERROR: instancePackB attribute is UNDEFINED on leaves mesh geometry!");
        }

        let currentGrowth = 1.0;
        if (packBAttr) {
           const val = packBAttr.getX(i);
           if (val < 1.0) {
              const growthSpeed = isLeaf ? engine.leafGrowthSpeed : 0.05;
              const newVal = Math.min(1.0, val + growthSpeed * engine.timeScale);
              packBAttr.setX(i, newVal);
              packBAttr.needsUpdate = true;
              currentGrowth = newVal;
           } else {
              currentGrowth = 1.0;
           }
        } else {
           currentGrowth = age <= growthDuration ? age / growthDuration : 1.0;
        }

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
                engine.unscaledTime *
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
          isHybrid ||
          isLeaf
        ) {
          const growth = isLeaf ? 1.0 : (age <= growthDuration ? age / growthDuration : 1.0);
          engine.dummy.matrix.copy(seg.matrix);
          engine.dummy.matrix.decompose(
            engine.dummy.position,
            engine.dummy.quaternion,
            engine.dummy.scale,
          );

          if (isHybrid) {
            const slowRot = i * 2.5 + engine.unscaledTime * 0.005;
            engine.dummy.quaternion.multiply(
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler(slowRot, slowRot * 1.1, slowRot * 0.8),
              ),
            );
          } else if (mesh === engine.appendages.get("leaves")?.mesh && engine.windVelocity > 0) {
            const windVel = engine.windVelocity;
            const flutter = engine.flutterIntensity;
            const t = engine.unscaledTime * 0.1 * windVel;
            
            const phaseOffset = i * 0.2;
            const wave = Math.sin(t + phaseOffset) * 0.05 * flutter;
            const waveCos = Math.cos(t * 0.7 + phaseOffset) * 0.03 * flutter;
            
            const qFlutter = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(wave, waveCos, wave * 0.5)
            );
            engine.dummy.quaternion.multiply(qFlutter);
            
            engine.dummy.position.x += wave * 2.0;
            engine.dummy.position.y += waveCos * 1.5;
          }

          const sizeMult =
            mesh === engine.cylinderMesh
              ? 1.0
              : isHybrid
                ? engine.hybridSize || 2.0
                : mesh === engine.appendages.get("leaves")?.mesh
                  ? engine.leafScale * (1.0 + ((seg.randomFactor ?? 0.5) - 0.5) * (engine.relativeLeafSizeDiff ?? 0.0))
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

  const stemPackBAttr = engine.cylinderMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
  if (stemPackBAttr) {
    const limit = Math.min(engine.pointCount, engine.maxDOMs);
    let updated = false;
    const currentHead = engine.pointCount % engine.maxDOMs;
    const windowSize = Math.min(10000, engine.maxDOMs);
    for (let i = 0; i < windowSize; i++) {
       const idx = (currentHead - i + engine.maxDOMs) % engine.maxDOMs;
       if (idx < limit) {
          const val = stemPackBAttr.getX(idx);
          if (val < 1.0) {
             stemPackBAttr.setX(idx, Math.min(1.0, val + 0.05 * engine.timeScale));
             updated = true;
          }
       }
    }
    if (updated) stemPackBAttr.needsUpdate = true;
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
              engine.unscaledTime *
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

  if (engine.hoveredStrainName !== engine.lastHoveredStrainName) {
    engine.lastHoveredStrainName = engine.hoveredStrainName;
    const packAAttr = engine.cylinderMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
    if (packAAttr) {
      const activeRange = Math.min(engine.pointCount, engine.maxDOMs);
      for (let i = 0; i < activeRange; i++) {
        const seg = engine.segments[i];
        if (seg) {
          packAAttr.setX(i, seg.strainName === engine.hoveredStrainName ? 0.8 : (engine.enableGlow ? engine.glowSize : 0.0));
        }
      }
      packAAttr.needsUpdate = true;
    }
    
    for (const app of engine.appendages.values()) {
      const appPackAAttr = app.mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (appPackAAttr) {
        const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
        for (let i = 0; i < appLim; i++) {
          const seg = app.segments[i];
          if (seg) {
            appPackAAttr.setX(i, seg.strainName === engine.hoveredStrainName ? 0.8 : (engine.enableGlow ? engine.glowSize : 0.0));
          }
        }
        appPackAAttr.needsUpdate = true;
      }
    }
  }

  const ambientAttr = engine.cylinderMesh.geometry.getAttribute("instanceAmbientReflect") as THREE.InstancedBufferAttribute;
  const lightDirAttr = engine.cylinderMesh.geometry.getAttribute("instanceLightDir") as THREE.InstancedBufferAttribute;
  if (ambientAttr && lightDirAttr && engine.glowTraitReflect > 0.0) {
    const glowingAgents = engine.agents.filter(a => a.active && !a.isFeeler && a.genome.isGlowing);
    if (glowingAgents.length > 0) {
      const activePoints = Math.min(engine.pointCount, engine.maxDOMs);
      const batchSize = Math.min(activePoints, 8000);
      const startIdx = (engine.frameCount * batchSize) % Math.max(1, activePoints);
      let anyUpdated = false;
      const vPos = new THREE.Vector3();
      const maxDist = engine.glowTraitDistance || 50.0;
      const maxDistSq = maxDist * maxDist;

      for (let k = 0; k < batchSize; k++) {
        const i = (startIdx + k) % activePoints;
        const seg = engine.segments[i];
        if (seg && !engine.dyingStems.has(i)) {
          vPos.setFromMatrixPosition(seg.matrix);
          let r = 0, g = 0, b = 0;
          let lx = 0, ly = 1, lz = 0;
          let nearestD = Infinity;

          for (let gIdx = 0; gIdx < glowingAgents.length; gIdx++) {
            const ga = glowingAgents[gIdx];
            if (ga.genome.name === seg.strainName) continue;
            const distSq = vPos.distanceToSquared(ga.position);
            if (distSq < maxDistSq) {
              const weight = (1.0 - Math.sqrt(distSq) / maxDist) * engine.glowTraitIntensity * engine.glowTraitReflect;
              let emitProb = 1.0;
              if (ga.tapering && Math.random() < 0.4) emitProb = 0.3;
              r += ga.genome.color.r * weight * emitProb;
              g += ga.genome.color.g * weight * emitProb;
              b += ga.genome.color.b * weight * emitProb;

              if (distSq < nearestD) {
                nearestD = distSq;
                const dist = Math.sqrt(distSq) || 1.0;
                lx = (ga.position.x - vPos.x) / dist;
                ly = (ga.position.y - vPos.y) / dist;
                lz = (ga.position.z - vPos.z) / dist;
              }
            }
          }
          if (ambientAttr.getX(i) !== r || ambientAttr.getY(i) !== g || ambientAttr.getZ(i) !== b) {
            ambientAttr.setXYZ(i, Math.min(1.0, r), Math.min(1.0, g), Math.min(1.0, b));
            lightDirAttr.setXYZ(i, lx, ly, lz);
            anyUpdated = true;
          }
        }
      }
      if (anyUpdated) {
        ambientAttr.needsUpdate = true;
        lightDirAttr.needsUpdate = true;
      }
    }
  }

  const speedFactor = engine.growthSpeed < 1.0 ? Math.pow(engine.growthSpeed, 2) : engine.growthSpeed;
  const effectiveDieback = (engine.diebackRate / 100.0) * speedFactor * engine.timeScale;

  if (effectiveDieback > 0.000001 || (engine.dyingStrains && engine.dyingStrains.size > 0)) {
    const batchSize = Math.floor(engine.maxDOMs / 20); // Full sweep every ~20 frames
    const sweepStart = (engine.frameCount * batchSize) % engine.maxDOMs;

    for (let i = 0; i < batchSize; i++) {
      const idx = (sweepStart + i) % engine.maxDOMs;
      const seg = engine.segments[idx];
      if (seg && !engine.dyingStems.has(idx)) {
        const age = engine.time - seg.timestamp;
        const bias = engine.diebackAgeBias || 1.0;
        const isDyingStrain = engine.dyingStrains && engine.dyingStrains.has(seg.strainName);
        let prob = Math.min(
          1.0,
          Math.pow(age / 500, bias) * Math.max(0.000001, effectiveDieback) * 0.5,
        );
        
        let activeDieback = effectiveDieback;
        if (isDyingStrain) {
          activeDieback = (engine.cullRate / 100.0) * speedFactor;
          prob = Math.min(1.0, Math.pow(age / 500, bias) * Math.max(0.000001, activeDieback) * 0.5);
        }
        
        if (Math.random() < prob) {
          const chunkSize = Math.max(1, Math.floor(Math.random() * Math.min(100, engine.diebackRate * engine.timeScale * 2 + 1)));
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
        const appSweepStart = (engine.frameCount * appBatchSize) % appLim;
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
    const colors: number[] = [];
    const activeHybrids: { pos: THREE.Vector3; time: number; alpha: number; color?: THREE.Color }[] = [];
    for (let i = 0; i < 2000; i++) {
      const seg = engine.hybridSegments[i];
      if (seg) {
        let alpha = 1.0;
        if (engine.dyingHybrids.has(seg.index)) {
          if (seg.dyingStart) {
            const fadeAge = engine.time - seg.dyingStart;
            const desiccationSpeed = engine.desiccationSpeed || 1.0;
            const wipeDuration = (engine.hybridStickiness * 12) / desiccationSpeed;
            if (fadeAge > wipeDuration) continue;
            alpha = Math.max(0, 1.0 - fadeAge / wipeDuration);
          } else {
            alpha = 1.0;
          }
        }
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(seg.matrix);
        activeHybrids.push({ pos, time: seg.timestamp, alpha, color: seg.color });
      }
    }

    activeHybrids.sort((a, b) => a.time - b.time);

    for (let i = 0; i < activeHybrids.length - 1; i++) {
      const lineAlpha = Math.min(activeHybrids[i].alpha, activeHybrids[i + 1].alpha);
      const c1 = activeHybrids[i].color ? activeHybrids[i].color!.clone().lerp(new THREE.Color(1, 1, 1), 0.5) : new THREE.Color(1, 1, 1);
      const c2 = activeHybrids[i + 1].color ? activeHybrids[i + 1].color!.clone().lerp(new THREE.Color(1, 1, 1), 0.5) : new THREE.Color(1, 1, 1);

      positions.push(
        activeHybrids[i].pos.x,
        activeHybrids[i].pos.y,
        activeHybrids[i].pos.z,
      );
      colors.push(c1.r, c1.g, c1.b, lineAlpha);
      
      positions.push(
        activeHybrids[i + 1].pos.x,
        activeHybrids[i + 1].pos.y,
        activeHybrids[i + 1].pos.z,
      );
      colors.push(c2.r, c2.g, c2.b, lineAlpha);
    }

    const posAttr = engine.hybridConnectionMesh.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    if (positions.length > posAttr.array.length) {
      engine.hybridConnectionMesh.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(positions.length * 2), 3),
      );
      engine.hybridConnectionMesh.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(colors.length * 2), 4),
      );
    }

    const newPosArray = engine.hybridConnectionMesh.geometry.getAttribute(
      "position",
    ).array as Float32Array;
    newPosArray.set(positions);
    for (let k = positions.length; k < newPosArray.length; k++) {
      newPosArray[k] = 0;
    }
    
    const colorAttr = engine.hybridConnectionMesh.geometry.getAttribute(
      "color",
    ) as THREE.BufferAttribute;
    if (colorAttr) {
      const newColorArray = colorAttr.array as Float32Array;
      newColorArray.set(colors);
      for (let k = colors.length; k < newColorArray.length; k++) {
        newColorArray[k] = 0;
      }
      colorAttr.needsUpdate = true;
    }

    engine.hybridConnectionMesh.geometry.setDrawRange(0, positions.length / 3);
    engine.hybridConnectionMesh.geometry.getAttribute("position").needsUpdate =
      true;
  }

  if (effectiveDieback > 0.000001 || (engine.dyingStrains && engine.dyingStrains.size > 0)) {
    const batchSize = 100;
    const sweepStart = (engine.frameCount * batchSize) % 2000;
    for (let i = 0; i < batchSize; i++) {
      const idx = (sweepStart + i) % 2000;
      const seg = engine.hybridSegments[idx];
      if (seg && !engine.dyingHybrids.has(idx)) {
        const age = engine.time - seg.timestamp;
        const maxHybridLife = engine.hybridStickiness * 60 + 5;
        if (age > maxHybridLife) {
          engine.markDying(engine.hybridSegments, engine.dyingHybrids, idx);
        } else {
          const deathProb = Math.min(
            1.0,
            Math.pow(age / 2000, engine.diebackAgeBias) * Math.max(0.000001, effectiveDieback) * 0.2,
          );
          if (Math.random() < deathProb) {
            engine.markDying(engine.hybridSegments, engine.dyingHybrids, idx);
          }
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

  if (engine.frameCount % 120 === 0) {
    let totalBiomass = 0;
    engine.biomassMap.forEach((v) => (totalBiomass += v));

    if (totalBiomass > 100) {
      engine.biomassMap.forEach((biomass, strainName) => {
        const ratio = biomass / totalBiomass;
        const isDying = engine.dyingStrains && engine.dyingStrains.has(strainName);

        if (isDying && ratio < 0.03) {
          engine.biomassMap.delete(strainName);
          engine.dyingStrains.delete(strainName);
          if (engine.speciesAbove5Percent) engine.speciesAbove5Percent.delete(strainName);
          if (engine.suppressedStrains) engine.suppressedStrains.delete(strainName);
          
          for (let i = 0; i < engine.maxDOMs; i++) {
            const seg = engine.segments[i];
            if (seg && seg.strainName === strainName) {
              if (!seg.dyingStart) seg.dyingStart = engine.time;
              engine.dyingStems.add(i);
            }
          }
          
          for (const app of engine.appendages.values()) {
            const lim = Math.floor(engine.maxDOMs / 4);
            for (let i = 0; i < lim; i++) {
              const seg = app.segments[i];
              if (seg && seg.strainName === strainName) {
                if (!seg.dyingStart) seg.dyingStart = engine.time;
                app.dyingSet.add(i);
              }
            }
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
        
        if (ratio > 0.03) {
          engine.speciesAbove5Percent.add(strainName);
        } else if (ratio < 0.03 && engine.speciesAbove5Percent.has(strainName)) {
          engine.speciesAbove5Percent.delete(strainName);
          for (let i = 0; i < activeAgents.length; i++) {
            if (activeAgents[i].genome.name === strainName) {
              activeAgents[i].tapering = true;
              activeAgents[i].forceTapering = true;
            }
          }
          if (!engine.dyingStrains) engine.dyingStrains = new Set();
          engine.dyingStrains.add(strainName);
          engine.onLog(`Species ${strainName} dropped below 3% and was culled to make space.`);
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

  if (engine.frameCount % 15 === 0) {
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
