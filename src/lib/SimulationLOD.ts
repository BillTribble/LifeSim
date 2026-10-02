import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import {
  createTrimmedLeafBoxGeometry,
  createSimplifiedLeafBladeGeometry,
  createWeldedStemGeometry,
  createWeldedConeGeometry,
  weldNonIndexedGeometry,
  DESKTOP_LOD_TRI_BUDGET,
  MOBILE_LOD_TRI_BUDGET,
  isMobileDevice,
  enforceVertexBudget,
} from "./SimulationVertexTrimmer";
import { updateTrianglePruner } from "./SimulationTrianglePruner";

/**
 * View-only Level of Detail (LOD) for LifeSim.
 *
 * Only affects how creatures are DRAWN: per-instance geometry tessellation,
 * leaf shader cost, and CPU wind-animation cadence. It never touches spawning,
 * growth, branching, or lifecycle logic, so creature structure is identical at
 * every tier.
 *
 * Tier 0 = high (identical to the legacy geometry), 1 = medium, 2 = low, 3 = minimal.
 */
export type LodTier = 0 | 1 | 2 | 3;
export const LOD_TIERS: LodTier[] = [0, 1, 2, 3];
export const LOD_LABELS = ["High", "Medium", "Low", "Minimal"] as const;
export type LodMode = "auto" | LodTier;

/** Frame-time thresholds (ms, EMA) that trigger a step down to tier 1/2/3. */
export const LOD_DOWN_MS = [20.8, 29.0, 45.0];
/** EMA must stay under this for `upgradeFramesRequired` frames before stepping up. */
export const LOD_UP_MS = 17.2;
export const LOD_BASE_UPGRADE_FRAMES = 90;
export const LOD_MAX_UPGRADE_FRAMES = 720;
/** Frames to wait after a downgrade before another downgrade (lets the swap take effect). */
export const LOD_DOWN_COOLDOWN = 6;
/** Net count of raw slow frames required before a downgrade (a single hitch never downgrades). */
export const LOD_SLOW_FRAMES = 3;
/** Tier-0-equivalent triangle budgets that force a minimum tier regardless of FPS. */
export const LOD_TRI_BUDGET = DESKTOP_LOD_TRI_BUDGET;

export const SHARED_INSTANCE_ATTRIBUTES = [
  "instancePackA",
  "instancePackB",
  "instanceAmbientReflect",
  "instanceLightDir",
  "instanceRootAnchor",
  "instanceBranchAnchor",
] as const;

export interface LodState {
  mode: LodMode;
  tier: LodTier;
  smoothTier: number;
  fpsTier: LodTier;
  emaFrameMs: number;
  fps: number;
  fastStreak: number;
  slowStreak: number;
  framesSinceChange: number;
  framesSinceUpgrade: number;
  upgradeFramesRequired: number;
  activeTriangles: number;
  activeTrianglesTier0: number;
  /** Per-mesh geometry variants, index = tier. */
  variants: Map<THREE.InstancedMesh, THREE.BufferGeometry[]>;
  /** Separate hybrid mesh variants, keeps lod.variants at exactly 16 meshes. */
  hybridVariants: Map<THREE.InstancedMesh, THREE.BufferGeometry[]>;
}

/** Optional `?lod=auto|0|1|2|3` URL override (handy for comparing tiers). */
function initialModeFromUrl(): LodMode {
  if (typeof location === "undefined") return "auto";
  const v = new URLSearchParams(location.search).get("lod");
  return v === "0" || v === "1" || v === "2" || v === "3" ? (Number(v) as LodTier) : "auto";
}

export function createLodState(): LodState {
  const isMobile = isMobileDevice();
  const initMode = initialModeFromUrl();
  const initTier: LodTier = isMobile && initMode === "auto" ? 2 : 0;
  return {
    mode: initMode,
    tier: initTier,
    smoothTier: initTier,
    fpsTier: initTier,
    emaFrameMs: isMobile ? 33.3 : 16.7,
    fps: isMobile ? 30 : 60,
    fastStreak: 0,
    slowStreak: 0,
    framesSinceChange: 0,
    framesSinceUpgrade: Infinity,
    upgradeFramesRequired: LOD_BASE_UPGRADE_FRAMES,
    activeTriangles: 0,
    activeTrianglesTier0: 0,
    variants: new Map(),
    hybridVariants: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Geometry builders (one variant per tier)
// ---------------------------------------------------------------------------

function leafGeometry(tier: LodTier): THREE.BufferGeometry {
  if (tier === 3) return createSimplifiedLeafBladeGeometry(4, 6);
  if (tier === 2) return createSimplifiedLeafBladeGeometry(4, 8);
  if (tier === 1) return createTrimmedLeafBoxGeometry(6, 10, 0.045);
  return createTrimmedLeafBoxGeometry(16, 24, 0.05);
}

function fernGeometry(tier: LodTier): THREE.BufferGeometry {
  const seg = ([[6, 12], [4, 8], [3, 6], [2, 4]] as const)[tier];
  const geo = new THREE.PlaneGeometry(1.0, 2.2, seg[0], seg[1]);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, (y + 1.1) / 2.2));
    const widthFactor = Math.sin(Math.pow(t, 0.7) * Math.PI) * (1.0 - t * 0.2);
    pos.setX(i, x * Math.max(0.08, widthFactor));
    const archZ = Math.sin(t * Math.PI * 0.5) * 0.45;
    const ripple = tier <= 1 ? Math.sin(y * 22.0) * 0.04 * (1.0 - t * 0.5) : 0;
    pos.setZ(i, archZ + ripple);
  }
  geo.computeVertexNormals();
  geo.translate(0, 1.1, 0);
  return geo;
}

