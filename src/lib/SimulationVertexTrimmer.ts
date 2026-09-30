import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Genome, LodTier } from "./SimulationTypes";

export const MOBILE_MAX_POINTS = 64000;
export const MOBILE_DEFAULT_MAX_DOMS = 12000;
export const DESKTOP_LOD_TRI_BUDGET = [1_200_000, 3_000_000, 7_500_000] as const;
export const MOBILE_LOD_TRI_BUDGET = [120_000, 260_000, 500_000] as const;
export const MOBILE_VERTEX_BUDGET = [220_000, 160_000, 110_000, 75_000] as const;

export function isMobileDevice(): boolean {
  if (typeof location !== "undefined") {
    const q = new URLSearchParams(location.search).get("mobile");
    if (q === "1") return true;
    if (q === "0") return false;
  }
  if (typeof window === "undefined") return false;
  if (window.innerWidth > 0 && window.innerWidth < 768) return true;
  if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 768px), (pointer: coarse)").matches) return true;
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function createTrimmedLeafBoxGeometry(sx: number, sy: number, thickness = 0.05): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const numVertsSheet = (sx + 1) * (sy + 1);
  const totalVerts = numVertsSheet * 2;
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const halfT = thickness / 2;

  let idx = 0;
  for (const sign of [1, -1]) {
    for (let iy = 0; iy <= sy; iy++) {
      const v = iy / sy;
      for (let ix = 0; ix <= sx; ix++) {
        const u = ix / sx;
        const i3 = idx * 3;
        positions[i3] = u - 0.5; positions[i3 + 1] = v; positions[i3 + 2] = sign * halfT;
        normals[i3] = 0; normals[i3 + 1] = 0; normals[i3 + 2] = sign;
        uvs[idx * 2] = u; uvs[idx * 2 + 1] = v;
        idx++;
      }
    }
  }

  const indices: number[] = [];
  const backOffset = numVertsSheet;
  const rowStride = sx + 1;

  for (let iy = 0; iy < sy; iy++) {
    for (let ix = 0; ix < sx; ix++) {
      const a = iy * rowStride + ix, b = a + 1, c = (iy + 1) * rowStride + ix + 1, d = (iy + 1) * rowStride + ix;
      indices.push(a, b, d, b, c, d);
      const aB = backOffset + a, bB = backOffset + b, cB = backOffset + c, dB = backOffset + d;
      indices.push(aB, dB, bB, bB, dB, cB);
    }
  }

  for (let ix = 0; ix < sx; ix++) {
    const f0 = ix, f1 = ix + 1;
    indices.push(f0, backOffset + f0, f1, f1, backOffset + f0, backOffset + f1);
    const topF0 = sy * rowStride + ix, topF1 = topF0 + 1;
    indices.push(topF0, topF1, backOffset + topF0, topF1, backOffset + topF1, backOffset + topF0);
  }

  for (let iy = 0; iy < sy; iy++) {
    const lF0 = iy * rowStride, lF1 = (iy + 1) * rowStride;
    indices.push(lF0, backOffset + lF0, lF1, lF1, backOffset + lF0, backOffset + lF1);
    const rF0 = iy * rowStride + sx, rF1 = (iy + 1) * rowStride + sx;
    indices.push(rF0, rF1, backOffset + rF0, rF1, backOffset + rF1, backOffset + rF0);
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function createWeldedStemGeometry(radial: number, heightSegs: number, withCaps: boolean): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const numRings = heightSegs + 1;
  const numRingVerts = radial * numRings;
  const totalVerts = numRingVerts + (withCaps ? 2 : 0);
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let vIdx = 0;
  for (let r = 0; r <= heightSegs; r++) {
    const z = r / heightSegs;
    for (let i = 0; i < radial; i++) {
      const theta = (i / radial) * Math.PI * 2;
      const cos = Math.cos(theta), sin = Math.sin(theta);
      const i3 = vIdx * 3;
      positions[i3] = cos; positions[i3 + 1] = sin; positions[i3 + 2] = z;
      normals[i3] = cos; normals[i3 + 1] = sin; normals[i3 + 2] = 0;
      uvs[vIdx * 2] = i / radial; uvs[vIdx * 2 + 1] = z;
      vIdx++;
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < heightSegs; r++) {
    const ring0 = r * radial, ring1 = (r + 1) * radial;
    for (let i = 0; i < radial; i++) {
      const nextI = (i + 1) % radial;
      indices.push(ring0 + i, ring0 + nextI, ring1 + i, ring0 + nextI, ring1 + nextI, ring1 + i);
    }
  }

  if (withCaps) {
    const cap0 = numRingVerts, cap1 = numRingVerts + 1;
    positions[cap0 * 3 + 2] = 0; normals[cap0 * 3 + 2] = -1; uvs[cap0 * 2] = 0.5; uvs[cap0 * 2 + 1] = 0.5;
    positions[cap1 * 3 + 2] = 1; normals[cap1 * 3 + 2] = 1; uvs[cap1 * 2] = 0.5; uvs[cap1 * 2 + 1] = 0.5;
    for (let i = 0; i < radial; i++) {
      const nextI = (i + 1) % radial;
      indices.push(cap0, nextI, i);
      indices.push(cap1, heightSegs * radial + i, heightSegs * radial + nextI);
    }
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function createWeldedConeGeometry(radius: number, height: number, radial: number, yOffset = 0.5): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, radial, 1, true);
  geo.translate(0, yOffset, 0);
  geo.rotateX(Math.PI / 2);
  return weldNonIndexedGeometry(geo);
}

export function weldNonIndexedGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  const pos = nonIndexed.attributes.position;
  const numVerts = pos.count;
  const uniquePositions: THREE.Vector3[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();

  for (let i = 0; i < numVerts; i++) {
    p.fromBufferAttribute(pos as THREE.BufferAttribute, i);
    let found = -1;
    for (let u = 0; u < uniquePositions.length; u++) {
      if (p.distanceToSquared(uniquePositions[u]) < 1e-6) { found = u; break; }
    }
    if (found >= 0) indices.push(found);
    else { indices.push(uniquePositions.length); uniquePositions.push(p.clone()); }
  }

  const newPos = new Float32Array(uniquePositions.length * 3);
  for (let u = 0; u < uniquePositions.length; u++) {
    newPos[u * 3] = uniquePositions[u].x; newPos[u * 3 + 1] = uniquePositions[u].y; newPos[u * 3 + 2] = uniquePositions[u].z;
  }
  const welded = new THREE.BufferGeometry();
  welded.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
  welded.setIndex(indices);
  welded.computeVertexNormals();
  return welded;
}

export function markInstanceIndexDirty(attr: THREE.BufferAttribute | THREE.InstancedBufferAttribute | null | undefined, index: number) {
  if (!attr) return;
  const anyAttr = attr as any;
  const start = index * attr.itemSize;
  const count = attr.itemSize;
  if (typeof anyAttr.addUpdateRange === "function") {
    anyAttr.addUpdateRange(start, count);
    if (anyAttr.updateRanges && anyAttr.updateRanges.length > 64) {
      let minStart = Infinity, maxEnd = -Infinity;
      for (const r of anyAttr.updateRanges) {
        if (r.start < minStart) minStart = r.start;
        const end = r.start + r.count;
        if (end > maxEnd) maxEnd = end;
      }
      anyAttr.updateRanges.length = 0;
      anyAttr.addUpdateRange(minStart, maxEnd - minStart);
    }
  }
  if (anyAttr.updateRange) {
    anyAttr.updateRange.offset = start;
    anyAttr.updateRange.count = count;
  }
  attr.needsUpdate = true;
}

export function markActiveInstancesDirty(attr: THREE.BufferAttribute | THREE.InstancedBufferAttribute | null | undefined, activeCount: number) {
  if (!attr) return;
  const anyAttr = attr as any;
  if (Array.isArray(anyAttr.updateRanges)) anyAttr.updateRanges.length = 0;
  if (typeof anyAttr.addUpdateRange === "function" && activeCount > 0) {
    anyAttr.addUpdateRange(0, activeCount * attr.itemSize);
  }
  if (anyAttr.updateRange) {
    anyAttr.updateRange.offset = 0;
    anyAttr.updateRange.count = activeCount * attr.itemSize;
  }
  attr.needsUpdate = true;
}

export function tryCoalesceStemSegment(
  engine: SimulationEngine,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  genome: Genome,
  thickness: number,
  agentId?: number,
  isTerminal: boolean | number = false,
  shouldCountBiomass = true,
  resolvedStrainName = genome.name,
): boolean {
  if (isTerminal || agentId === undefined || genome.geometryType === "segmented") return false;
  if (!engine.isMobile && !(engine as any).enableCoalescing) return false;
  const prevIdx = engine.lastAgentStemIndex?.get(agentId);
  if (prevIdx === undefined) return false;
  const prevSeg = engine.segments[prevIdx];
  if (!prevSeg || engine.dyingStems.has(prevIdx) || prevSeg.isTerminal || prevSeg.agentId !== agentId ||
      prevSeg.strainName !== resolvedStrainName || !prevSeg.startPos || !prevSeg.endPos) return false;
  if (prevSeg.endPos.distanceToSquared(p1) > 0.004) return false;

  const dirPrev = prevSeg.endPos.clone().sub(prevSeg.startPos).normalize();
  const dirCurr = p2.clone().sub(p1).normalize();
  const lodTier = engine.lod?.tier ?? 0;
  const cosMin = ([0.994, 0.988, 0.978, 0.962] as const)[lodTier];
  const maxLen = ([2.2, 2.8, 3.5, 4.2] as const)[lodTier];

  if (dirPrev.dot(dirCurr) >= cosMin && prevSeg.startPos.distanceTo(p2) <= maxLen && Math.abs(thickness - prevSeg.thickness) <= prevSeg.thickness * 0.22) {
    engine.dummy.position.copy(prevSeg.startPos);
    const dist = prevSeg.startPos.distanceTo(p2);
    if (dist > 0.0001) engine.dummy.lookAt(p2); else engine.dummy.quaternion.identity();
    const mergedThick = (prevSeg.thickness + thickness) * 0.5;
    let scaleX = Math.max(0.001, mergedThick);
    let scaleY = Math.max(0.001, mergedThick);
    const scaleZ = dist * 1.02;

    const stemAnchor = engine.agentAnchorMap.get(agentId);
    const distFromRoot = stemAnchor?.rootOrigin ? prevSeg.startPos.distanceTo(stemAnchor.rootOrigin) : 999;
    const ribbonBlend = THREE.MathUtils.clamp(distFromRoot / 8.0, 0.0, 1.0);
    if (genome.geometryType === "ribbon") {
      scaleX = mergedThick * (1.0 + 1.2 * ribbonBlend);
      scaleY = THREE.MathUtils.lerp(mergedThick, Math.max(0.6, mergedThick * 0.8), ribbonBlend);
    }
    engine.dummy.scale.set(scaleX, scaleY, scaleZ);
    engine.dummy.updateMatrix();

    if (genome.geometryType === "ribbon" && ribbonBlend > 0.01) {
      engine.dummy.rotateZ((engine.time * 0.02 + prevSeg.startPos.length() * 0.05) * ribbonBlend);
      engine.dummy.updateMatrix();
    }

    engine.cylinderMesh.setMatrixAt(prevIdx, engine.dummy.matrix);
    markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, prevIdx);

    prevSeg.endPos.copy(p2);
    prevSeg.matrix.copy(engine.dummy.matrix);
    prevSeg.thickness = mergedThick;
    prevSeg.biomassWeight = (prevSeg.biomassWeight || 1) + 1;

    if (shouldCountBiomass) {
      engine.biomassMap.set(genome.name, (engine.biomassMap.get(genome.name) || 0) + 1);
      engine.genomeMap.set(genome.name, genome);
    }
    return true;
  }
  return false;
}

