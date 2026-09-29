import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome } from "./SimulationTypes";
import { WIND_STRIDE } from "./SimulationLOD";
import { updateWindMaterialUniforms, computeLfoModulatedOverall } from "./SimulationWindMotion";

// Scratch objects reused every frame (avoids per-instance heap allocations in the hot loop).
const scratchQuat = new THREE.Quaternion();
const scratchEuler = new THREE.Euler();

export function updateCameraAndThemeUniforms(engine: SimulationEngine) {
  const isMotionZero = (engine.overallMovement ?? 0.25) <= 0.0001 ||
    (((engine.shimmer ?? 0.40) <= 0.0001) && ((engine.wavy ?? 0.35) <= 0.0001) && ((engine.branchMovement ?? 0.45) <= 0.0001));

  // Kiosk Mode Interval & Smooth Fade Handling
  if (engine.kioskMode) {
    if (isMotionZero) {
      engine.lastKioskRealTime = performance.now();
      engine.kioskFadingOut = false;
      engine.kioskFadeProgress = 0;
    } else {
      if (!engine.lastKioskRealTime) engine.lastKioskRealTime = performance.now();
      const targetRealSec = 7.0 * (100 / (engine.timeScale || 1.0));
      if ((performance.now() - engine.lastKioskRealTime) / 1000 >= targetRealSec && !engine.kioskFadingOut) {
        engine.kioskFadingOut = true;
      }
      if (engine.kioskFadingOut) {
        engine.kioskFadeProgress = Math.min(1.0, (engine.kioskFadeProgress || 0) + 0.033);
        if (engine.kioskFadeProgress >= 1.0) {
          engine.lastKioskRealTime = performance.now();
          engine.kioskFadingOut = false;
          if (engine.onKioskTrigger) engine.onKioskTrigger();
        }
      } else if (engine.kioskFadeProgress > 0) {
        engine.kioskFadeProgress = Math.max(0.0, engine.kioskFadeProgress - 0.033);
      }
    }
  } else {
    engine.kioskFadeProgress = 0;
    engine.kioskFadingOut = false;
    engine.lastKioskRealTime = performance.now();
  }

  // Camera rotation & controls update
  if (engine.controls && engine.camera) {
    const rx = engine.rotationSpeed ?? 0;
    const ry = engine.rotationSpeedY ?? 0;
    if (!isMotionZero && (rx !== 0 || ry !== 0)) {
      engine.controls.autoRotate = false;
      const target = engine.controls.target || new THREE.Vector3(0, 0, 0);
      const spherical = new THREE.Spherical().setFromVector3(
        new THREE.Vector3().subVectors(engine.camera.position, target),
      );
      if (rx !== 0) spherical.theta -= (Math.PI / 1800) * rx;
      if (ry !== 0) spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - (Math.PI / 1800) * ry));
      engine.camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical));
      engine.camera.lookAt(target);
    }
    engine.controls.update();
  }

  // Theme transition progress
  if (engine.themeProgress < 1.0) {
    const spd = engine.manualThemeTransition ? 0.5 : engine.themeMorphSpeed;
    engine.themeProgress += 1.0 / (spd * 60);
    if (engine.themeProgress >= 1.0) {
      engine.themeProgress = 1.0;
      engine.theme = engine.nextTheme;
      engine.themeColor1 = engine.nextThemeColor1;
      engine.themeColor2 = engine.nextThemeColor2;
    }
  }

  // Update theme uniforms
  const leafMat = engine.appendages.get("leaves")?.mesh.material as THREE.MeshPhysicalMaterial;
  const mats: THREE.MeshPhysicalMaterial[] = [engine.cylinderMesh.material as THREE.MeshPhysicalMaterial];
  if (engine.appendageMaterial) mats.push(engine.appendageMaterial);
  if (engine.hybridMeshes.length > 0) mats.push(engine.hybridMeshes[0].material as THREE.MeshPhysicalMaterial);
  if (leafMat) mats.push(leafMat);

  for (const mat of mats) {
    if (mat && mat.userData.theme1) {
      mat.userData.theme1.value = engine.theme;
      mat.userData.theme2.value = engine.nextTheme;
      mat.userData.themeMix.value = engine.themeProgress < 1.0 ? engine.themeProgress : 0.0;
      const setCol = (target: THREE.Color, thm: number, c: string) => {
        if (thm === 3) {
          const hsl = new THREE.Color(engine.bgColor).getHSL({ h: 0, s: 0, l: 0 });
          target.setHSL((hsl.h + 0.5) % 1.0, Math.max(hsl.s, 0.5), 0.5);
        } else {
          target.set(c);
        }
        const hsl = target.getHSL({ h: 0, s: 0, l: 0 });
        if (hsl.s > engine.maxSaturation) target.setHSL(hsl.h, engine.maxSaturation, hsl.l);
      };
      setCol(mat.userData.themeColor1_A.value, engine.theme, engine.themeColor1);
      setCol(mat.userData.themeColor2_A.value, engine.theme, engine.themeColor2);
      setCol(mat.userData.themeColor1_B.value, engine.nextTheme, engine.nextThemeColor1);
      setCol(mat.userData.themeColor2_B.value, engine.nextTheme, engine.nextThemeColor2);
    }
    if (mat?.userData.botanyRealism) mat.userData.botanyRealism.value = engine.botanyRealism ? 1.0 : 0.0;
    if (mat?.userData.stemCurviness) mat.userData.stemCurviness.value = engine.stemCurviness;
    if (mat?.userData.veinStrength) mat.userData.veinStrength.value = engine.veinStrength;
    if (mat?.userData.veinGlow) mat.userData.veinGlow.value = engine.veinGlow;
  }
  updateWindMaterialUniforms(engine);

  if (engine.lastMaxDOMs !== undefined && engine.lastMaxDOMs > engine.maxDOMs) {
    engine.lastMaxDOMs = engine.maxDOMs;
  }

  // Tide cycle
  const adjCycle = 2400 / (engine.tideSpeed || 0.01);
  const cycleProg = (engine.time % adjCycle) / adjCycle;
  let pulseOffset = -engine.boundarySize - 300;
  if (cycleProg > 0.95) {
    const pulseProg = (cycleProg - 0.95) / 0.05;
    engine.tideValue = Math.pow(Math.sin(pulseProg * Math.PI), 1.2);
    pulseOffset = -engine.boundarySize - 100 + pulseProg * (engine.boundarySize * 2 + 200);
  } else {
    engine.tideValue = 0;
  }
  if (engine.tideMesh) {
    const tm = engine.tideMesh.material as THREE.ShaderMaterial;
    tm.uniforms.tideValue.value = engine.tideValue;
    tm.uniforms.pulseOffset.value = pulseOffset;
    tm.uniforms.time.value = engine.time * 0.01;
    tm.uniforms.colorTop.value.set(engine.tideColor);
    tm.uniforms.colorBottom.value.set(engine.tideColor);
    tm.uniforms.thickness.value = engine.tideThickness;
    tm.uniforms.tideOpacity.value = engine.tideOpacity;
    tm.uniforms.tideSaturation.value = engine.tideSaturation;
    engine.tideMesh.position.y = pulseOffset;
    engine.tideMesh.visible = false;
  }
}

