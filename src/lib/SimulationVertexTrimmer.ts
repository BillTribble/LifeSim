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

export function createSimplifiedLeafBladeGeometry(sx = 4, sy = 6): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const numVerts = (sx + 1) * (sy + 1);
  const positions = new Float32Array(numVerts * 3);
  const normals = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);

  let idx = 0;
  for (let iy = 0; iy <= sy; iy++) {
    const v = iy / sy;
    for (let ix = 0; ix <= sx; ix++) {
      const u = ix / sx;
      const i3 = idx * 3;
      const x = u - 0.5;
      const y = v;
      const z = (1.0 - Math.abs(x) * 2.0) * 0.035;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      const nx = x === 0 ? 0 : Math.sign(x) * 0.22;
      const ny = -0.10 * v;
      const nz = 0.97;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      normals[i3] = nx / nLen;
      normals[i3 + 1] = ny / nLen;
      normals[i3 + 2] = nz / nLen;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
      idx++;
    }
  }

  const indices: number[] = [];
  const rowStride = sx + 1;
  for (let iy = 0; iy < sy; iy++) {
    for (let ix = 0; ix < sx; ix++) {
      const a = iy * rowStride + ix;
      const b = a + 1;
      const c = (iy + 1) * rowStride + ix + 1;
      const d = (iy + 1) * rowStride + ix;
      indices.push(a, b, d, b, c, d);
    }
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function createFastAppendageMaterial(): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute vec4 instancePackA;
      attribute vec4 instancePackB;
      varying float vDecay;
      varying float vGrowth;
      ${shader.vertexShader}
    `.replace(
      "#include <color_vertex>",
      `
      #include <color_vertex>
      vDecay = instancePackA.z;
      vGrowth = instancePackB.x;
      `
    );
    shader.fragmentShader = `
      varying float vDecay;
      varying float vGrowth;
      ${shader.fragmentShader}
    `.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `
      vec4 diffuseColor = vec4( diffuse, opacity );
      if (vGrowth < 1.0) {
        float ditherIn = fract(sin(dot(gl_FragCoord.xy, vec2(54.321, 12.987))) * 43758.5453);
        if (ditherIn > vGrowth) discard;
      }
      if (vDecay > 0.0) {
        float ditherLimit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (ditherLimit < vDecay || vDecay >= 0.98) discard;
      }
      `
    );
  };
  return mat;
}

export function createFastStemMaterial(): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute vec4 instancePackA;
      attribute vec4 instancePackB;
      varying float vDecay;
      varying float vGrowth;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <color_vertex>",
      `
      #include <color_vertex>
      vDecay = instancePackA.z;
      vGrowth = instancePackB.x;
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      float terminalFlag = instancePackB.w;
      if (terminalFlag > 2.5) {
        float u = clamp(abs(transformed.z), 0.0, 1.0);
        float nubFactor = sqrt(max(0.0, 1.0 - u * u));
        transformed.x *= nubFactor;
        transformed.y *= nubFactor;
      } else if (terminalFlag > 1.5) {
        float taperFactor = clamp(1.0 - abs(transformed.z), 0.0, 1.0);
        transformed.x *= taperFactor;
        transformed.y *= taperFactor;
      } else {
        float startRatio = clamp(instancePackB.z, 0.45, 2.25);
        float frustumTaper = mix(startRatio, 1.0, clamp(transformed.z, 0.0, 1.0));
        transformed.x *= frustumTaper;
        transformed.y *= frustumTaper;
      }
      `
    );
    shader.fragmentShader = `
      varying float vDecay;
      varying float vGrowth;
      ${shader.fragmentShader}
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `
      vec4 diffuseColor = vec4( diffuse, opacity );
      if (vGrowth < 1.0) {
        float ditherIn = fract(sin(dot(gl_FragCoord.xy, vec2(54.321, 12.987))) * 43758.5453);
        if (ditherIn > vGrowth) discard;
      }
      if (vDecay > 0.0) {
        float ditherLimit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (ditherLimit < vDecay || vDecay >= 0.98) discard;
      }
      `
    );
  };
  return mat;
}

