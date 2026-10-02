import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent, Segment } from "./SimulationTypes";
import {
  markActiveInstancesDirty,
  markInstanceIndexDirty,
  createFastStemMaterial,
  createFastLeafMaterial,
  createFastAppendageMaterial,
  deleteStrainAppendages,
} from "./SimulationVertexTrimmer";
import { applyLodTier } from "./SimulationLOD";

export { createFastStemMaterial, createFastLeafMaterial, createFastAppendageMaterial } from "./SimulationVertexTrimmer";

export function extrudePointedTerminalCap(
  engine: SimulationEngine,
  agent: Agent,
  genome: any,
  startThickness: number,
) {
  if (agent.isFeeler) return;
  const currThickness = Math.max(0.04, startThickness);
  const dir = agent.direction.clone().normalize();
  if (dir.lengthSq() < 0.001) dir.set(0, 1, 0);

  const tipLength = Math.max(0.25, currThickness * 1.4);
  const tipPos = agent.position.clone().addScaledVector(dir, tipLength);

  engine.addLineSegment(
    agent.position,
    tipPos,
    agent.realGenome || genome,
    Math.max(0.001, currThickness),
    false,
    agent.id,
    true,
  );
}

export function extrudeRootNubCap(
  _engine: SimulationEngine,
  _agent: Agent,
  _genome: any,
  _baseThickness: number,
) {
  // No-op: backwards root nub extrusion created an inverted-direction V-notch at trunk bases.
  return;
}

export function getCameraReferenceDistance(engine: SimulationEngine): number {
  if (!engine.camera) return 120;
  const target = engine.controls?.target || new THREE.Vector3(0, 18.92, 0);
  return Math.max(60, engine.camera.position.distanceTo(target));
}

export function getCameraDistanceRatio(engine: SimulationEngine, pos: THREE.Vector3): number {
  if (!engine.camera) return 1.0;
  return pos.distanceTo(engine.camera.position) / getCameraReferenceDistance(engine);
}

export function getPrunePressure(engine: SimulationEngine): number {
  return (engine as any)._prunePressure ?? 0.0;
}

export function getStemBudget(engine: SimulationEngine): number {
  const p = getPrunePressure(engine);
  const anyEng = engine as any;
  if (anyEng._isSoftwareRaster) {
    return Math.round(THREE.MathUtils.lerp(275, 220, p));
  }
  const maxC = Math.max(9, engine.maxCreatures || 15, engine.minCreatures || 9);
  const highBudget = Math.min(engine.maxDOMs || 32000, Math.max(18000, maxC * 1600));
  const lowBudget = Math.min(highBudget, Math.max(5200, maxC * 500));
  return Math.round(THREE.MathUtils.lerp(highBudget, lowBudget, p));
}

export function getPerAppendageCap(engine: SimulationEngine): number {
  const p = getPrunePressure(engine);
  const anyEng = engine as any;
  if (anyEng._isSoftwareRaster) {
    return Math.round(THREE.MathUtils.lerp(45, 30, p));
  }
  const maxC = Math.max(9, engine.maxCreatures || 15, engine.minCreatures || 9);
  const highCap = Math.min(Math.floor((engine.maxDOMs || 32000) / 4), Math.max(2800, maxC * 240));
  const lowCap = Math.min(highCap, Math.max(1100, maxC * 100));
  return Math.round(THREE.MathUtils.lerp(highCap, lowCap, p));
}

export function getVectorStepPolicy(
  engine: SimulationEngine,
  agent: Agent,
): { skip: boolean; stepScale: number } {
  const distRatio = getCameraDistanceRatio(engine, agent.position);
  if (distRatio <= 1.25) {
    return { skip: false, stepScale: 1.0 };
  }
  const p = getPrunePressure(engine);
  const stepScale = THREE.MathUtils.clamp(1.0 + (distRatio - 1.25) * 0.22 + p * 0.08, 1.0, 1.25);
  return { skip: false, stepScale };
}