function countActiveSceneVertices(engine: SimulationEngine): number {
  let count = 0;
  if (engine.cylinderMesh?.geometry?.attributes?.position) {
    count += engine.cylinderMesh.geometry.attributes.position.count * (engine.cylinderMesh.count || 0);
  }
  for (const app of engine.appendages.values()) {
    if (app.mesh?.geometry?.attributes?.position) {
      count += app.mesh.geometry.attributes.position.count * (app.mesh.count || 0);
    }
  }
  for (const hybrid of engine.hybridMeshes) {
    if (hybrid.geometry?.attributes?.position) {
      count += hybrid.geometry.attributes.position.count * (hybrid.count || 0);
    }
  }
  return count;
}

export function enforceVertexBudget(engine: SimulationEngine, tier: LodTier) {
  if (!engine.isMobile) return;
  const maxVerts = MOBILE_VERTEX_BUDGET[tier];
  let currentVerts = countActiveSceneVertices(engine);
  if (currentVerts <= maxVerts) return;

  for (const key of ["leaves", "curlyHair", "ferns", "spirals"]) {
    const app = engine.appendages.get(key);
    if (app && app.mesh.count > 100) {
      const vPerInst = app.mesh.geometry.attributes.position.count || 100;
      const reduction = Math.min(app.mesh.count - 50, Math.ceil((currentVerts - maxVerts) / vPerInst));
      if (reduction > 0) {
        app.mesh.count = Math.max(50, app.mesh.count - reduction);
        currentVerts = countActiveSceneVertices(engine);
        if (currentVerts <= maxVerts) break;
      }
    }
  }
}
