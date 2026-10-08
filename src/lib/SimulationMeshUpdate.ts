import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome } from "./SimulationTypes";
import { getStrainDeathStart } from "./SimulationEngineHelpers";
import { markInstanceIndexDirty, markActiveInstancesDirty, deleteStrainAppendages } from "./SimulationVertexTrimmer";
import { getStemBudget, getPerAppendageCap, getCameraDistanceRatio, remapAppendageParent } from "./SimulationTrianglePruner";

export const STEM_BIRTH_GROWTH_INIT = 0.02;
export const APPENDAGE_BIRTH_GROWTH_INIT = 0.02;

export function updateMeshSegments(
  engine: SimulationEngine,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  genome: Genome,
  thickness: number,
  isAppendage = false,
  agentId?: number,
  isTerminal: boolean | number = false,
) {
  const isFeelerSeg = Boolean((genome as any)._isFeeler || genome.name.startsWith("Feeler-"));
  const resolvedStrainName = (genome as any).parentStrainName || genome.name;
  const strainDeathStart = getStrainDeathStart(engine, resolvedStrainName);
  const isStrainAlreadyDying = strainDeathStart !== undefined;
  const shouldCountBiomass = !isFeelerSeg && !isStrainAlreadyDying && !isAppendage && thickness >= 0.022;

  if (!isAppendage) {
    (engine as any)._lastStemWriteSucceeded = false;
    if (p1.distanceToSquared(p2) < 1e-5) return;
  }

  let targetIndexStem = 0;
  let reusedFreeSlot = false;
  let extendedPrevSeg = false;
  let extendedStartThick: number | undefined = undefined;
  let newBiomassWeight = 1;
  if (!isAppendage) {
    const isSoft = !!(engine as any)._isSoftwareRaster;
    const canExtendPrev = false;
    let poppedFree = -1;
    const stemCap = isSoft ? getStemBudget(engine) + engine.dyingStems.size + 16 : engine.maxDOMs;
      while (engine.freeStemIndices && engine.freeStemIndices.length > 0) {
        const cand = engine.freeStemIndices.pop()!;
        if (cand < engine.pointCount && !engine.segments[cand]) {
          poppedFree = cand;
          break;
        }
      }
      if (poppedFree >= 0 && (!isSoft || poppedFree < stemCap)) {
        targetIndexStem = poppedFree;
        reusedFreeSlot = true;
      } else if (engine.pointCount < stemCap) {
        while (engine.pointCount < engine.maxDOMs && engine.segments[engine.pointCount]) {
          engine.pointCount++;
        }
        if (engine.pointCount >= engine.maxDOMs) return;
        targetIndexStem = engine.pointCount;
      } else {
        let foundSlot = -1;
        const searchLim = Math.min(engine.pointCount, isSoft ? stemCap : engine.maxDOMs);
        for (let i = 0; i < searchLim; i++) {
          if (!engine.segments[i]) {
            foundSlot = i;
            break;
          }
        }
        if (foundSlot >= 0) {
          targetIndexStem = foundSlot;
          reusedFreeSlot = true;
        } else if (!isSoft && engine.pointCount < engine.maxDOMs) {
          while (engine.pointCount < engine.maxDOMs && engine.segments[engine.pointCount]) {
            engine.pointCount++;
          }
          if (engine.pointCount >= engine.maxDOMs) return;
          targetIndexStem = engine.pointCount;
        } else {
          // Recycle single oldest feeler or furthest-faded dying slot without bulk-erasing the organism
          let victimSlot = -1;
          let bestScore = -1;
          const packA = engine.cylinderMesh?.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute | undefined;
          for (let i = 0; i < searchLim; i++) {
            const s = engine.segments[i];
            if (!s) { victimSlot = i; bestScore = 1e9; break; }
            const isDying = engine.dyingStems.has(i) || (engine.dyingStrains && engine.dyingStrains.has(s.strainName));
            if (!s.isFeeler && !isDying) continue;
            const dissolveProgress = packA?.getZ(i) ?? 0;
            const dAge = s.dyingStart ? Math.max(0, engine.unscaledTime - s.dyingStart) : 0;
            const ageScore = dAge * 10 + dissolveProgress * 5000 + (engine.time - s.timestamp) + (s.isFeeler ? 50000 : 0);
            if (ageScore > bestScore) {
              bestScore = ageScore;
              victimSlot = i;
            }
          }
          if (bestScore < 0) {
            return;
          }
          if (victimSlot >= 0) {
            targetIndexStem = victimSlot;
            reusedFreeSlot = true;
          } else if (engine.pointCount < engine.maxDOMs) {
            while (engine.pointCount < engine.maxDOMs && engine.segments[engine.pointCount]) {
              engine.pointCount++;
            }
            if (engine.pointCount >= engine.maxDOMs) return;
            targetIndexStem = engine.pointCount;
          } else {
            return;
          }
        }
      }
  }

  let appSlotIndex = 0;
  let isNewAppSlot = false;
  if (isAppendage) {
    const config = engine.appendages.get(genome.appendage);
    if (!config) return;
    const hardMaxApp = Math.floor(engine.maxDOMs / 4);
    const appendageLimit = Math.max(
      1,
      Math.min(getPerAppendageCap(engine) + config.dyingSet.size, hardMaxApp),
    );

    if (config.count < appendageLimit) {
      appSlotIndex = config.count;
      isNewAppSlot = true;
    } else {
      let emptySlot = -1;
      let bestDyingSlot = -1;
      let maxDyingAge = -1;
      let furthestLiveSlot = 0;
      let secondFurthestSlot = -1;
      let maxDist = -1;
      const searchLim = Math.min(config.mesh.count, appendageLimit);
      for (let i = 0; i < searchLim; i++) {
        const seg = config.segments[i];
        if (!seg) {
          emptySlot = i;
          break;
        }
        if (config.dyingSet.has(i)) {
          const dAge = engine.unscaledTime - (seg.dyingStart || 0);
          if (dAge > maxDyingAge) {
            maxDyingAge = dAge;
            bestDyingSlot = i;
          }
          continue;
        }
        const parentPos = engine.segments[seg.parentIndex]?.startPos || seg.rootOrigin;
        const d = parentPos ? getCameraDistanceRatio(engine, parentPos) : 0;
        if (d > maxDist) {
          secondFurthestSlot = furthestLiveSlot;
          maxDist = d;
          furthestLiveSlot = i;
        }
      }
      if (emptySlot >= 0) {
        appSlotIndex = emptySlot;
      } else if (bestDyingSlot >= 0) {
        appSlotIndex = bestDyingSlot;
      } else {
        appSlotIndex = furthestLiveSlot;
        if (secondFurthestSlot >= 0 && typeof engine.markDying === "function") {
          engine.markDying(config.segments, config.dyingSet, secondFurthestSlot, engine.unscaledTime);
        }
      }
    }

    const forward = new THREE.Vector3().subVectors(p2, p1);
    const distance = forward.length();
    if (distance < 0.0001) {
      forward.set(0, 0, 1);
    } else {
      forward.normalize();
    }

    // Build perpendicular reference vector
    const ref = Math.abs(forward.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(forward, ref).normalize();

    // 360-degree radial divergence angle around spine centerline (Golden ratio ~137.5° = 2.39996 rad)
    const phiAngle = appSlotIndex * (engine.phyllotaxisAngle ? (engine.phyllotaxisAngle * Math.PI / 180) : 2.39996323);
    const radialDir = right.clone().applyAxisAngle(forward, phiAngle).normalize();

    // Stem outer radius
    const stemRadius = Math.max(0.12, thickness * 0.35);

    // Position dummy on outer surface along radial direction
    engine.dummy.position.copy(p1).addScaledVector(radialDir, stemRadius);

    // Orient appendage to point directly outwards along radialDir away from spine core
    const targetPoint = engine.dummy.position.clone().add(radialDir);
    engine.dummy.lookAt(targetPoint);
  } else {
    engine.dummy.position.copy(p1);
    const distance = p1.distanceTo(p2);
    if (distance > 0.0001) {
      engine.dummy.lookAt(p2);
    } else {
      engine.dummy.quaternion.identity();
    }
  }

  const distance = Math.max(0.001, p1.distanceTo(p2));
  const minVisThick = !isAppendage ? (isFeelerSeg ? 0.04 : 0.035) : 0.001;
  const visThick = Math.max(minVisThick, thickness);
  let scaleX = visThick;
  let scaleY = visThick;
  let scaleZ = distance;
  const stemAnchor = !isAppendage && agentId !== undefined ? engine.agentAnchorMap.get(agentId) : undefined;
  const distFromRoot = stemAnchor?.rootOrigin ? p1.distanceTo(stemAnchor.rootOrigin) : 999;
  const isRootNubSeg = typeof isTerminal === "number" && isTerminal > 2.5;
  const ribbonBlend = isRootNubSeg ? 0.0 : THREE.MathUtils.clamp(distFromRoot / 8.0, 0.0, 1.0);

  if (!isAppendage) {
    if (genome.geometryType === "ribbon") {
      scaleX = visThick * (1.0 + 0.65 * ribbonBlend);
      scaleY = visThick * THREE.MathUtils.lerp(1.0, 0.52, ribbonBlend);
      scaleZ = distance * 1.02;
    } else {
      scaleZ = distance * 1.02;
    }
  }

  const isRainbow = genome.multicolorAppendage || genome.gradientGrowth;
  const finalColor = genome.color.clone();
  
  // Apply low saturation limit only to rainbow/multicolor creatures; all other creatures have full saturation
  const hsl = finalColor.getHSL({ h: 0, s: 0, l: 0 });
  if (isRainbow && hsl.s > engine.maxSaturation) {
    finalColor.setHSL(hsl.h, engine.maxSaturation, hsl.l);
  }

  if (genome.gradientGrowth) {
    let gType = genome.gradientType ?? 1;
    if (gType === 0) gType = 1;
    const t = engine.time * 0.001;

    if (gType === 1) {
      // Type 1: 3-Color Triadic Harmonious Gradient (BaseHue -> BaseHue+120° -> BaseHue+240°)
      const phase = (Math.sin(t * 0.8) + 1.0) * 0.5;
      let hueOffset = 0;
      if (phase < 0.5) {
        hueOffset = THREE.MathUtils.lerp(0, 0.333, phase * 2.0);
      } else {
        hueOffset = THREE.MathUtils.lerp(0.333, 0.666, (phase - 0.5) * 2.0);
      }
      finalColor.offsetHSL(hueOffset, 0, 0);
    } else if (gType === 2) {
      // Type 2: Analogous / Soft Adjacent (+/- 30° adjacent hue oscillation)
      const shift = Math.sin(t * 1.2) * 0.083;
      finalColor.offsetHSL(shift, 0, 0);
    } else if (gType === 3) {
      // Type 3: 3-Color Analogous Sunset Gradient (BaseHue -> BaseHue+45° -> BaseHue+90°)
      const phase = (Math.sin(t * 1.1) + 1.0) * 0.5;
      let hueOffset = 0;
      if (phase < 0.5) {
        hueOffset = THREE.MathUtils.lerp(0, 0.125, phase * 2.0);
      } else {
        hueOffset = THREE.MathUtils.lerp(0.125, 0.25, (phase - 0.5) * 2.0);
      }
      finalColor.offsetHSL(hueOffset, 0, 0);
    } else if (gType === 4) {
      // Type 4: Monochromatic Luster (oscillating lightness and saturation within same hue family)
      const baseHSL = genome.color.getHSL({ h: 0, s: 0, l: 0 });
      const sShift = Math.sin(t * 1.3) * 0.2;
      const lShift = Math.cos(t * 1.3) * 0.15;
      finalColor.setHSL(
        baseHSL.h,
        THREE.MathUtils.clamp(baseHSL.s + sShift, 0.3, 0.95),
        THREE.MathUtils.clamp(baseHSL.l + lShift, 0.3, 0.75)
      );
    }
  }

  let targetMesh = engine.cylinderMesh;
  let targetIndex = targetIndexStem;

  if (isAppendage) {
    const config = engine.appendages.get(genome.appendage);
    if (config) {
      targetMesh = config.mesh;
      targetIndex = appSlotIndex;

      const isLeafType = genome.appendage === "leaves" || genome.appendage === "ferns";
      const scaleDial = isLeafType ? (engine.leafScale ?? 0.55) : (engine.flowerSize ?? 1.0);
      const thickFactor = THREE.MathUtils.clamp(0.55 + Math.min(thickness, 1.2) * 0.45, 0.55, 1.1);
      const baseScale = 2.0 * scaleDial * 0.70 * thickFactor;
      if (genome.appendage === "flowers") {
        scaleX = baseScale * 1.8;
        scaleY = baseScale * 1.8;
        scaleZ = baseScale * 2.2;
      } else if (genome.appendage === "spores") {
        scaleX = baseScale * 2.0;
        scaleY = baseScale * 2.0;
        scaleZ = baseScale * 2.0;
      } else if (genome.appendage === "crystals") {
        scaleX = baseScale * 1.8;
        scaleY = baseScale * 1.8;
        scaleZ = baseScale * 2.2;
      } else if (genome.appendage === "needles") {
        scaleX = baseScale * 2.2;
        scaleY = baseScale * 2.2;
        scaleZ = baseScale * 2.8;
      } else if (
        genome.appendage === "lillyPads" ||
        genome.appendage === "scales"
      ) {
        scaleX = baseScale * 2.2;
        scaleY = baseScale * 0.4;
        scaleZ = baseScale * 2.2;
      } else if (genome.appendage === "leaves" || genome.appendage === "ferns") {
        scaleX = baseScale * 2.0;
        scaleY = baseScale * 2.0;
        scaleZ = baseScale * 2.2;
      } else if (genome.appendage === "petals") {
        scaleX = baseScale * 2.0;
        scaleY = baseScale * 0.4;
        scaleZ = baseScale * 2.0;
      } else if (genome.appendage === "thorns") {
        scaleX = baseScale * 2.2;
        scaleY = baseScale * 2.2;
        scaleZ = baseScale * 2.8;
      } else if (genome.appendage === "spirals") {
        scaleX = baseScale * 1.1;
        scaleY = baseScale * 1.1;
        scaleZ = baseScale * 1.1;
      } else if (genome.appendage === "curlyHair") {
        scaleX = baseScale * 1.1;
        scaleY = baseScale * 1.1;
        scaleZ = baseScale * 1.1;
      } else if (genome.appendage === "hair") {
        scaleX = baseScale * 2.2;
        scaleY = baseScale * 2.2;
        scaleZ = baseScale * 2.2;
      } else if (genome.appendage === "sparkles") {
        scaleX = baseScale * 1.4;
        scaleY = baseScale * 1.4;
        scaleZ = baseScale * 1.4;
      } else if (genome.appendage === "buds") {
        scaleX = baseScale * 1.8;
        scaleY = baseScale * 1.8;
        scaleZ = baseScale * 1.8;
      } else {
        scaleX = baseScale * 2.0;
        scaleY = baseScale * 2.0;
        scaleZ = baseScale * 2.0;
      }

      // Appendages match body stem color 100% (No multi-color appendage mismatched chaos)
      // finalColor remains identical to genome.color (body stem color)
      
      // Re-apply saturation limit after offsetHSL only if rainbow creature
      const appHsl = finalColor.getHSL({ h: 0, s: 0, l: 0 });
      if (isRainbow && appHsl.s > engine.maxSaturation) {
        finalColor.setHSL(appHsl.h, engine.maxSaturation, appHsl.l);
      }
    } else {
      return;
    }
  }

  if (genome.appendage === "sparkles" && Math.random() < 0.2) {
    finalColor.multiplyScalar(2.0);
  }

  engine.dummy.scale.set(scaleX, scaleY, scaleZ);
  engine.dummy.updateMatrix();
  const fullMatrix = engine.dummy.matrix.clone();

  if (isAppendage) {
    if (genome.appendage === "leaves" || genome.appendage === "ferns") {
      const initMult = engine.leafScale ?? 0.55;
      engine.dummy.scale.set(scaleX * initMult, scaleY * initMult, scaleZ * initMult);
    } else {
      engine.dummy.scale.set(0, 0, 0);
    }
    engine.dummy.updateMatrix();
  }

  if (genome.geometryType === "ribbon" && !isAppendage && ribbonBlend > 0.01) {
    engine.dummy.rotateZ((engine.time * 0.02 + p1.length() * 0.05) * ribbonBlend);
    engine.dummy.updateMatrix();
  }

  targetMesh.setMatrixAt(targetIndex, engine.dummy.matrix);
  targetMesh.setColorAt(targetIndex, finalColor);

  const packAAttr = targetMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
  const packBAttr = targetMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;
  if (packAAttr && packBAttr) {
    // Pack A: [glow, glowTrait, decay, hash]
    packAAttr.setX(targetIndex, engine.enableGlow ? engine.glowSize : 0.0);
    packAAttr.setY(targetIndex, genome.isGlowing ? 1.0 : 0.0);
    packAAttr.setZ(targetIndex, 0.0); // decay starts at 0
    
    let genomeHash = genome.genomeHash;
    if (genomeHash === undefined) {
      if (genome.name.startsWith("Alpha")) {
        genomeHash = 0.1;
      } else if (genome.name.startsWith("Beta")) {
        genomeHash = 0.9;
      } else {
        let h = 0;
        for(let i=0; i<genome.name.length; i++) {
            h = Math.imul(31, h) + genome.name.charCodeAt(i) | 0;
        }
        genomeHash = (Math.abs(h) % 1000) / 1000;
      }
    }
    packAAttr.setW(targetIndex, genomeHash);
    
    // Pack B: [growth, vernation, succulence, leafDivision]
    packBAttr.setX(targetIndex, isAppendage ? APPENDAGE_BIRTH_GROWTH_INIT : STEM_BIRTH_GROWTH_INIT);
    
    let vernVal = 0.0;
    if (genome.vernationType === "convolute") vernVal = 1.0;
    else if (genome.vernationType === "conduplicate") vernVal = 2.0;
    
    packBAttr.setY(targetIndex, vernVal);
    if (isAppendage) {
      packBAttr.setZ(targetIndex, genome.succulence ?? 0.5);
    } else {
      const prevIdx = agentId !== undefined ? engine.lastAgentStemIndex?.get(agentId) : undefined;
      const prevSeg = prevIdx !== undefined ? engine.segments[prevIdx] : undefined;
      // DO NOT snap prevIdx to 1.0 or delete it from growingStems!
      // Every stem segment must stay in engine.growingStems until SimulationUpdateVisuals ramps its packBAttr.x to 1.0.
      const startThick = extendedStartThick !== undefined
        ? extendedStartThick
        : (prevSeg && prevSeg.endPos && prevSeg.endPos.distanceToSquared(p1) < 0.09)
          ? prevSeg.thickness
          : thickness;
      const stemStartRatio = THREE.MathUtils.clamp(Math.max(minVisThick, startThick) / visThick, 0.45, 2.25);
      packBAttr.setZ(targetIndex, stemStartRatio);
    }
    packBAttr.setW(
      targetIndex,
      typeof isTerminal === "number" ? isTerminal : isTerminal ? 2.0 : (genome.leafDivision ?? 0.5),
    );
    
    markInstanceIndexDirty(packAAttr, targetIndex);
    markInstanceIndexDirty(packBAttr, targetIndex);
  }

  if (targetMesh === engine.cylinderMesh) {
    const prevSeg = engine.segments[targetIndex];
    if (prevSeg) {
      if (prevSeg.countsForBiomass) {
        const prevCount = engine.biomassMap.get(prevSeg.strainName) || 0;
        const weight = prevSeg.biomassWeight ?? 1;
        if (prevCount > weight) engine.biomassMap.set(prevSeg.strainName, prevCount - weight);
        else engine.biomassMap.delete(prevSeg.strainName);
      }
      remapAppendageParent(engine, targetIndex, targetIndex, engine.time);
    }
    if (isStrainAlreadyDying) {
      engine.dyingStems.add(targetIndex);
    } else {
      engine.dyingStems.delete(targetIndex);
    }
    if (engine.growingStems) engine.growingStems.add(targetIndex);
    engine.lastStemIndex = targetIndex;
    if (agentId !== undefined && engine.lastAgentStemIndex) {
      engine.lastAgentStemIndex.set(agentId, targetIndex);
    }

    const anchor = agentId !== undefined ? engine.agentAnchorMap.get(agentId) : undefined;
    const rootOrigin = anchor?.rootOrigin ? anchor.rootOrigin.clone() : p1.clone();
    const branchBasePos = anchor?.branchBasePos ? anchor.branchBasePos.clone() : rootOrigin.clone();
    const branchDepth = anchor?.branchDepth ?? 0;

    const rootAnchorAttr = targetMesh.geometry.getAttribute("instanceRootAnchor") as THREE.InstancedBufferAttribute;
    const branchAnchorAttr = targetMesh.geometry.getAttribute("instanceBranchAnchor") as THREE.InstancedBufferAttribute;
    if (rootAnchorAttr && branchAnchorAttr) {
      let strainPhase = 0.0;
      for (let i = 0; i < resolvedStrainName.length; i++) {
        strainPhase = (strainPhase * 31 + resolvedStrainName.charCodeAt(i)) % 1000;
      }
      strainPhase = (strainPhase / 1000.0) * Math.PI * 2.0;
      const strainGenome = engine.genomeMap?.get(resolvedStrainName) || genome;
      const isSeaweed = (strainGenome?.windStyle ?? "seaweed") === "seaweed";
      rootAnchorAttr.setXYZW(targetIndex, rootOrigin.x, rootOrigin.y, rootOrigin.z, strainPhase + (isSeaweed ? 100.0 : 0.0));
      branchAnchorAttr.setXYZW(targetIndex, branchBasePos.x, branchBasePos.y, branchBasePos.z, branchDepth > 0 ? 1.0 : 0.0);
      markInstanceIndexDirty(rootAnchorAttr, targetIndex);
      markInstanceIndexDirty(branchAnchorAttr, targetIndex);
    }

    engine.segments[targetIndex] = {
      index: targetIndex,
      timestamp: engine.time,
      matrix: fullMatrix,
      thickness,
      strainName: resolvedStrainName,
      agentId: agentId,
      countsForBiomass: shouldCountBiomass,
      isFeeler: isFeelerSeg,
      dyingStart: strainDeathStart,
      rootOrigin,
      branchBasePos,
      branchDepth,
      startPos: p1.clone(),
      endPos: p2.clone(),
      biomassWeight: newBiomassWeight,
      isTerminal,
    };
    if (!reusedFreeSlot) {
      engine.pointCount++;
    }
    engine.cylinderMesh.count = Math.min(engine.pointCount, engine.maxDOMs);
    (engine as any)._lastStemWriteSucceeded = true;
  } else {
    const config = engine.appendages.get(genome.appendage);
    if (config) {
      if (isStrainAlreadyDying) {
        config.dyingSet.add(targetIndex);
      } else {
        config.dyingSet.delete(targetIndex);
      }
      if (isNewAppSlot) {
        config.count++;
      }
      config.mesh.count = Math.max(config.mesh.count, Math.min(config.count, Math.floor(engine.maxDOMs / 4)));
      config.mesh.visible = config.mesh.count > 0;
      const lastStemIdx =
        agentId !== undefined && engine.lastAgentStemIndex && engine.lastAgentStemIndex.has(agentId)
          ? engine.lastAgentStemIndex.get(agentId)!
          : (engine.lastStemIndex ?? ((engine.pointCount > 0 ? engine.pointCount - 1 : 0) % engine.maxDOMs));

      const parentSeg = engine.segments[lastStemIdx];
      const anchor = agentId !== undefined ? engine.agentAnchorMap.get(agentId) : undefined;
      const rootOrigin = parentSeg?.rootOrigin ? parentSeg.rootOrigin.clone() : (anchor?.rootOrigin ? anchor.rootOrigin.clone() : p1.clone());
      const branchBasePos = parentSeg?.branchBasePos ? parentSeg.branchBasePos.clone() : (anchor?.branchBasePos ? anchor.branchBasePos.clone() : rootOrigin.clone());
      const branchDepth = parentSeg?.branchDepth ?? anchor?.branchDepth ?? 0;

      const rootAnchorAttr = targetMesh.geometry.getAttribute("instanceRootAnchor") as THREE.InstancedBufferAttribute;
      const branchAnchorAttr = targetMesh.geometry.getAttribute("instanceBranchAnchor") as THREE.InstancedBufferAttribute;
      if (rootAnchorAttr && branchAnchorAttr) {
        let strainPhase = 0.0;
        for (let i = 0; i < resolvedStrainName.length; i++) {
          strainPhase = (strainPhase * 31 + resolvedStrainName.charCodeAt(i)) % 1000;
        }
        strainPhase = (strainPhase / 1000.0) * Math.PI * 2.0;
        const strainGenome = engine.genomeMap?.get(resolvedStrainName) || genome;
        const isSeaweed = (strainGenome?.windStyle ?? "seaweed") === "seaweed";
        rootAnchorAttr.setXYZW(targetIndex, rootOrigin.x, rootOrigin.y, rootOrigin.z, strainPhase + (isSeaweed ? 100.0 : 0.0));
        branchAnchorAttr.setXYZW(targetIndex, branchBasePos.x, branchBasePos.y, branchBasePos.z, branchDepth > 0 ? 1.0 : 0.0);
        markInstanceIndexDirty(rootAnchorAttr, targetIndex);
        markInstanceIndexDirty(branchAnchorAttr, targetIndex);
      }

      config.segments[targetIndex] = {
        index: targetIndex,
        timestamp: engine.time,
        matrix: fullMatrix,
        thickness,
        strainName: genome.name,
        agentId: agentId,
        parentIndex: lastStemIdx,
        parentTimestamp: engine.segments[lastStemIdx]?.timestamp ?? engine.time,
        randomFactor: genome.appendage === "leaves" ? Math.random() : undefined,
        countsForBiomass: false,
        dyingStart: strainDeathStart,
        rootOrigin,
        branchBasePos,
        branchDepth,
      };
    }
  }

  markInstanceIndexDirty(targetMesh.instanceMatrix, targetIndex);
  if (targetMesh.instanceColor) markInstanceIndexDirty(targetMesh.instanceColor, targetIndex);
  if (shouldCountBiomass) {
    engine.biomassMap.set(
      genome.name,
      (engine.biomassMap.get(genome.name) || 0) + newBiomassWeight,
    );
    engine.genomeMap.set(genome.name, genome);
  } else if (!genome.name.startsWith("Feeler-")) {
    engine.genomeMap.set(genome.name, genome);
  }
}

export function processDyingSegments(
  engine: SimulationEngine,
  segments: any[],
  dyingSet: Set<number>,
  mesh: THREE.InstancedMesh,
  isFlower: boolean = false,
) {
  const isHybrid = engine.hybridMeshes.includes(mesh);
  const hybridVariantId = isHybrid ? engine.hybridMeshes.indexOf(mesh) : -1;

  let changed = false;
  for (const idx of dyingSet) {
    const seg = segments[idx];
    if (seg && isHybrid && seg.variant !== hybridVariantId) continue;

    if (!seg || !seg.dyingStart) {
      dyingSet.delete(idx);
      if (seg) {
        engine.dummy.matrix.identity();
        engine.dummy.scale.set(0, 0, 0);
        engine.dummy.updateMatrix();
        mesh.setMatrixAt(idx, engine.dummy.matrix);
        segments[idx] = undefined as any;
      }
      changed = true;
      continue;
    }
    const fadeAge = engine.unscaledTime - seg.dyingStart;
    // 540 unscaled frame ticks = ~9.0 seconds of slow, gentle transparency + luminance dissolve for dying organisms.
    // Feeler trails dissolve rapidly (~0.9 s) so they never linger as unbranched snake lines.
    const wipeDuration = seg.isFeeler
      ? 55.0 * (10 / Math.max(1, engine.feelerFade ?? 10))
      : 540.0;

    if (fadeAge >= wipeDuration) {
      engine.dummy.matrix.identity();
      engine.dummy.scale.set(0, 0, 0);
      engine.dummy.updateMatrix();
      mesh.setMatrixAt(idx, engine.dummy.matrix);
      segments[idx] = undefined as any;
      dyingSet.delete(idx);
      changed = true;

      if (mesh === engine.cylinderMesh) {
        if (engine.growingStems) engine.growingStems.delete(idx);
        if (engine.freeStemIndices) {
          engine.freeStemIndices.push(idx);
        }
      }

      const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (packAAttr) {
        packAAttr.setZ(idx, 1.0);
      }
    } else {
      const t = Math.min(1.0, Math.max(0.0, fadeAge / wipeDuration));
      const dissolveProgress = t * t * (3.0 - 2.0 * t);

      const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (packAAttr) {
        packAAttr.setZ(idx, dissolveProgress);
      }
      changed = true;
    }
  }
  if (changed) {
    markActiveInstancesDirty(mesh.instanceMatrix, mesh.count);
    const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
    if (packAAttr) markActiveInstancesDirty(packAAttr, mesh.count);
  }
}