export function shouldSpawnAppendage(engine: SimulationEngine, pos: THREE.Vector3): boolean {
  const distRatio = getCameraDistanceRatio(engine, pos);
  if (distRatio <= 1.05) return true;
  const p = getPrunePressure(engine);
  const prob = Math.max(0.25, (1.0 - p * 0.5) / Math.pow(distRatio, 1.5));
  return Math.random() < prob;
}

export function remapAppendageParent(
  engine: SimulationEngine,
  oldStemIdx: number,
  newStemIdx: number,
  newTimestamp: number
): void {
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, app.segments.length);
    for (let i = 0; i < lim; i++) {
      const s = app.segments[i];
      if (s && s.parentIndex === oldStemIdx) {
        s.parentIndex = newStemIdx;
        s.parentTimestamp = newTimestamp;
      }
    }
  }
}

const _scratchDirA = new THREE.Vector3();
const _scratchDirB = new THREE.Vector3();
const _scratchChord = new THREE.Vector3();
const _scratchV = new THREE.Vector3();
const _scratchClosest = new THREE.Vector3();

export function updateTrianglePruner(engine: SimulationEngine, frameDtMs: number): void {
  const anyEng = engine as any;
  if (anyEng._isSoftwareRaster === undefined && engine.renderer) {
    let isSoft = false;
    try {
      const gl = engine.renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const rendStr = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      isSoft = /SwiftShader|llvmpipe|Software/i.test(rendStr || "");
    } catch {
      isSoft = false;
    }
    anyEng._isSoftwareRaster = isSoft;
    anyEng._prunePressure = isSoft ? 0.65 : 0.0;
    if (isSoft && engine.lod) {
      applyLodTier(engine, 3);
      engine.lod.fpsTier = 3;
    }
  }

  let p = anyEng._prunePressure ?? 0.0;
  const fps = engine.lod?.fps ?? 30;

  if (frameDtMs > 32.8 || fps < 30.5) {
    p = Math.min(1.0, p + 0.06);
  } else if (frameDtMs < 28.0 && fps > 33.0) {
    const minP = anyEng._isSoftwareRaster ? 0.30 : 0.0;
    p = Math.max(minP, p - 0.03);
  }
  anyEng._prunePressure = p;

  if (anyEng._fastStemMat === undefined) {
    anyEng._fastStemMat = createFastStemMaterial();
    anyEng._fastLeafMat = createFastLeafMaterial();
    anyEng._fastAppMat = createFastAppendageMaterial();
  }

  // Only use fast Lambert materials on software rasterizers; hardware GPUs keep their unified
  // shader material and smoothly dissolve complexity via uLodLevel (smoothTier) and vCamDist.
  if (anyEng._isSoftwareRaster) {
    if (!anyEng._origStemMat && engine.cylinderMesh) {
      anyEng._origStemMat = engine.cylinderMesh.material;
    }
    if (engine.cylinderMesh && engine.cylinderMesh.material !== anyEng._fastStemMat) {
      engine.cylinderMesh.material = anyEng._fastStemMat;
    }
    for (const [key, app] of engine.appendages.entries()) {
      if (app.mesh) {
        if (!anyEng._origAppMats) anyEng._origAppMats = new Map();
        if (!anyEng._origAppMats.has(key)) anyEng._origAppMats.set(key, app.mesh.material);
        const fastM = (key === "leaves" || key === "ferns") ? anyEng._fastLeafMat : anyEng._fastAppMat;
        if (app.mesh.material !== fastM) app.mesh.material = fastM;
      }
    }
    for (const hybrid of engine.hybridMeshes) {
      if (hybrid.material !== anyEng._fastAppMat) hybrid.material = anyEng._fastAppMat;
    }
  }

  if (anyEng._isSoftwareRaster || p >= 0.45 || (engine.lod && engine.lod.tier >= 2)) {
    if (engine.renderer?.setPixelRatio) {
      const targetDpr = anyEng._isSoftwareRaster ? 0.65 : (p >= 0.70 ? 0.50 : 0.75);
      if (engine.renderer.getPixelRatio() !== targetDpr) {
        engine.renderer.setPixelRatio(targetDpr);
      }
    }
    const showGrids = !anyEng._isSoftwareRaster && p < 0.65 && !!engine.showBoundaryBox;
    if (engine.floorGridMesh) engine.floorGridMesh.visible = showGrids;
    if (engine.ceilingGridMesh) engine.ceilingGridMesh.visible = showGrids;
  } else if (p < 0.25 && engine.lod && engine.lod.tier <= 1) {
    if (engine.renderer?.setPixelRatio) {
      const normalDpr = engine.isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25);
      if (engine.renderer.getPixelRatio() !== normalDpr) {
        engine.renderer.setPixelRatio(normalDpr);
      }
    }
    const showGrids = !!engine.showBoundaryBox;
    if (engine.floorGridMesh) engine.floorGridMesh.visible = showGrids;
    if (engine.ceilingGridMesh) engine.ceilingGridMesh.visible = showGrids;
  }
}