export function updateMeshesAndStemsGrowth(
  engine: SimulationEngine,
  uniqueGenomes: Map<string, Genome>,
  pulsingGenomes: Genome[],
) {
  let appChanged = false;
  if (engine.lastFlowerSize !== engine.flowerSize) { appChanged = true; engine.lastFlowerSize = engine.flowerSize; }
  if (engine.lastHybridSize !== engine.hybridSize) { appChanged = true; engine.lastHybridSize = engine.hybridSize; }
  if (engine.lastLeafScale !== engine.leafScale) { appChanged = true; engine.lastLeafScale = engine.leafScale; }
  if (engine.lastRelativeLeafSizeDiff !== engine.relativeLeafSizeDiff) { appChanged = true; engine.lastRelativeLeafSizeDiff = engine.relativeLeafSizeDiff; }
  if (engine.lastStemCurviness !== engine.stemCurviness) { appChanged = true; engine.lastStemCurviness = engine.stemCurviness; }
  if ((engine as any).lastWindVelocity !== engine.windVelocity) { appChanged = true; (engine as any).lastWindVelocity = engine.windVelocity; }
  if ((engine as any).lastShimmer !== engine.shimmer) { appChanged = true; (engine as any).lastShimmer = engine.shimmer; }
  if ((engine as any).lastWavy !== engine.wavy) { appChanged = true; (engine as any).lastWavy = engine.wavy; }
  if ((engine as any).lastBranchMovement !== engine.branchMovement) { appChanged = true; (engine as any).lastBranchMovement = engine.branchMovement; }
  if ((engine as any).lastOverallMovement !== engine.overallMovement) { appChanged = true; (engine as any).lastOverallMovement = engine.overallMovement; }

  const { effectiveOverall } = computeLfoModulatedOverall(engine);
  const windFlutterMult = effectiveOverall * ((engine.shimmer ?? 0.40) * 0.65 + (engine.wavy ?? 0.35) * 0.35);
  const motionActivity = Math.min(1.0, effectiveOverall * ((engine.shimmer ?? 0.40) + (engine.wavy ?? 0.35) + (engine.branchMovement ?? 0.45)));

  const growthDuration = 40;
  const updateMeshGrowth = (mesh: THREE.InstancedMesh, segments: any[]) => {
    let changed = false;
    const isHybrid = engine.hybridMeshes.includes(mesh);
    const hybridVarId = isHybrid ? engine.hybridMeshes.indexOf(mesh) : -1;
    // Per-mesh invariants (hoisted out of the per-segment loop)
    const isLeaf = mesh === engine.appendages.get("leaves")?.mesh;
    const pB = mesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
    if (isLeaf && !pB) throw new Error("CRITICAL SHADER ERROR: instancePackB attribute is UNDEFINED on leaves mesh geometry!");
    const leafWind = isLeaf && engine.windVelocity > 0 && windFlutterMult > 0.0001;
    // View-only LOD: settled leaves re-pose for wind on a stride (1/2 at medium, 1/4 at low, paused at minimal).
    const windStride = WIND_STRIDE[engine.lod?.tier ?? 0];

    for (let i = 0; i < (mesh.count || 0); i++) {
      const seg = segments[i];
      if (!seg) continue;
      if (isHybrid && seg.variant !== hybridVarId) {
        engine.dummy.matrix.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, engine.dummy.matrix);
        changed = true;
        continue;
      }
      const age = engine.time - seg.timestamp;
      const genome = uniqueGenomes.get(seg.strainName);
      let sizePulse = 1.0;
      let colPulse = 1.0;
      if (pB && motionActivity > 0.0001) {
        const val = pB.getX(i);
        if (val < 1.0) {
          const leafStep = Math.max(0.02, (engine.leafGrowthSpeed || 0.0045) * Math.max(3.0, engine.timeScale));
          pB.setX(i, Math.min(1.0, val + (isLeaf ? leafStep : 0.05 * engine.timeScale)));
          pB.needsUpdate = true;
        }
      }

      if (!isHybrid && genome && genome.pulseTarget !== "none") {
        const isStem = mesh === engine.cylinderMesh;
        const tp = genome.pulseTarget;
        if (tp === "all" || (isStem && tp === "stem") || (!isStem && tp === "appendage")) {
          const rawSin = Math.sin(engine.unscaledTime * genome.pulseSpeed * (engine.globalPulseSpeed || 1.0) * 10.0);
          const pVal = Math.pow(Math.max(0, rawSin), 2.5) * motionActivity;
          colPulse = 1.0 + pVal * 0.25;
          if (isStem) sizePulse = 1.0 + pVal * 0.25;
        }
      }

      // Settled leaves only need per-frame matrices while wind flutter is active
      const windThisFrame = leafWind && windStride > 0 && (windStride === 1 || (i + engine.frameCount) % windStride === 0);
      if (age <= growthDuration || appChanged || sizePulse !== 1.0 || colPulse !== 1.0 || isHybrid || windThisFrame) {
        const growth = isLeaf ? 1.0 : isHybrid ? 1.0 - Math.pow(1.0 - Math.min(1.0, age / 120), 3) : (age <= growthDuration ? age / growthDuration : 1.0);
        engine.dummy.matrix.copy(seg.matrix);
        engine.dummy.matrix.decompose(engine.dummy.position, engine.dummy.quaternion, engine.dummy.scale);

        if (isHybrid) {
          const rot = i * 2.5 + engine.unscaledTime * 0.005 * (engine.hybridSpinSpeed ?? 0.2) * motionActivity;
          engine.dummy.quaternion.multiply(scratchQuat.setFromEuler(scratchEuler.set(rot, rot * 1.1, rot * 0.8)));
        } else if (isLeaf && engine.windVelocity > 0 && windFlutterMult > 0.0001) {
          const t = engine.unscaledTime * 0.1 * engine.windVelocity;
          const po = i * 0.2;
          const w1 = Math.sin(t + po) * 0.05 * engine.flutterIntensity * windFlutterMult;
          const w2 = Math.cos(t * 0.7 + po) * 0.03 * engine.flutterIntensity * windFlutterMult;
          engine.dummy.quaternion.multiply(scratchQuat.setFromEuler(scratchEuler.set(w1, w2, w1 * 0.5)));
        }

        const isLeafApp = mesh === engine.appendages.get("leaves")?.mesh || mesh === engine.appendages.get("ferns")?.mesh;
        const sizeMult = mesh === engine.cylinderMesh ? 1.0 : isHybrid ? Math.min(2.2, Math.max(1.4, (engine.hybridSize || 2.0) * 0.85)) : isLeafApp ? ((engine.leafScale ?? 0.55) * (1.0 + ((seg.randomFactor ?? 0.5) - 0.5) * (engine.relativeLeafSizeDiff ?? 0.0))) : (engine.flowerSize || 1.0);
        engine.dummy.scale.multiplyScalar(growth * sizeMult * sizePulse);
        engine.dummy.updateMatrix();
        mesh.setMatrixAt(i, engine.dummy.matrix);

        if (colPulse !== 1.0 && genome && mesh.instanceColor && !isHybrid) {
          mesh.setColorAt(i, genome.color.clone().multiplyScalar(colPulse));
        }
        changed = true;
      }
    }
    if (changed) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };

  for (const app of engine.appendages.values()) updateMeshGrowth(app.mesh, app.segments);
  for (const mesh of engine.hybridMeshes) updateMeshGrowth(mesh, engine.hybridSegments);

  // CRITICAL FIX (Primary Bug P0 — Stem Dither Fade-In):
  const stemPackBAttr = engine.cylinderMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
  if (motionActivity > 0.0001 && stemPackBAttr && engine.growingStems && engine.growingStems.size > 0) {
    let updated = false;
    const step = Math.max(0.02, 0.05 * (engine.timeScale || 1.0));
    for (const idx of Array.from(engine.growingStems)) {
      const seg = engine.segments[idx];
      if (!seg || engine.dyingStems.has(idx)) {
        engine.growingStems.delete(idx);
        continue;
      }
      const val = stemPackBAttr.getX(idx);
      if (val < 1.0) {
        const nextVal = Math.min(1.0, val + step);
        stemPackBAttr.setX(idx, nextVal);
        updated = true;
        if (nextVal >= 1.0) engine.growingStems.delete(idx);
      } else {
        engine.growingStems.delete(idx);
      }
    }
    if (updated) stemPackBAttr.needsUpdate = true;
  }

  // CRITICAL FIX (Bug #5 — Stem Colour Pulse Bounds):
  if (motionActivity > 0.0001 && pulsingGenomes.some((g) => g.pulseTarget === "stem" || g.pulseTarget === "all")) {
    const activeRange = Math.min(engine.pointCount, engine.maxDOMs);
    const scratchPulseColor = new THREE.Color();
    for (let i = 0; i < activeRange; i++) {
      const seg = engine.segments[i];
      if (seg) {
        const genome = uniqueGenomes.get(seg.strainName);
        if (genome && (genome.pulseTarget === "stem" || genome.pulseTarget === "all")) {
          const rawSin = Math.sin(engine.unscaledTime * genome.pulseSpeed * (engine.globalPulseSpeed || 1.0) * 10.0);
          const pVal = Math.pow(Math.max(0, rawSin), 2.5) * motionActivity;
          scratchPulseColor.copy(genome.color).multiplyScalar(1.0 + pVal * 0.25);
          engine.cylinderMesh.setColorAt(i, scratchPulseColor);
        }
      }
    }
    engine.cylinderMesh.instanceColor!.needsUpdate = true;
  }

  // Hovered strain glow update
  if (engine.hoveredStrainName !== engine.lastHoveredStrainName) {
    engine.lastHoveredStrainName = engine.hoveredStrainName;
    const packAAttr = engine.cylinderMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
    if (packAAttr) {
      const activeRange = Math.min(engine.pointCount, engine.maxDOMs);
      for (let i = 0; i < activeRange; i++) {
        const seg = engine.segments[i];
        if (seg) packAAttr.setX(i, seg.strainName === engine.hoveredStrainName ? 0.8 : (engine.enableGlow ? engine.glowSize : 0.0));
      }
      packAAttr.needsUpdate = true;
    }
    for (const app of engine.appendages.values()) {
      const appPackAAttr = app.mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (appPackAAttr) {
        const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
        for (let i = 0; i < appLim; i++) {
          const seg = app.segments[i];
          if (seg) appPackAAttr.setX(i, seg.strainName === engine.hoveredStrainName ? 0.8 : (engine.enableGlow ? engine.glowSize : 0.0));
        }
        appPackAAttr.needsUpdate = true;
      }
    }
  }

  // Ambient reflection from glowing agents
  const ambientAttr = engine.cylinderMesh.geometry.getAttribute("instanceAmbientReflect") as THREE.InstancedBufferAttribute;
  const lightDirAttr = engine.cylinderMesh.geometry.getAttribute("instanceLightDir") as THREE.InstancedBufferAttribute;
  if (ambientAttr && lightDirAttr && engine.glowTraitReflect > 0.0) {
    const glowingAgents = engine.agents.filter((a) => a.active && !a.isFeeler && a.genome.isGlowing);
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
          let r = 0, g = 0, b = 0, lx = 0, ly = 1, lz = 0, nearestD = Infinity;

          for (const ga of glowingAgents) {
            if (ga.genome.name === seg.strainName) continue;
            const distSq = vPos.distanceToSquared(ga.position);
            if (distSq < maxDistSq) {
              const weight = (1.0 - Math.sqrt(distSq) / maxDist) * engine.glowTraitIntensity * engine.glowTraitReflect;
              const emitProb = ga.tapering && Math.random() < 0.4 ? 0.3 : 1.0;
              r += ga.genome.color.r * weight * emitProb;
              g += ga.genome.color.g * weight * emitProb;
              b += ga.genome.color.b * weight * emitProb;
              if (distSq < nearestD) {
                nearestD = distSq;
                const d = Math.sqrt(distSq) || 1.0;
                lx = (ga.position.x - vPos.x) / d; ly = (ga.position.y - vPos.y) / d; lz = (ga.position.z - vPos.z) / d;
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
}

export function updateHybridConnectionMesh(engine: SimulationEngine) {
  if (!engine.hybridConnectionMesh) return;

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
          const wipeDuration = 180.0;
          if (fadeAge > wipeDuration) continue;
          alpha = Math.max(0, 1.0 - fadeAge / wipeDuration);
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
    positions.push(activeHybrids[i].pos.x, activeHybrids[i].pos.y, activeHybrids[i].pos.z);
    colors.push(c1.r, c1.g, c1.b, lineAlpha);
    positions.push(activeHybrids[i + 1].pos.x, activeHybrids[i + 1].pos.y, activeHybrids[i + 1].pos.z);
    colors.push(c2.r, c2.g, c2.b, lineAlpha);
  }

  const posAttr = engine.hybridConnectionMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  if (positions.length > posAttr.array.length) {
    engine.hybridConnectionMesh.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions.length * 2), 3));
    engine.hybridConnectionMesh.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors.length * 2), 4));
  }

  const newPosArray = engine.hybridConnectionMesh.geometry.getAttribute("position").array as Float32Array;
  newPosArray.set(positions);
  for (let k = positions.length; k < newPosArray.length; k++) newPosArray[k] = 0;

  const colorAttr = engine.hybridConnectionMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
  if (colorAttr) {
    const newColorArray = colorAttr.array as Float32Array;
    newColorArray.set(colors);
    for (let k = colors.length; k < newColorArray.length; k++) newColorArray[k] = 0;
    colorAttr.needsUpdate = true;
  }

  engine.hybridConnectionMesh.geometry.setDrawRange(0, positions.length / 3);
  engine.hybridConnectionMesh.geometry.getAttribute("position").needsUpdate = true;
}