/** Stem segment. Tiers 0-1 keep end caps (visible on segmented creatures); 2-3 drop them. */
export function stemGeometry(tier: LodTier): THREE.BufferGeometry {
  const [radial, heightSegs, withCaps] = ([[10, 2, true], [8, 1, true], [6, 1, false], [6, 1, false]] as const)[tier];
  return createWeldedStemGeometry(radial, heightSegs, withCaps);
}

type Builder = (tier: LodTier) => THREE.BufferGeometry;

const pick = <T,>(tier: LodTier, table: readonly T[]): T => table[tier];

export const APPENDAGE_BUILDERS: Record<string, Builder> = {
  leaves: leafGeometry,
  ferns: fernGeometry,
  flowers: (t) => createWeldedConeGeometry(0.5, 1, pick(t, [8, 6, 4, 3]), 0.5),
  lillyPads: (t) => {
    const [w, h] = pick(t, [[6, 6], [5, 4], [4, 3], [3, 2]] as const);
    return new THREE.SphereGeometry(0.5, w, h);
  },
  petals: (t) =>
    t <= 1
      ? weldNonIndexedGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0))
      : weldNonIndexedGeometry(new THREE.OctahedronGeometry(0.5, 0).translate(0, 0.5, 0)),
  needles: (t) => createWeldedConeGeometry(0.1, 1, pick(t, [4, 4, 3, 3]), 0.5),
  thorns: (t) => createWeldedConeGeometry(0.3, 0.6, pick(t, [4, 4, 3, 3]), 0.3),
  hair: (t) => createWeldedStemGeometry(pick(t, [4, 3, 3, 3]), 1, false).scale(0.04, 0.04, 1),
  curlyHair: (t) => {
    const [tub, rad] = pick(t, [[32, 5], [20, 4], [12, 3], [4, 2]] as const);
    return new THREE.TorusKnotGeometry(0.4, 0.08, tub, rad);
  },
  crystals: () => weldNonIndexedGeometry(new THREE.OctahedronGeometry(0.6)),
  spores: (t) =>
    t === 0
      ? weldNonIndexedGeometry(new THREE.DodecahedronGeometry(0.5))
      : t === 1
        ? weldNonIndexedGeometry(new THREE.IcosahedronGeometry(0.5, 0))
        : t === 2
          ? weldNonIndexedGeometry(new THREE.OctahedronGeometry(0.5, 0))
          : weldNonIndexedGeometry(new THREE.TetrahedronGeometry(0.55, 0)),
  scales: () => new THREE.PlaneGeometry(0.8, 0.8),
  spirals: (t) => {
    const [rad, tub] = pick(t, [[6, 12], [4, 8], [3, 6], [3, 3]] as const);
    return new THREE.TorusGeometry(0.5, 0.15, rad, tub);
  },
  sparkles: () => weldNonIndexedGeometry(new THREE.OctahedronGeometry(0.35, 0).scale(0.9, 1.4, 0.9)),
  buds: (t) => {
    const [w, h] = pick(t, [[6, 6], [5, 4], [4, 3], [3, 2]] as const);
    return new THREE.SphereGeometry(0.4, w, h).scale(0.8, 1.25, 0.8).translate(0, 0.4, 0);
  },
};

/** Builds all tier variants. Builders that ignore the tier reuse one geometry object. */
export function buildVariants(builder: Builder): THREE.BufferGeometry[] {
  const first = builder(0);
  const out: THREE.BufferGeometry[] = [first];
  const firstTris = triangleCount(first);
  for (const t of [1, 2, 3] as LodTier[]) {
    const g = builder(t);
    if (triangleCount(g) === firstTris && g.attributes.position.count === first.attributes.position.count) {
      g.dispose();
      out.push(out[out.length - 1]);
    } else {
      out.push(g);
    }
  }
  return out;
}

export function triangleCount(geo: THREE.BufferGeometry): number {
  return geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
}