function relocateStemSlot(engine: SimulationEngine, highIdx: number, lowIdx: number): void {
  const seg = engine.segments[highIdx];
  if (!seg) return;

  engine.segments[lowIdx] = seg;
  seg.index = lowIdx;
  engine.cylinderMesh.setMatrixAt(lowIdx, seg.matrix);
  markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, lowIdx);

  if (engine.cylinderMesh.instanceColor) {
    const cArr = engine.cylinderMesh.instanceColor.array as Float32Array;
    cArr[lowIdx * 3] = cArr[highIdx * 3];
    cArr[lowIdx * 3 + 1] = cArr[highIdx * 3 + 1];
    cArr[lowIdx * 3 + 2] = cArr[highIdx * 3 + 2];
    markInstanceIndexDirty(engine.cylinderMesh.instanceColor, lowIdx);
  }

  const geo = engine.cylinderMesh.geometry;
  const attrNames = [
    "instancePackA",
    "instancePackB",
    "instanceAmbientReflect",
    "instanceLightDir",
    "instanceRootAnchor",
    "instanceBranchAnchor",
  ];
  for (const name of attrNames) {
    const attr = geo.getAttribute(name) as THREE.InstancedBufferAttribute | undefined;
    if (attr && attr.array) {
      const arr = attr.array as Float32Array;
      const sz = attr.itemSize;
      const src = highIdx * sz;
      const dst = lowIdx * sz;
      for (let k = 0; k < sz; k++) {
        arr[dst + k] = arr[src + k];
      }
      markInstanceIndexDirty(attr, lowIdx);
    }
  }

  const packA = geo.getAttribute("instancePackA") as THREE.InstancedBufferAttribute | undefined;
  if (packA) {
    packA.setZ(lowIdx, engine.dyingStems.has(highIdx) ? packA.getZ(highIdx) : 0.0);
    markInstanceIndexDirty(packA, lowIdx);
  }
  const packB = geo.getAttribute("instancePackB") as THREE.InstancedBufferAttribute | undefined;
  if (packB) {
    packB.setX(lowIdx, 1.0);
    markInstanceIndexDirty(packB, lowIdx);
  }

  if (seg.agentId !== undefined && engine.lastAgentStemIndex?.get(seg.agentId) === highIdx) {
    engine.lastAgentStemIndex.set(seg.agentId, lowIdx);
  }
  if (engine.growingStems?.has(highIdx)) {
    engine.growingStems.delete(highIdx);
    engine.growingStems.add(lowIdx);
  }
  if (engine.dyingStems.has(highIdx)) {
    engine.dyingStems.delete(highIdx);
    engine.dyingStems.add(lowIdx);
  }

  remapAppendageParent(engine, highIdx, lowIdx, seg.timestamp);
  engine.segments[highIdx] = undefined as any;
  engine.dummy.matrix.makeScale(0, 0, 0);
  engine.cylinderMesh.setMatrixAt(highIdx, engine.dummy.matrix);
  markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, highIdx);
}