export function createFastLeafMaterial(): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute vec4 instancePackA;
      attribute vec4 instancePackB;
      attribute vec3 instanceAmbientReflect;
      varying float vDecay;
      varying float vGrowth;
      varying float vMidrib;
      varying vec3 vFastLeafUV;
      varying float vDetailRetention;
      varying float vLeafHash;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <color_vertex>",
      `
      #include <color_vertex>
      vDecay = instancePackA.z;
      vGrowth = instancePackB.x;
      vLeafHash = instancePackA.w;
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      float instanceGrowth = instancePackB.x;
      float instanceDecay = instancePackA.z;
      float instanceSucculence = instancePackB.z;
      float instanceLeafDiv = instancePackB.w;
      float instanceHash = instancePackA.w;
      float leafDetailFade = clamp(instanceAmbientReflect.x, 0.0, 1.0);
      float detailRetention = 1.0 - leafDetailFade * 0.78;
      vDetailRetention = 1.0 - leafDetailFade;
      float spineT = position.y;
      float hash2 = fract(instanceHash * 13.7);
      float stemLength = clamp(0.15 + instanceHash * 0.20 + (hash2 - 0.5) * 0.06, 0.10, 0.42);
      float isBlade = smoothstep(stemLength - 0.04, stemLength + 0.04, spineT);
      float bladeT = clamp((spineT - stemLength) / max(1.0 - stemLength, 0.001), 0.0, 1.0);
      vFastLeafUV = vec3(position.x * 2.0, bladeT, isBlade);
      float leafLengthScale = mix(0.45, 2.4, fract(instanceHash * 19.3));
      float leafWidthScale = mix(0.40, 1.85, fract(instanceHash * 3.7));
      if (isBlade > 0.5) {
        transformed.y = stemLength + (transformed.y - stemLength) * leafLengthScale;
      }
      float fullness = mix(1.0, 0.35, instanceLeafDiv);
      float targetWidth = pow(max(0.0, sin(bladeT * 3.14159)), fullness);
      float finalWidth = mix(0.08, targetWidth, isBlade) * leafWidthScale;
      transformed.x *= finalWidth;
      float bladeThick = mix(0.15, 1.0, 1.0 - abs(position.x) * 2.0);
      float zSpineTaper = cos(spineT * 1.5708) * smoothstep(0.0, 0.05, spineT);
      transformed.z *= (1.0 + instanceSucculence * 2.0) * mix(1.0, bladeThick, isBlade) * zSpineTaper;
      float U = clamp(instanceGrowth * (1.0 - instanceDecay), 0.0, 1.0);
      float midribFold = 0.32 * detailRetention * (1.0 - abs(position.x) * 2.0) * U * isBlade;
      float cupSign = (instanceHash > 0.5) ? 1.0 : -1.0;
      float cup = cupSign * 0.28 * detailRetention * (1.0 - cos(position.x * 3.14159)) * U * isBlade;
      float arcDrop = -0.34 * detailRetention * bladeT * bladeT * U * isBlade;
      transformed.z += midribFold + cup + arcDrop;
      float growScale = mix(0.28, 1.0, smoothstep(0.0, 0.7, U));
      transformed.xyz *= growScale;
      vMidrib = smoothstep(0.12, 0.015, abs(position.x * 2.0)) * isBlade;
      #ifdef USE_INSTANCING
      vec3 instWorldPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float camDist = length((modelViewMatrix * vec4(instWorldPos, 1.0)).xyz);
      if (camDist > 210.0) {
        transformed.xyz *= mix(1.0, 0.55, clamp((camDist - 210.0) / 140.0, 0.0, 1.0));
      }
      #endif
      `
    );
    shader.fragmentShader = `
      varying float vDecay;
      varying float vGrowth;
      varying float vMidrib;
      varying vec3 vFastLeafUV;
      varying float vDetailRetention;
      varying float vLeafHash;
      ${shader.fragmentShader}
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `
      vec4 diffuseColor = vec4( diffuse, opacity );
      if (vGrowth < 0.25) {
        float ditherIn = fract(sin(dot(gl_FragCoord.xy, vec2(54.321, 12.987))) * 43758.5453);
        if (ditherIn > smoothstep(0.0, 0.25, vGrowth)) discard;
      }
      if (vDecay > 0.0) {
        float ditherLimit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (ditherLimit < vDecay || vDecay >= 0.98) discard;
      }
      float latVein = 0.0;
      if (vFastLeafUV.z > 0.5 && vDetailRetention > 0.02) {
        float vDens = 5.0 + floor(fract(vLeafHash * 17.3) * 4.0);
        float vAng = 0.28 + fract(vLeafHash * 29.7) * 0.32;
        float vC = fract((vFastLeafUV.y - vAng * abs(vFastLeafUV.x)) * vDens);
        float dVein = abs(vC - 0.5) / vDens;
        latVein = smoothstep(0.018, 0.004, dVein) * smoothstep(1.0, 0.78, abs(vFastLeafUV.x)) * vDetailRetention;
      }
      float veinMask = max(vMidrib * mix(0.45, 1.0, vDetailRetention), latVein);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.38 + vec3(0.04, 0.08, 0.0), veinMask * 0.72);
      `
    );
  };
  return mat;
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
    if (anyAttr.updateRanges && anyAttr.updateRanges.length > 16) {
      let minStart = Infinity, maxEnd = -Infinity;
      for (const r of anyAttr.updateRanges) {
        if (r.start < minStart) minStart = r.start;
        const end = r.start + r.count;
        if (end > maxEnd) maxEnd = end;
      }
      anyAttr.updateRanges.length = 0;
      anyAttr.addUpdateRange(minStart, maxEnd - minStart);
    }
  } else if (anyAttr.updateRange) {
    if (!attr.needsUpdate || anyAttr.updateRange.count <= 0) {
      anyAttr.updateRange.offset = start;
      anyAttr.updateRange.count = count;
    } else {
      const minStart = Math.min(anyAttr.updateRange.offset, start);
      const maxEnd = Math.max(anyAttr.updateRange.offset + anyAttr.updateRange.count, start + count);
      anyAttr.updateRange.offset = minStart;
      anyAttr.updateRange.count = maxEnd - minStart;
    }
  }
  attr.needsUpdate = true;
}

export function markActiveInstancesDirty(attr: THREE.BufferAttribute | THREE.InstancedBufferAttribute | null | undefined, activeCount: number) {
  if (!attr) return;
  const anyAttr = attr as any;
  if (typeof anyAttr.addUpdateRange === "function") {
    if (Array.isArray(anyAttr.updateRanges)) anyAttr.updateRanges.length = 0;
    if (activeCount > 0) {
      anyAttr.addUpdateRange(0, activeCount * attr.itemSize);
    }
  } else if (anyAttr.updateRange) {
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
  if ((engine as any).enableCoalescing === false) return false;
  const prevIdx = engine.lastAgentStemIndex?.get(agentId);
  if (prevIdx === undefined) return false;
  const prevSeg = engine.segments[prevIdx];
  if (!prevSeg || engine.dyingStems.has(prevIdx) || prevSeg.isTerminal || prevSeg.agentId !== agentId ||
      prevSeg.strainName !== resolvedStrainName || !prevSeg.startPos || !prevSeg.endPos) return false;
  if (prevSeg.endPos.distanceToSquared(p1) > 0.004) return false;

  const dirPrev = prevSeg.endPos.clone().sub(prevSeg.startPos).normalize();
  const dirCurr = p2.clone().sub(p1).normalize();
  const lodTier = engine.lod?.tier ?? 0;
  const baseCosMin = ([0.994, 0.988, 0.978, 0.962] as const)[lodTier];
  const baseMaxLen = ([2.2, 2.8, 3.5, 4.2] as const)[lodTier];

  const p = (engine as any)._prunePressure ?? 0.0;
  const camPos = engine.camera ? engine.camera.position : new THREE.Vector3();
  const camRef = engine.camera ? Math.max(60, engine.camera.position.distanceTo(engine.controls?.target || new THREE.Vector3(0, 18.92, 0))) : 120;
  const camDistRatio = p1.distanceTo(camPos) / camRef;

  // Never coalesce foreground or midground stems so spindle sections stay smooth and organic
  if (camDistRatio < 1.30) return false;

  const t = THREE.MathUtils.clamp((camDistRatio - 1.30) / 1.2, 0.0, 1.0);
  const cosMin = Math.max(baseCosMin, THREE.MathUtils.lerp(0.996, 0.985, Math.max(t, p)));
  const maxLen = Math.min(baseMaxLen, THREE.MathUtils.lerp(1.8, 2.6, Math.max(t, p)));
  const thickTolerance = 0.05;

  let isForkJunction = false;
  if (engine.agentAnchorMap) {
    for (const [otherId, anchor] of engine.agentAnchorMap.entries()) {
      if (otherId !== agentId && anchor.branchBasePos && anchor.branchBasePos.distanceToSquared(p1) < 0.25) {
        isForkJunction = true;
        break;
      }
    }
  }
  if (!isForkJunction && engine.agents) {
    for (let k = 0; k < engine.agents.length; k++) {
      const a = engine.agents[k];
      if (a.id !== agentId && a.branchBasePos && a.branchBasePos.distanceToSquared(p1) < 0.25) {
        isForkJunction = true;
        break;
      }
    }
  }
  if (isForkJunction) return false;

  const p0 = prevSeg.startPos;
  const chord = new THREE.Vector3().subVectors(p2, p0);
  const chordLenSq = chord.lengthSq();
  const v = new THREE.Vector3().subVectors(p1, p0);
  const projT = chordLenSq > 1e-6 ? THREE.MathUtils.clamp(v.dot(chord) / chordLenSq, 0, 1) : 0;
  const closest = new THREE.Vector3().copy(p0).addScaledVector(chord, projT);
  const deviation = p1.distanceTo(closest);

  const dot = dirPrev.dot(dirCurr);
  const maxDeviation = Math.max(0.03, prevSeg.thickness * 0.12);

  if (
    dot >= cosMin &&
    deviation <= maxDeviation &&
    prevSeg.startPos.distanceTo(p2) <= maxLen &&
    Math.abs(thickness - prevSeg.thickness) <= prevSeg.thickness * thickTolerance
  ) {
    engine.dummy.position.copy(prevSeg.startPos);
    const dist = prevSeg.startPos.distanceTo(p2);
    if (dist > 0.0001) engine.dummy.lookAt(p2); else engine.dummy.quaternion.identity();
    const packB = engine.cylinderMesh?.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute | undefined;
    const prevStartRatio = packB ? packB.getZ(prevIdx) : 1.0;
    const startRadius = Math.max(0.035, prevSeg.thickness * (prevStartRatio > 0.1 ? prevStartRatio : 1.0));
    const endRadius = Math.max(0.035, thickness);
    const visThick = endRadius;
    let scaleX = visThick;
    let scaleY = visThick;
    const scaleZ = dist * 1.02;

    const stemAnchor = engine.agentAnchorMap.get(agentId);
    const distFromRoot = stemAnchor?.rootOrigin ? prevSeg.startPos.distanceTo(stemAnchor.rootOrigin) : 999;
    const ribbonBlend = THREE.MathUtils.clamp(distFromRoot / 8.0, 0.0, 1.0);
    if (genome.geometryType === "ribbon") {
      scaleX = visThick * (1.0 + 1.2 * ribbonBlend);
      scaleY = THREE.MathUtils.lerp(visThick, Math.max(0.6, visThick * 0.8), ribbonBlend);
    }
    engine.dummy.scale.set(scaleX, scaleY, scaleZ);
    engine.dummy.updateMatrix();

    if (genome.geometryType === "ribbon" && ribbonBlend > 0.01) {
      engine.dummy.rotateZ((engine.time * 0.02 + prevSeg.startPos.length() * 0.05) * ribbonBlend);
      engine.dummy.updateMatrix();
    }

    engine.cylinderMesh.setMatrixAt(prevIdx, engine.dummy.matrix);
    markInstanceIndexDirty(engine.cylinderMesh.instanceMatrix, prevIdx);
    if (packB) {
      packB.setZ(prevIdx, THREE.MathUtils.clamp(startRadius / endRadius, 0.45, 2.25));
      markInstanceIndexDirty(packB, prevIdx);
    }

    prevSeg.endPos.copy(p2);
    prevSeg.matrix.copy(engine.dummy.matrix);
    prevSeg.thickness = endRadius;
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

export function deleteStrainAppendages(engine: SimulationEngine, strainName: string): void {
  if (!strainName || !engine.appendages) return;
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, app.segments.length);
    for (let k = 0; k < lim; k++) {
      const aSeg = app.segments[k];
      if (aSeg && aSeg.strainName === strainName) {
        app.segments[k] = undefined as any;
        app.dyingSet.delete(k);
        if (app.mesh) {
          app.mesh.setMatrixAt(k, zeroM);
          markInstanceIndexDirty(app.mesh.instanceMatrix, k);
        }
      }
    }
  }
}