// ---------------------------------------------------------------------------
// Registration & swapping
// ---------------------------------------------------------------------------

/**
 * Registers tier variants for a mesh AFTER its instanced attributes exist on
 * variants[0] (i.e. mesh.geometry). The same InstancedBufferAttribute objects are
 * attached to every variant, so a swap never loses per-instance state and never
 * allocates GPU buffers.
 */
export function registerLodMesh(engine: SimulationEngine, mesh: THREE.InstancedMesh, variants: THREE.BufferGeometry[]) {
  const base = mesh.geometry;
  const unique = new Set(variants);
  for (const g of unique) {
    if (g === base) continue;
    for (const name of SHARED_INSTANCE_ATTRIBUTES) {
      const attr = base.getAttribute(name);
      if (attr) g.setAttribute(name, attr);
    }
  }
  const list = variants.slice();
  list[0] = base;
  engine.lod.variants.set(mesh, list);
  const current = list[engine.lod.tier];
  if (current !== mesh.geometry) mesh.geometry = current;
}

export function syncLodUniforms(engine: SimulationEngine, smoothTier: number) {
  const stemMat = engine.cylinderMesh?.material as THREE.Material | undefined;
  if (stemMat?.userData?.uLodLevel) stemMat.userData.uLodLevel.value = smoothTier;
  const appMat = engine.appendageMaterial as THREE.Material | undefined;
  if (appMat?.userData?.uLodLevel) appMat.userData.uLodLevel.value = smoothTier;
  const leafMat = engine.appendages.get("leaves")?.mesh.material as THREE.Material | undefined;
  if (leafMat?.userData?.uLodLevel) leafMat.userData.uLodLevel.value = smoothTier;
  const fernMat = engine.appendages.get("ferns")?.mesh.material as THREE.Material | undefined;
  if (fernMat?.userData?.uLodLevel) fernMat.userData.uLodLevel.value = smoothTier;
}

export function applyLodTier(engine: SimulationEngine, tier: LodTier) {
  const lod = engine.lod;
  if (lod.smoothTier === undefined) lod.smoothTier = tier;
  if (lod.tier !== tier) {
    if (tier < lod.tier) lod.framesSinceUpgrade = 0;
    lod.tier = tier;
    lod.framesSinceChange = 0;
  }
  for (const [mesh, variants] of lod.variants) {
    const g = variants[tier];
    if (mesh.geometry !== g) mesh.geometry = g;
  }
  if (lod.hybridVariants) {
    for (const [mesh, variants] of lod.hybridVariants) {
      const g = variants[tier];
      if (mesh.geometry !== g) mesh.geometry = g;
    }
  }
  syncLodUniforms(engine, lod.smoothTier);
  if (engine.isMobile && engine.renderer?.setPixelRatio && typeof window !== "undefined") {
    engine.renderer.setPixelRatio(tier >= 3 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25));
  }
  enforceVertexBudget(engine, tier);
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

/**
 * Triangles submitted to the GPU this frame: mesh.count * triangles per instance.
 * Dead slots are included on purpose -- the GPU still processes them.
 */
export function getSceneGeometryStats(engine: SimulationEngine, tier: LodTier = engine.lod.tier) {
  let triangles = 0;
  let vertices = 0;
  const seen = new Set<THREE.InstancedMesh>();
  for (const [mesh, variants] of engine.lod.variants) {
    seen.add(mesh);
    if (!mesh.visible) continue;
    const g = variants[tier];
    triangles += mesh.count * triangleCount(g);
    vertices += mesh.count * g.attributes.position.count;
  }
  for (const mesh of engine.hybridMeshes) {
    if (seen.has(mesh) || !mesh.visible) continue;
    triangles += mesh.count * triangleCount(mesh.geometry);
    vertices += mesh.count * mesh.geometry.attributes.position.count;
  }
  return { triangles, vertices };
}

// ---------------------------------------------------------------------------
// Adaptive controller
// ---------------------------------------------------------------------------

/** Mode override shared with UI (single engine per page). */
let requestedMode: LodMode | null = null;
export function requestLodMode(mode: LodMode) {
  requestedMode = mode;
}

function complexityTier(tris0: number, isMobile = false): LodTier {
  const budget = isMobile ? MOBILE_LOD_TRI_BUDGET : DESKTOP_LOD_TRI_BUDGET;
  if (tris0 > budget[2]) return 3;
  if (tris0 > budget[1]) return 2;
  if (tris0 > budget[0]) return 1;
  return isMobile ? 1 : 0;
}