function mergePass(engine: SimulationEngine, targetPruneCount: number): number {
  if (targetPruneCount <= 0) return 0;

  const strainSegments = new Map<string, Segment[]>();
  const total = Math.min(engine.pointCount, engine.cylinderMesh.count);
  for (let i = 0; i < total; i++) {
    const seg = engine.segments[i];
    if (seg && !engine.dyingStems.has(i) && seg.strainName && seg.startPos && seg.endPos && !seg.isTerminal) {
      let list = strainSegments.get(seg.strainName);
      if (!list) {
        list = [];
        strainSegments.set(seg.strainName, list);
      }
      list.push(seg);
    }
  }

  const p = getPrunePressure(engine);
  const forkJunctions = new Set<string>();
  const addForkPos = (pos?: THREE.Vector3) => {
    if (pos) {
      forkJunctions.add(`${Math.round(pos.x * 2)},${Math.round(pos.y * 2)},${Math.round(pos.z * 2)}`);
    }
  };
  if (engine.agentAnchorMap) {
    for (const anchor of engine.agentAnchorMap.values()) {
      addForkPos(anchor.branchBasePos);
    }
  }
  if (engine.agents) {
    for (let k = 0; k < engine.agents.length; k++) {
      addForkPos(engine.agents[k].branchBasePos);
    }
  }

  const startCountMap = new Map<string, number>();
  for (let i = 0; i < total; i++) {
    const s = engine.segments[i];
    if (s && !engine.dyingStems.has(i) && s.startPos) {
      const k = `${Math.round(s.startPos.x * 2)},${Math.round(s.startPos.y * 2)},${Math.round(s.startPos.z * 2)}`;
      startCountMap.set(k, (startCountMap.get(k) || 0) + 1);
    }
  }

  function isForkJunction(pos: THREE.Vector3): boolean {
    const k = `${Math.round(pos.x * 2)},${Math.round(pos.y * 2)},${Math.round(pos.z * 2)}`;
    if ((startCountMap.get(k) || 0) > 1) return true;
    return forkJunctions.has(k);
  }

  const candidatePairs: {
    segA: Segment;
    segB: Segment;
    score: number;
  }[] = [];

  for (const list of strainSegments.values()) {
    if (list.length < 2) continue;
    const bucketMap = new Map<string, Segment[]>();
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.isTerminal) continue;
      const bk = `${Math.round(s.startPos.x)},${Math.round(s.startPos.y)},${Math.round(s.startPos.z)}`;
      let bList = bucketMap.get(bk);
      if (!bList) {
        bList = [];
        bucketMap.set(bk, bList);
      }
      bList.push(s);
    }

    for (let i = 0; i < list.length; i++) {
      const segA = list[i];
      if (segA.isTerminal) continue;
      const bx = Math.round(segA.endPos.x);
      const by = Math.round(segA.endPos.y);
      const bz = Math.round(segA.endPos.z);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const nbk = `${bx + dx},${by + dy},${bz + dz}`;
            const bucket = bucketMap.get(nbk);
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) {
              const segB = bucket[j];
              if (segA === segB || segB.isTerminal) continue;
              if (segA.agentId === undefined || segA.agentId !== segB.agentId) continue;
              if ((segA.branchDepth ?? 0) !== (segB.branchDepth ?? 0)) continue;
              if (segA.endPos.distanceToSquared(segB.startPos) > 0.0025) continue;

              const isSoftMerge = !!(engine as any)._isSoftwareRaster;
              const camDistRatio = getCameraDistanceRatio(engine, segA.startPos);
              const minMergeRatio = isSoftMerge ? 1.05 : Math.max(1.10, 1.35 - p * 0.25);
              if (camDistRatio < minMergeRatio) continue;
              if (Math.abs(segA.thickness - segB.thickness) > segA.thickness * 0.06) continue;
              const hasBranchAtEnd = list.some(
                other => other !== segA && other !== segB && other.startPos.distanceToSquared(segA.endPos) < 0.09,
              );
              if (hasBranchAtEnd || isForkJunction(segA.endPos)) continue;

              _scratchDirA.subVectors(segA.endPos, segA.startPos).normalize();
              _scratchDirB.subVectors(segB.endPos, segB.startPos).normalize();
              const dot = _scratchDirA.dot(_scratchDirB);
              const mergedDist = segA.startPos.distanceTo(segB.endPos);

              const p0 = segA.startPos;
              const p1 = segA.endPos;
              const p2 = segB.endPos;
              _scratchChord.subVectors(p2, p0);
              const chordLenSq = _scratchChord.lengthSq();
              _scratchV.subVectors(p1, p0);
              const projT = chordLenSq > 1e-6 ? THREE.MathUtils.clamp(_scratchV.dot(_scratchChord) / chordLenSq, 0, 1) : 0;
              _scratchClosest.copy(p0).addScaledVector(_scratchChord, projT);
              const deviation = p1.distanceTo(_scratchClosest);

              const minDot = 0.994;
              const maxDeviation = Math.max(0.03, segA.thickness * 0.12);
              const maxDist = isSoftMerge ? 1.65 : 1.50;

              if (dot >= minDot && deviation <= maxDeviation && mergedDist <= maxDist) {
                const score = (camDistRatio * camDistRatio * (dot + 0.5)) / Math.max(0.08, segA.thickness);
                candidatePairs.push({ segA, segB, score });
              }
            }
          }
        }
      }
    }
  }

  candidatePairs.sort((a, b) => b.score - a.score);

  let mergedCount = 0;
  const mergedOrDeleted = new Set<number>();
  const packB = engine.cylinderMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute | undefined;

  for (const pair of candidatePairs) {
    if (mergedCount >= targetPruneCount) break;
    const { segA, segB } = pair;
    if (mergedOrDeleted.has(segA.index) || mergedOrDeleted.has(segB.index)) continue;

    engine.dummy.position.copy(segA.startPos);
    const dist = segA.startPos.distanceTo(segB.endPos);
    if (dist > 0.0001) {
      engine.dummy.lookAt(segB.endPos);
    } else {
      engine.dummy.quaternion.identity();
    }

    const prevStartRatio = packB ? packB.getZ(segA.index) : 1.0;
    const startRadius = Math.max(0.035, segA.thickness * (prevStartRatio > 0.1 ? prevStartRatio : 1.0));
    const endRadius = Math.max(0.035, segB.thickness);
    const visThick = endRadius;
    let scaleX = visThick;
    let scaleY = visThick;
    const scaleZ = dist * 1.02;

    const stemAnchor = segA.agentId !== undefined ? engine.agentAnchorMap.get(segA.agentId) : undefined;
    const distFromRoot = stemAnchor?.rootOrigin ? segA.startPos.distanceTo(stemAnchor.rootOrigin) : 999;
    const ribbonBlend = THREE.MathUtils.clamp(distFromRoot / 8.0, 0.0, 1.0);
    const genome = engine.genomeMap?.get(segA.strainName);
    if (genome?.geometryType === "ribbon") {
      scaleX = visThick * (1.0 + 1.2 * ribbonBlend);
      scaleY = THREE.MathUtils.lerp(visThick, Math.max(0.6, visThick * 0.8), ribbonBlend);
    }
    engine.dummy.scale.set(scaleX, scaleY, scaleZ);
    engine.dummy.updateMatrix();

    if (genome?.geometryType === "ribbon" && ribbonBlend > 0.01) {
      engine.dummy.rotateZ((engine.time * 0.02 + segA.startPos.length() * 0.05) * ribbonBlend);
      engine.dummy.updateMatrix();
    }

    engine.cylinderMesh.setMatrixAt(segA.index, engine.dummy.matrix);
    markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, segA.index);
    if (packB) {
      packB.setZ(segA.index, THREE.MathUtils.clamp(startRadius / endRadius, 0.45, 2.25));
      markInstanceIndexDirty(packB, segA.index);
    }

    segA.endPos.copy(segB.endPos);
    segA.matrix.copy(engine.dummy.matrix);
    segA.thickness = endRadius;
    segA.biomassWeight = (segA.biomassWeight || 1) + (segB.biomassWeight || 1);

    if (segA.agentId !== undefined && engine.lastAgentStemIndex?.get(segA.agentId) === segB.index) {
      engine.lastAgentStemIndex.set(segA.agentId, segA.index);
    }
    if (segB.agentId !== undefined && engine.lastAgentStemIndex?.get(segB.agentId) === segB.index) {
      engine.lastAgentStemIndex.set(segB.agentId, segA.index);
    }

    remapAppendageParent(engine, segB.index, segA.index, segA.timestamp);
    engine.segments[segB.index] = undefined as any;
    engine.dyingStems.delete(segB.index);
    if (engine.growingStems) engine.growingStems.delete(segB.index);
    engine.dummy.matrix.makeScale(0, 0, 0);
    engine.cylinderMesh.setMatrixAt(segB.index, engine.dummy.matrix);
    markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, segB.index);

    if (engine.freeStemIndices) engine.freeStemIndices.push(segB.index);

    mergedOrDeleted.add(segA.index);
    mergedOrDeleted.add(segB.index);
    mergedCount++;
  }

  return mergedCount;
}

