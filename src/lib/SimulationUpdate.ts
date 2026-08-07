import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome, Agent, MAX_POINTS } from "./SimulationTypes";
import { mutateGenome, breedGenomes } from "./SimulationGenetics";
import { processAgents } from "./SimulationUpdateAgents";
import {
  performBiomassSweep,
  performRatioCulling,
  performCapacityCulling,
} from "./SimulationEcology";

export function updateSimulation(engine: SimulationEngine) {
  engine.time += engine.timeScale;
  engine.unscaledTime += 1;
  engine.frameCount++;

  // Kiosk Mode Interval & Smooth Fade Handling (Real wall-clock time: exactly 7.0s at 100 slow_mo)
  if (engine.kioskMode) {
    if (!engine.lastKioskRealTime) engine.lastKioskRealTime = performance.now();
    const targetRealSeconds = 7.0 * (100 / (engine.timeScale || 1.0));
    const elapsedRealSeconds = (performance.now() - engine.lastKioskRealTime) / 1000;

    if (elapsedRealSeconds >= targetRealSeconds && !engine.kioskFadingOut) {
      engine.kioskFadingOut = true;
    }

    if (engine.kioskFadingOut) {
      engine.kioskFadeProgress = Math.min(1.0, (engine.kioskFadeProgress || 0) + 0.033);
      if (engine.kioskFadeProgress >= 1.0) {
        engine.lastKioskRealTime = performance.now();
        engine.kioskFadingOut = false;
        if (engine.onKioskTrigger) {
          engine.onKioskTrigger();
        }
      }
    } else if (engine.kioskFadeProgress > 0) {
      engine.kioskFadeProgress = Math.max(0.0, engine.kioskFadeProgress - 0.033);
    }
  } else {
    engine.kioskFadeProgress = 0;
    engine.kioskFadingOut = false;
    engine.lastKioskRealTime = performance.now();
  }

  if (engine.controls && engine.camera) {
    const rotSpeedX = engine.rotationSpeed ?? 0;
    const rotSpeedY = engine.rotationSpeedY ?? 0;
    if (rotSpeedX !== 0 || rotSpeedY !== 0) {
      engine.controls.autoRotate = false;
      const target = engine.controls.target || new THREE.Vector3(0, 0, 0);
      const offset = new THREE.Vector3().subVectors(engine.camera.position, target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      if (rotSpeedX !== 0) {
        const angleStepX = (Math.PI / 1800) * rotSpeedX;
        spherical.theta -= angleStepX;
      }

      if (rotSpeedY !== 0) {
        const angleStepY = (Math.PI / 1800) * rotSpeedY;
        spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - angleStepY));
      }

      offset.setFromSpherical(spherical);
      engine.camera.position.copy(target).add(offset);
      engine.camera.lookAt(target);
    }
    engine.controls.update();
  }

  // Handle theme transition progress when manually triggered by user
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
    if (mat && mat.userData.veinGlow) {
      mat.userData.veinGlow.value = engine.veinGlow;
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
    engine.tideMesh.visible = false;
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
          // Simple ease out animation is applied to growth scale below; no bounce pulse
        } else if (genome && genome.pulseTarget !== "none") {
          const isStem = mesh === engine.cylinderMesh;
          const tp = genome.pulseTarget;
          const match =
            tp === "all" ||
            (isStem && tp === "stem") ||
            (!isStem && tp === "appendage");

          if (match) {
            const rawSin = Math.sin(
              engine.unscaledTime *
                genome.pulseSpeed *
                (engine.globalPulseSpeed || 1.0) *
                10.0,
            );
            // Smooth heartbeat pulse curve: slow expansion, gentle contraction, quiet rest
            const pulseVal = Math.pow(Math.max(0, rawSin), 2.5);
              
            colorPulseEffect = 1.0 + pulseVal * 0.25;
            
            if (isStem) {
                sizePulseEffect = 1.0 + pulseVal * 0.25;
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
          const growth = isLeaf
            ? 1.0
            : isHybrid
              ? 1.0 - Math.pow(1.0 - Math.min(1.0, age / 120), 3)
              : (age <= growthDuration ? age / growthDuration : 1.0);
          engine.dummy.matrix.copy(seg.matrix);
          engine.dummy.matrix.decompose(
            engine.dummy.position,
            engine.dummy.quaternion,
            engine.dummy.scale,
          );

          if (isHybrid) {
            const spinMult = engine.hybridSpinSpeed !== undefined ? engine.hybridSpinSpeed : 0.2;
            const slowRot = i * 2.5 + engine.unscaledTime * 0.005 * spinMult;
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

          const isLeafApp =
            mesh === engine.appendages.get("leaves")?.mesh ||
            mesh === engine.appendages.get("ferns")?.mesh;

          const sizeMult =
            mesh === engine.cylinderMesh
              ? 1.0
              : isHybrid
                ? engine.hybridSize || 2.0
                : isLeafApp
                  ? (engine.leafScale ?? 0.55) * (1.0 + ((seg.randomFactor ?? 0.5) - 0.5) * (engine.relativeLeafSizeDiff ?? 0.0))
                  : (engine.flowerSize || 1.0);
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
          const rawSin = Math.sin(
            engine.unscaledTime *
              genome.pulseSpeed *
              (engine.globalPulseSpeed || 1.0) *
              10.0,
          );
          const pulseEffect = 1.0 + Math.pow(Math.max(0, rawSin), 2.5) * 0.25;
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

  performBiomassSweep(engine);

  // INSTANT APPENDAGE SYNC:
  // Ensure any leaf, flower, or appendage whose strain or parent stem is dying dissolves in exact lockstep
  for (const [appName, app] of engine.appendages.entries()) {
    const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    if (appLim > 0) {
      let appChanged = false;
      for (let i = 0; i < appLim; i++) {
        const seg = app.segments[i];
        if (seg && !app.dyingSet.has(i)) {
          const isStrainDying = engine.dyingStrains && engine.dyingStrains.has(seg.strainName);

          if (isStrainDying) {
            // Whole species is dying -> dissolve appendage smoothly
            engine.markDying(app.segments, app.dyingSet, i, engine.unscaledTime);
          } else if (seg.parentIndex !== undefined) {
            const parentSeg = engine.segments[seg.parentIndex];
            const parentDying = engine.dyingStems.has(seg.parentIndex);
            
            // STRICT IDENTITY CHECK: Parent stem segment must match strain name and birth timestamp
            // Prevents ring-buffer recycled slot from killing unrelated healthy appendages!
            if (
              parentDying &&
              parentSeg &&
              parentSeg.strainName === seg.strainName &&
              parentSeg.timestamp === seg.parentTimestamp &&
              parentSeg.dyingStart
            ) {
              engine.markDying(app.segments, app.dyingSet, i, parentSeg.dyingStart);
            }
          }
        }
      }
      if (appChanged) {
        app.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  engine.processDying(engine.segments, engine.dyingStems, engine.cylinderMesh);
  for (const app of engine.appendages.values()) {
    engine.processDying(app.segments, app.dyingSet, app.mesh, true);
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
            const fadeAge = engine.unscaledTime - seg.dyingStart;
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

  // Instant Comprehensive Cleanup: Remove breeding polygon artifacts as soon as parent organisms die or taper out
  const activeAgentIds = new Set(engine.agents.filter(a => a.active && !a.tapering).map(a => a.id));

  for (let idx = 0; idx < engine.hybridSegments.length; idx++) {
    const seg = engine.hybridSegments[idx];
    if (seg && !engine.dyingHybrids.has(idx)) {
      const age = engine.time - seg.timestamp;
      const maxHybridLife = engine.hybridStickiness * 30 + 3;
      
      const parentADead = seg.agentAId !== undefined && !activeAgentIds.has(seg.agentAId);
      const parentBDead = seg.agentBId !== undefined && !activeAgentIds.has(seg.agentBId);
      const isParentDying = engine.dyingStrains && (engine.dyingStrains.has(seg.strainName) || (seg.strainBName && engine.dyingStrains.has(seg.strainBName)));

      if (age > maxHybridLife) {
        engine.markDying(engine.hybridSegments, engine.dyingHybrids, idx);
      } else if (effectiveDieback > 0.000001) {
        const deathProb = Math.min(
          1.0,
          Math.pow(age / 1000, engine.diebackAgeBias) * Math.max(0.000001, effectiveDieback) * 0.2,
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

  performRatioCulling(engine, activeAgents);

  let newAgents: Agent[] = [];
  const bredThisFrame = new Set<Agent>();

  let currentActiveCount = 0;
  const strainCounts = new Map<string, number>();
  for (const a of activeAgents) {
    if (a.active && !a.tapering && !a.isFeeler) {
      currentActiveCount++;
      strainCounts.set(a.genome.name, (strainCounts.get(a.genome.name) || 0) + 1);
    }
  }

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

  processAgents(engine, activeAgents, newAgents, bredThisFrame);
  newAgents.forEach(a => {
    if (a.id === undefined) {
      a.id = engine.nextAgentId++;
    }
  });
  engine.agents.push(...newAgents);

  engine.agents = engine.agents.filter((a) => a.active);

  const activeNotTapering = engine.agents.filter(a => !a.tapering && !a.isFeeler && a.hasBred);
  
  performCapacityCulling(engine, activeNotTapering);

  // Periodic archetype census breakdown logged every 300 frames (~5s)
  if (engine.frameCount % 300 === 0 && activeNotTapering.length > 0) {
    const archetypeCounts: Record<string, number> = { rhizome: 0, bush: 0, tree: 0, snake: 0 };
    let totalAge = 0;
    let maxAge = 0;
    for (const agent of activeNotTapering) {
      const arch = agent.genome.archetype || "bush";
      archetypeCounts[arch] = (archetypeCounts[arch] || 0) + 1;
      totalAge += agent.age;
      if (agent.age > maxAge) maxAge = agent.age;
    }
    const total = activeNotTapering.length;
    const avgAgeSecs = (totalAge / total / 60.0).toFixed(1);
    const maxAgeSecs = (maxAge / 60.0).toFixed(1);

    const screenFillPct = ((engine.pointCount / engine.maxDOMs) * 100).toFixed(1);

    const gPct = Math.round(((archetypeCounts.rhizome || 0) / total) * 100);
    const bPct = Math.round(((archetypeCounts.bush || 0) / total) * 100);
    const tPct = Math.round(((archetypeCounts.tree || 0) / total) * 100);
    const sPct = Math.round(((archetypeCounts.snake || 0) / total) * 100);

    engine.onLog(
      `📊 [CENSUS] Pop: ${total} (Avg Age: ${avgAgeSecs}s, Max: ${maxAgeSecs}s) | Screen Fill: ${screenFillPct}% | Rhizome: ${gPct}% | Bush: ${bPct}% | Tree: ${tPct}% | Snake: ${sPct}%`
    );
  }

  // Geometry diagnostics every 180 frames (~3s) — track live vs dying stems
  if (engine.frameCount % 180 === 0) {
    let liveSegs = 0;
    let dyingSegs = engine.dyingStems.size;
    let emptySlots = 0;
    const strainLiveSegs: Record<string, number> = {};
    for (let i = 0; i < engine.maxDOMs; i++) {
      if (engine.segments[i]) {
        if (!engine.dyingStems.has(i)) {
          liveSegs++;
          const sName = engine.segments[i].strainName || "unknown";
          strainLiveSegs[sName] = (strainLiveSegs[sName] || 0) + 1;
        }
      } else {
        emptySlots++;
      }
    }
    const activeAgentCount = engine.agents.filter(a => a.active && !a.isFeeler).length;
    const taperingCount = engine.agents.filter(a => a.active && a.tapering && !a.isFeeler).length;
    const dyingStrainsList = engine.dyingStrains ? Array.from(engine.dyingStrains).join(",") : "none";
    const strainSegSummary = Object.entries(strainLiveSegs).map(([k, v]) => `${k}:${v}`).join(", ");

    engine.onLog(
      `🔬 [GEOM] live=${liveSegs} dying=${dyingSegs} empty=${emptySlots} meshCount=${engine.cylinderMesh.count} | agents=${activeAgentCount} (tap=${taperingCount}) | liveSegs=[${strainSegSummary || "none"}] | dyingStrains=[${dyingStrainsList}]`
    );

    // ALERT: geometry vanished while agents alive
    if (liveSegs < 10 && activeAgentCount > 0) {
      engine.onLog(
        `🚨 [INVISIBLE BUG DETECTED] Only ${liveSegs} live segments but ${activeAgentCount} active agents! Ring buffer head=${engine.pointCount % engine.maxDOMs} maxDOMs=${engine.maxDOMs}`
      );
    }
  }

  // Appendage Health & Diagnostics Census logged every 240 frames (~4s)
  if (engine.frameCount % 240 === 0) {
    const appCounts: Record<string, { alive: number; dying: number }> = {};
    let totalLiveAppendages = 0;

    for (const [appName, app] of engine.appendages.entries()) {
      const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
      let alive = 0;
      let dying = 0;
      for (let i = 0; i < appLim; i++) {
        const seg = app.segments[i];
        if (seg) {
          if (app.dyingSet.has(i)) {
            dying++;
          } else {
            alive++;
            totalLiveAppendages++;
          }
        }
      }
      if (alive > 0 || dying > 0) {
        appCounts[appName] = { alive, dying };
      }
    }

    const agentAppGenes: Record<string, number> = {};
    for (const agent of engine.agents) {
      if (agent.active && !agent.isFeeler && agent.genome.appendage && (agent.genome.appendage as string) !== "none") {
        agentAppGenes[agent.genome.appendage] = (agentAppGenes[agent.genome.appendage] || 0) + 1;
      }
    }

    const appBreakdown = Object.entries(appCounts)
      .map(([k, v]) => `${k}:${v.alive} (dying:${v.dying})`)
      .join(", ");
    const geneSummary = Object.entries(agentAppGenes)
      .map(([k, v]) => `${k}:${v} agt`)
      .join(", ");

    engine.onLog(
      `🌸 [APPENDAGE CENSUS] Total Live: ${totalLiveAppendages} | Active: [${appBreakdown || "none"}] | Genome Traits: [${geneSummary || "none"}]`
    );

    // Warning: If agents with appendage genes exist but 0 live appendages render on screen
    if (Object.keys(agentAppGenes).length > 0 && totalLiveAppendages === 0 && engine.frameCount > 60) {
      engine.onLog(
        `⚠️ [APPENDAGE DISAPPEARANCE WARNING] ${Object.keys(agentAppGenes).length} strains carry appendage traits (${geneSummary}), but 0 appendages are alive!`
      );
    }
  }
}
