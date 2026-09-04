import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome } from "./SimulationTypes";

export function updateMeshSegments(
  engine: SimulationEngine,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  genome: Genome,
  thickness: number,
  isAppendage = false,
  agentId?: number,
  isTerminal = false,
) {
  // Protect the first 2,000 slots (base trunks & roots) from ever being overwritten
  const trunkReserved = Math.min(2000, Math.floor(engine.maxDOMs * 0.1));
  let targetIndexStem: number;
  if (engine.freeStemIndices && engine.freeStemIndices.length > 0) {
    // 1. First priority: Reuse slots freed by dissolved segments
    targetIndexStem = engine.freeStemIndices.pop()!;
  } else if (engine.pointCount < engine.maxDOMs) {
    // 2. Normal sequential allocation while filling initial capacity
    targetIndexStem = engine.pointCount;
  } else {
    // 3. Ring buffer wrap-around: wrap strictly within non-trunk slots (never overwrites base/trunk)
    const recycleSpan = Math.max(1, engine.maxDOMs - trunkReserved);
    targetIndexStem = trunkReserved + ((engine.pointCount - trunkReserved) % recycleSpan);
  }

  if (isAppendage) {
    const appendageLimit = Math.floor(engine.maxDOMs / 4);
    const config = engine.appendages.get(genome.appendage);
    const appIndex = config ? config.count % appendageLimit : targetIndexStem;

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
    const phiAngle = appIndex * (engine.phyllotaxisAngle ? (engine.phyllotaxisAngle * Math.PI / 180) : 2.39996323);
    const radialDir = right.clone().applyAxisAngle(forward, phiAngle).normalize();

    // Stem outer radius
    const stemRadius = Math.max(0.5, thickness * 0.45);

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
  let scaleX = Math.max(0.001, thickness);
  let scaleY = Math.max(0.001, thickness);
  let scaleZ = distance;

  if (!isAppendage) {
    if (genome.geometryType === "ribbon") {
      scaleX = thickness * 2.2;
      scaleY = Math.max(0.6, thickness * 0.8);
      scaleZ = distance * 1.02;
    } else if (genome.geometryType === "segmented") {
      const gap = engine.segmentGap !== undefined ? engine.segmentGap : 0.12;
      scaleZ = distance * Math.max(0.05, 1.0 - gap);
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
    const appendageLimit = Math.floor(engine.maxDOMs / 4);
    const config = engine.appendages.get(genome.appendage);
    if (config) {
      targetMesh = config.mesh;
      targetIndex = config.count % appendageLimit;

      const isLeafType = genome.appendage === "leaves" || genome.appendage === "ferns";
      const scaleDial = isLeafType ? (engine.leafScale ?? 0.55) : (engine.flowerSize ?? 1.0);
      const baseScale = 2.0 * scaleDial * 0.70;
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
    engine.dummy.scale.set(0, 0, 0);
    engine.dummy.updateMatrix();
  }

  if (genome.geometryType === "ribbon" && !isAppendage) {
    engine.dummy.rotateZ(engine.time * 0.02 + p1.length() * 0.05);
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
    packBAttr.setX(targetIndex, isAppendage ? 0.01 : 1.0); // Stems start fully solid (1.0), appendages grow out
    
    let vernVal = 0.0;
    if (genome.vernationType === "convolute") vernVal = 1.0;
    else if (genome.vernationType === "conduplicate") vernVal = 2.0;
    
    packBAttr.setY(targetIndex, vernVal);
    packBAttr.setZ(targetIndex, genome.succulence ?? 0.5);
    packBAttr.setW(targetIndex, isTerminal ? 2.0 : (genome.leafDivision ?? 0.5));
    
    packAAttr.needsUpdate = true;
    packBAttr.needsUpdate = true;
  }

  const shouldCountBiomass = !genome.name.startsWith("Feeler-") && !isAppendage && thickness >= 0.35;

  if (targetMesh === engine.cylinderMesh) {
    engine.dyingStems.delete(targetIndex);
    engine.segments[targetIndex] = {
      index: targetIndex,
      timestamp: engine.time,
      matrix: fullMatrix,
      thickness,
      strainName: genome.name,
      agentId: agentId,
      countsForBiomass: shouldCountBiomass,
    };
    engine.pointCount++;
    engine.cylinderMesh.count = Math.min(engine.pointCount, engine.maxDOMs);
  } else {
    const config = engine.appendages.get(genome.appendage);
    if (config) {
      const appLimit = Math.floor(engine.maxDOMs / 4);
      config.dyingSet.delete(targetIndex);
      config.count++;
      config.mesh.count = Math.min(config.count, appLimit);
      const lastStemIdx = (engine.pointCount > 0 ? engine.pointCount - 1 : 0) % engine.maxDOMs;
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
      };
    }
  }

  targetMesh.instanceMatrix.needsUpdate = true;
  if (targetMesh.instanceColor) targetMesh.instanceColor.needsUpdate = true;
  if (shouldCountBiomass) {
    engine.biomassMap.set(
      genome.name,
      (engine.biomassMap.get(genome.name) || 0) + 1,
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
    // 180 unscaled frame ticks = 3.0 seconds of real-time transparency fade OUT
    const wipeDuration = 180.0;

    if (fadeAge >= wipeDuration) {
      engine.dummy.matrix.identity();
      engine.dummy.scale.set(0, 0, 0);
      engine.dummy.updateMatrix();
      mesh.setMatrixAt(idx, engine.dummy.matrix);
      segments[idx] = undefined as any;
      dyingSet.delete(idx);
      changed = true;

      if (mesh === engine.cylinderMesh && engine.freeStemIndices) {
        engine.freeStemIndices.push(idx);
      }

      const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (packAAttr) {
        packAAttr.setZ(idx, 1.0);
      }
    } else {
      const dissolveProgress = Math.min(1.0, fadeAge / wipeDuration);

      const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (packAAttr) {
        packAAttr.setZ(idx, dissolveProgress);
      }
      changed = true;
    }
  }
  if (changed) {
    mesh.instanceMatrix.needsUpdate = true;
    const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
    if (packAAttr) packAAttr.needsUpdate = true;
  }
}