export function mergeAdjacentBranchSegments(engine: SimulationEngine, targetPruneCount: number): number {
  let totalMerged = 0;
  for (let pass = 0; pass < 3 && totalMerged < targetPruneCount; pass++) {
    const merged = mergePass(engine, targetPruneCount - totalMerged);
    totalMerged += merged;
    if (merged === 0) break;
  }
  return totalMerged;
}

export function emergencyPruneDistantTips(engine: SimulationEngine, targetPruneCount: number): number {
  if (targetPruneCount <= 0) return 0;
  const currentStems = Math.min(engine.pointCount, engine.cylinderMesh.count);
  const activeAgentIds = new Set(engine.agents.filter(a => a.active).map(a => a.id));
  const isSoft = !!(engine as any)._isSoftwareRaster;

  // Pass 1: Reclaim whole ended feeler trails together (non-feeler organisms are reclaimed as complete strains below).
  const agentGroups = new Map<number, { indices: number[]; score: number }>();

  for (let i = 0; i < currentStems; i++) {
    const seg = engine.segments[i];
    if (!seg || !seg.startPos || !seg.endPos || !seg.isFeeler) continue;
    if (seg.agentId === undefined || activeAgentIds.has(seg.agentId)) continue;

    const score = getCameraDistanceRatio(engine, seg.startPos) * 4.0;
    let grp = agentGroups.get(seg.agentId);
    if (!grp) {
      grp = { indices: [], score };
      agentGroups.set(seg.agentId, grp);
    } else if (score > grp.score) {
      grp.score = score;
    }
    grp.indices.push(i);
  }

  const sortedGroups = Array.from(agentGroups.values()).sort((a, b) => b.score - a.score);
  let pruned = 0;

  const deleteStemSlot = (victimIdx: number) => {
    const seg = engine.segments[victimIdx];
    if (seg && seg.countsForBiomass) {
      const prev = engine.biomassMap.get(seg.strainName) || 0;
      const w = seg.biomassWeight ?? 1;
      if (prev > w) engine.biomassMap.set(seg.strainName, prev - w);
      else engine.biomassMap.delete(seg.strainName);
    }
    engine.segments[victimIdx] = undefined as any;
    engine.dyingStems.delete(victimIdx);
    if (engine.growingStems) engine.growingStems.delete(victimIdx);
    engine.dummy.matrix.makeScale(0, 0, 0);
    engine.cylinderMesh.setMatrixAt(victimIdx, engine.dummy.matrix);
    markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, victimIdx);
    if (engine.freeStemIndices) engine.freeStemIndices.push(victimIdx);
    pruned++;
  };

  for (const grp of sortedGroups) {
    if (pruned >= targetPruneCount) break;
    for (const victimIdx of grp.indices) {
      deleteStemSlot(victimIdx);
    }
  }

  if (pruned < targetPruneCount && engine.dyingStrains && engine.dyingStrains.size > 0) {
    // Reclaim ALL segments of any already-dying strain as a complete unit so no organism is left half-chopped
    for (const dyingName of Array.from(engine.dyingStrains)) {
      if (pruned >= targetPruneCount) break;
      for (const a of engine.agents) {
        if (a.active && (a.genome.name === dyingName || a.realGenome?.name === dyingName)) {
          a.active = false;
          a.tapering = false;
        }
      }
      for (let i = 0; i < currentStems; i++) {
        const s = engine.segments[i];
        if (s && s.strainName === dyingName) deleteStemSlot(i);
      }
      deleteStrainAppendages(engine, dyingName);
    }
  }

  if (pruned < targetPruneCount) {
    // Retire the single oldest living strain as a complete unit ONLY when >= 4 living strains occupy the buffer
    const strainOldestTs = new Map<string, number>();
    for (let i = 0; i < currentStems; i++) {
      const s = engine.segments[i];
      if (!s || !s.strainName || s.isFeeler) continue;
      if (engine.dyingStrains && engine.dyingStrains.has(s.strainName)) continue;
      const prev = strainOldestTs.get(s.strainName);
      if (prev === undefined || s.timestamp < prev) {
        strainOldestTs.set(s.strainName, s.timestamp);
      }
    }
    if (strainOldestTs.size >= 4) {
      let oldestStrain = "";
      let oldestTs = Infinity;
      for (const [sName, ts] of strainOldestTs.entries()) {
        if (ts < oldestTs) {
          oldestTs = ts;
          oldestStrain = sName;
        }
      }
      if (oldestStrain) {
        if (engine.dyingStrains) engine.dyingStrains.add(oldestStrain);
        for (const a of engine.agents) {
          if (a.active && (a.genome.name === oldestStrain || a.realGenome?.name === oldestStrain)) {
            a.active = false;
            a.tapering = false;
          }
        }
        for (let i = 0; i < currentStems; i++) {
          const s = engine.segments[i];
          if (s && s.strainName === oldestStrain) deleteStemSlot(i);
        }
        deleteStrainAppendages(engine, oldestStrain);
      }
    }
  }

  return pruned;
}

