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
) {
  const targetIndexStem = engine.pointCount % engine.maxDOMs;

  const distance = p1.distanceTo(p2);
  engine.dummy.position.copy(p1);
  engine.dummy.lookAt(p2);

  let scaleX = thickness;
  let scaleY = thickness;
  let scaleZ = distance;

  if (!isAppendage) {
    if (genome.geometryType === "ribbon") {
      scaleX = thickness * 3;
      scaleY = Math.max(0.1, thickness * 0.15);
    } else if (genome.geometryType === "segmented") {
      scaleZ = distance * 0.6;
    }
  }

  const finalColor = genome.color.clone();
  
  // Apply real-time saturation limit
  const hsl = finalColor.getHSL({ h: 0, s: 0, l: 0 });
  if (hsl.s > engine.maxSaturation) {
    finalColor.setHSL(hsl.h, engine.maxSaturation, hsl.l);
  }

  if (genome.gradientGrowth) {
    finalColor.offsetHSL((engine.time * 0.001) % 1.0, 0, 0);
  }

  let targetMesh = engine.cylinderMesh;
  let targetIndex = targetIndexStem;

  if (isAppendage) {
    const appendageLimit = Math.floor(engine.maxDOMs / 4);
    const config = engine.appendages.get(genome.appendage);
    if (config) {
      targetMesh = config.mesh;
      targetIndex = config.count % appendageLimit;

      if (genome.appendage === "flowers") {
        scaleX = thickness * 6 * engine.flowerSize;
        scaleY = thickness * 6 * engine.flowerSize;
        scaleZ = thickness * 8 * engine.flowerSize;
      } else if (genome.appendage === "needles") {
        scaleX = thickness * 1.5;
        scaleY = thickness * 1.5;
        scaleZ = thickness * 15;
      } else if (
        genome.appendage === "leaves" ||
        genome.appendage === "scales"
      ) {
        scaleX = thickness * 8;
        scaleY = thickness * 0.4;
        scaleZ = thickness * 10;
      } else if (genome.appendage === "petals") {
        scaleX = thickness * 10;
        scaleY = thickness * 0.2;
        scaleZ = thickness * 6;
      } else if (genome.appendage === "thorns") {
        scaleX = thickness * 3;
        scaleY = thickness * 3;
        scaleZ = thickness * 6;
      } else if (
        genome.appendage === "hair" ||
        genome.appendage === "curlyHair" ||
        genome.appendage === "spirals"
      ) {
        scaleX = thickness * 2;
        scaleY = thickness * 2;
        scaleZ = thickness * 2;
      } else {
        scaleX = thickness * 4;
        scaleY = thickness * 4;
        scaleZ = thickness * 4;
      }

      if (genome.multicolorAppendage) {
        if (Math.random() < 0.5) {
          finalColor.offsetHSL(0.3 + Math.random() * 0.4, 0, 0);
        }
      } else if (!genome.sameColorAppendage) {
        finalColor.offsetHSL(0.5, 0, 0);
      }
      
      // Re-apply saturation limit after offsetHSL which might alter or preserve it 
      // depending on implementation, or just to be safe.
      const appHsl = finalColor.getHSL({ h: 0, s: 0, l: 0 });
      if (appHsl.s > engine.maxSaturation) {
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

  const glowAttr = targetMesh.geometry.getAttribute(
    "instanceGlow",
  ) as THREE.InstancedBufferAttribute;
  const decayAttr = targetMesh.geometry.getAttribute(
    "instanceDecay",
  ) as THREE.InstancedBufferAttribute;
  const hashAttr = targetMesh.geometry.getAttribute(
    "instanceHash",
  ) as THREE.InstancedBufferAttribute;
  const growthAttr = targetMesh.geometry.getAttribute(
    "instanceGrowth",
  ) as THREE.InstancedBufferAttribute;
  if (glowAttr && decayAttr && hashAttr) {
    glowAttr.setX(targetIndex, engine.enableGlow ? engine.glowSize : 0.0);
    decayAttr.setX(targetIndex, 0.0);
    if (growthAttr) {
      growthAttr.setX(targetIndex, 0.01);
      growthAttr.needsUpdate = true;
    }
    
    let genomeHash = 0;
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
    hashAttr.setX(targetIndex, genomeHash);
    
    glowAttr.needsUpdate = true;
    decayAttr.needsUpdate = true;
    hashAttr.needsUpdate = true;

    const glowTraitAttr = targetMesh.geometry.getAttribute(
      "instanceGlowTrait",
    ) as THREE.InstancedBufferAttribute;
    if (glowTraitAttr) {
      glowTraitAttr.setX(targetIndex, genome.isGlowing ? 1.0 : 0.0);
      glowTraitAttr.needsUpdate = true;
    }
  }

  if (targetMesh === engine.cylinderMesh) {
    engine.dyingStems.delete(targetIndex);
    engine.segments[targetIndex] = {
      index: targetIndex,
      timestamp: engine.time,
      matrix: fullMatrix,
      thickness,
      strainName: genome.name,
    };
    engine.pointCount++;
    engine.cylinderMesh.count = Math.min(engine.pointCount, engine.maxDOMs);
  } else {
    const config = engine.appendages.get(genome.appendage);
    if (config) {
      config.dyingSet.delete(targetIndex);
      config.count = Math.min(config.count + 1, Math.floor(engine.maxDOMs / 4));
      config.mesh.count = config.count;
      config.segments[targetIndex] = {
        index: targetIndex,
        timestamp: engine.time,
        matrix: fullMatrix,
        thickness,
        strainName: genome.name,
        parentIndex: targetIndexStem,
        parentTimestamp: engine.time,
      };
    }
  }

  targetMesh.instanceMatrix.needsUpdate = true;
  if (targetMesh.instanceColor) targetMesh.instanceColor.needsUpdate = true;
  engine.biomassMap.set(
    genome.name,
    (engine.biomassMap.get(genome.name) || 0) + 1,
  );
  engine.genomeMap.set(genome.name, genome);
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
    const fadeAge = engine.time - seg.dyingStart;
    const desiccationSpeed = engine.desiccationSpeed || 1.0;
    const wipeDuration =
      (isHybrid ? engine.hybridStickiness * 12 : 600) / desiccationSpeed;
    if (fadeAge > wipeDuration) {
      engine.dummy.matrix.identity();
      engine.dummy.scale.set(0, 0, 0);
      engine.dummy.updateMatrix();
      mesh.setMatrixAt(idx, engine.dummy.matrix);
      segments[idx] = undefined as any;
      dyingSet.delete(idx);
      changed = true;

      const decayAttr = mesh.geometry.getAttribute(
        "instanceDecay",
      ) as THREE.InstancedBufferAttribute;
      if (decayAttr) {
        decayAttr.setX(idx, 0.0);
        decayAttr.needsUpdate = true;
      }
    } else {
      const shrink = fadeAge / wipeDuration;

      const decayAttr = mesh.geometry.getAttribute(
        "instanceDecay",
      ) as THREE.InstancedBufferAttribute;
      if (decayAttr) {
        decayAttr.setX(idx, Math.min(shrink, 1.0));
        decayAttr.needsUpdate = true;
      }
      
      if (isHybrid && seg && seg.matrix) {
        engine.dummy.matrix.copy(seg.matrix);
        engine.dummy.matrix.decompose(
          engine.dummy.position,
          engine.dummy.quaternion,
          engine.dummy.scale,
        );
        engine.dummy.scale.multiplyScalar(Math.max(1.0 - shrink, 0.001));
        engine.dummy.updateMatrix();
        mesh.setMatrixAt(idx, engine.dummy.matrix);
      } else if (!decayAttr) {
        if (seg && seg.matrix) {
          engine.dummy.matrix.copy(seg.matrix);
          engine.dummy.matrix.decompose(
            engine.dummy.position,
            engine.dummy.quaternion,
            engine.dummy.scale,
          );

          let baseScale = 1.0;
          if (isFlower) baseScale = engine.flowerSize;

          engine.dummy.scale.multiplyScalar(
            Math.max((1.0 - shrink) * baseScale, 0.001),
          );
          engine.dummy.updateMatrix();
          mesh.setMatrixAt(idx, engine.dummy.matrix);
        } else {
          mesh.getMatrixAt(idx, engine.dummy.matrix);
          engine.dummy.matrix.decompose(
            engine.dummy.position,
            engine.dummy.quaternion,
            engine.dummy.scale,
          );
          engine.dummy.scale.multiplyScalar(0.9);
          engine.dummy.updateMatrix();
          mesh.setMatrixAt(idx, engine.dummy.matrix);
        }
      }
      changed = true;
    }
  }
  if (changed) mesh.instanceMatrix.needsUpdate = true;
}