/**
 * Call once per rendered frame with the real frame interval.
 * - Steps DOWN one tier (at most every LOD_DOWN_COOLDOWN frames) while the EMA frame
 *   time exceeds the threshold for a lower tier AND at least LOD_SLOW_FRAMES recent
 *   raw frames were slow, so a single hitch never downgrades.
 * - Steps UP one tier only after `upgradeFramesRequired` consecutive fast frames.
 *   If a downgrade follows an upgrade within 300 frames, the requirement doubles
 *   (up to LOD_MAX_UPGRADE_FRAMES), which damps slow oscillation.
 * Returns the tier in effect after this frame.
 */
export function updateAdaptiveLOD(engine: SimulationEngine, frameDtMs: number): LodTier {
  const lod = engine.lod;
  if (requestedMode !== null) {
    lod.mode = requestedMode;
    requestedMode = null;
    lod.fastStreak = 0;
  }
  lod.framesSinceChange++;
  lod.framesSinceUpgrade++;

  // Ignore tab-switch / debugger pauses; clamp hitches so one spike can't dominate the EMA.
  const validSample = frameDtMs > 0 && frameDtMs < 1000;
  const realDtMs = validSample ? Math.min(frameDtMs, 100) : 16.7;
  (engine as any)._lastRealFrameDtMs = realDtMs;
  if (validSample) {
    lod.emaFrameMs = lod.emaFrameMs * 0.88 + realDtMs * 0.12;
    lod.fps = 1000 / lod.emaFrameMs;
  }
  updateTrianglePruner(engine, frameDtMs);

  // Smooth linear fade over 3.0 real wall-clock seconds (3000ms) regardless of viewer speed (timeScale)
  const stepPerFrame = realDtMs / 3000.0;
  const advanceSmoothTier = () => {
    if (lod.smoothTier === undefined) lod.smoothTier = lod.tier;
    const diff = lod.tier - lod.smoothTier;
    if (Math.abs(diff) <= stepPerFrame) {
      lod.smoothTier = lod.tier;
    } else {
      lod.smoothTier += Math.sign(diff) * stepPerFrame;
    }
    syncLodUniforms(engine, lod.smoothTier);
  };

  lod.activeTrianglesTier0 = getSceneGeometryStats(engine, 0).triangles;

  if (lod.mode !== "auto") {
    if (lod.tier !== lod.mode) applyLodTier(engine, lod.mode);
    advanceSmoothTier();
    lod.activeTriangles = getSceneGeometryStats(engine).triangles;
    return lod.tier;
  }

  const ema = lod.emaFrameMs;
  const fpsTarget: LodTier = ema > LOD_DOWN_MS[2] ? 3 : ema > LOD_DOWN_MS[1] ? 2 : ema > LOD_DOWN_MS[0] ? 1 : 0;

  // Raw-frame vote: slow frames push toward a downgrade, fast frames pull back twice as hard.
  if (validSample) {
    const rawSlow = frameDtMs > LOD_DOWN_MS[Math.min(lod.fpsTier, 2)];
    lod.slowStreak = rawSlow ? lod.slowStreak + 1 : Math.max(0, lod.slowStreak - 2);
  }

  if (fpsTarget > lod.fpsTier) {
    lod.fastStreak = 0;
    if (lod.framesSinceChange >= LOD_DOWN_COOLDOWN && lod.slowStreak >= LOD_SLOW_FRAMES) {
      lod.slowStreak = 0;
      if (lod.framesSinceUpgrade < 300) {
        lod.upgradeFramesRequired = Math.min(LOD_MAX_UPGRADE_FRAMES, lod.upgradeFramesRequired * 2);
      }
      lod.fpsTier = (lod.fpsTier + 1) as LodTier;
      lod.framesSinceChange = 0;
    }
  } else if (ema < LOD_UP_MS) {
    lod.fastStreak++;
    if (lod.fastStreak >= lod.upgradeFramesRequired && lod.fpsTier > 0) {
      lod.fpsTier = (lod.fpsTier - 1) as LodTier;
      lod.fastStreak = 0;
      lod.framesSinceChange = 0;
      lod.framesSinceUpgrade = 0;
    }
  } else {
    lod.fastStreak = 0;
  }
  if (lod.framesSinceUpgrade > 1200) lod.upgradeFramesRequired = LOD_BASE_UPGRADE_FRAMES;

  const rawTarget = (engine as any)._isSoftwareRaster
    ? (3 as LodTier)
    : (Math.max(lod.fpsTier, complexityTier(lod.activeTrianglesTier0, engine.isMobile)) as LodTier);
  const target = (engine.isMobile ? Math.max(1, rawTarget) : rawTarget) as LodTier;
  if (target !== lod.tier) applyLodTier(engine, target);
  advanceSmoothTier();
  lod.activeTriangles = getSceneGeometryStats(engine).triangles;
  return lod.tier;
}

/** Wind-animation cadence per tier: update every Nth leaf per frame. */
export const WIND_STRIDE = [1, 2, 4, 8] as const;