function compactTailSlots(engine: SimulationEngine, targetMaxCount: number): void {
  const freeSlots: number[] = [];
  for (let i = 0; i < targetMaxCount; i++) {
    if (!engine.segments[i]) {
      freeSlots.push(i);
    }
  }

  let highIdx = Math.min(engine.pointCount, engine.cylinderMesh.count) - 1;
  let freePtr = 0;
  let relocatedAny = false;
  while (highIdx >= targetMaxCount && freePtr < freeSlots.length) {
    const seg = engine.segments[highIdx];
    if (seg) {
      const targetSlot = freeSlots[freePtr++];
      relocateStemSlot(engine, highIdx, targetSlot);
      relocatedAny = true;
    }
    highIdx--;
  }

  const currentTotal = Math.min(engine.pointCount, engine.cylinderMesh.count);
  let maxActive = -1;
  for (let i = currentTotal - 1; i >= 0; i--) {
    if (engine.segments[i]) {
      maxActive = i;
      break;
    }
  }

  const newPointCount = maxActive + 1;
  engine.pointCount = newPointCount;
  engine.cylinderMesh.count = Math.min(newPointCount, engine.maxDOMs);

  // CRITICAL: Only push free slots strictly below newPointCount!
  // Pushing vacated tail slots >= newPointCount caused subsequent allocations to reuse
  // slots at/above pointCount without incrementing pointCount, which then got overwritten!
  engine.freeStemIndices = [];
  for (let i = 0; i < newPointCount; i++) {
    if (!engine.segments[i]) {
      engine.freeStemIndices.push(i);
    }
  }

  markActiveInstancesDirty(engine.cylinderMesh.instanceMatrix, engine.cylinderMesh.count);
  if (relocatedAny) {
    if (engine.cylinderMesh.instanceColor) {
      markActiveInstancesDirty(engine.cylinderMesh.instanceColor, engine.cylinderMesh.count);
    }
    const geo = engine.cylinderMesh.geometry;
    for (const name of ["instancePackA", "instancePackB", "instanceRootAnchor", "instanceBranchAnchor"]) {
      const attr = geo.getAttribute(name) as THREE.InstancedBufferAttribute | undefined;
      if (attr) markActiveInstancesDirty(attr, engine.cylinderMesh.count);
    }
  }
}

export function pruneAndCompactGeometry(engine: SimulationEngine): void {
  const stemBudget = getStemBudget(engine);
  const perAppendageCap = getPerAppendageCap(engine);
  const isSoft = !!(engine as any)._isSoftwareRaster;
  const p = getPrunePressure(engine);

  const currentStems = Math.min(engine.pointCount, engine.cylinderMesh.count);
  const livingCount = Math.max(2, typeof engine.getLivingOrganismCount === "function" ? engine.getLivingOrganismCount() : 4);
  const fairShareStems = isSoft
    ? Math.max(125, Math.floor(stemBudget / Math.max(4, livingCount)))
    : Math.min(640, Math.max(240, Math.floor(stemBudget / Math.max(4, livingCount * 1.25))));
  const minActiveTipsFloor = isSoft ? 3 : 4;

  if ((isSoft || p >= 0.20 || currentStems >= stemBudget * 0.92) && currentStems >= stemBudget * 0.88) {
    const outerTips = engine.agents.filter(a => {
      if (!a.active || a.tapering || a.isFeeler) return false;
      const strainBiomass = engine.biomassMap?.get(a.genome.name) || 0;
      if (strainBiomass < fairShareStems) return false;
      if ((a.branchDepth || 0) < 2) return false;
      if ((a.age || 0) < 35) return false;
      return (
        (a.branchDepth || 0) >= 2 ||
        (currentStems >= stemBudget * 0.95 && getCameraDistanceRatio(engine, a.position) >= 1.10)
      );
    });
    if (outerTips.length > 0) {
      const strainActiveCounts = new Map<string, number>();
      for (const a of engine.agents) {
        if (a.active && !a.tapering && !a.isFeeler) {
          strainActiveCounts.set(a.genome.name, (strainActiveCounts.get(a.genome.name) || 0) + 1);
        }
      }
      outerTips.sort((a, b) => getCameraDistanceRatio(engine, b.position) - getCameraDistanceRatio(engine, a.position));
      for (const tip of outerTips) {
        const count = strainActiveCounts.get(tip.genome.name) || 0;
        const strainBiomass = engine.biomassMap?.get(tip.genome.name) || 0;
        const tipFloor = strainBiomass >= fairShareStems * 1.35 ? 2 : minActiveTipsFloor;
        if (count > tipFloor) {
          tip.tapering = true;
          strainActiveCounts.set(tip.genome.name, count - 1);
        }
      }
    }
  }

  if (currentStems > stemBudget && engine.frameCount % 4 === 0) {
    const needed = currentStems - stemBudget;
    const merged = mergeAdjacentBranchSegments(engine, needed);
    const stillNeeded = needed - merged;
    if (stillNeeded > 0) {
      emergencyPruneDistantTips(engine, stillNeeded);
    }
    compactTailSlots(engine, stemBudget);
  }

  // Smoothly dissolve furthest background appendages when pool nears capacity so slot recycling never pops
  const appSoftThreshold = Math.floor(perAppendageCap * 0.88);
  for (const app of engine.appendages.values()) {
    if (app.mesh) {
      if (app.count >= appSoftThreshold && engine.frameCount % 6 === 0 && typeof engine.markDying === "function") {
        const lim = Math.min(app.count, app.segments.length);
        let bestIdx = -1;
        let maxDist = 1.12;
        for (let i = 0; i < lim; i++) {
          const s = app.segments[i];
          if (!s || app.dyingSet.has(i)) continue;
          const pPos = engine.segments[s.parentIndex]?.startPos || s.rootOrigin;
          if (!pPos) continue;
          const d = getCameraDistanceRatio(engine, pPos);
          if (d > maxDist) {
            maxDist = d;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0) {
          engine.markDying(app.segments, app.dyingSet, bestIdx, engine.unscaledTime);
        }
      }
      // Trim only already-dissolved undefined tail slots (never truncating active or dying appendages)
      const checkLim = Math.min(app.count, app.segments.length);
      let maxActiveApp = -1;
      for (let i = checkLim - 1; i >= 0; i--) {
        if (app.segments[i]) {
          maxActiveApp = i;
          break;
        }
      }
      app.count = maxActiveApp + 1;
      app.mesh.count = Math.min(maxActiveApp + 1, Math.floor(engine.maxDOMs / 4));
      app.mesh.visible = app.mesh.count > 0;
    }
  }

  for (const hybrid of engine.hybridMeshes) {
    hybrid.visible = hybrid.count > 0;
  }
}
